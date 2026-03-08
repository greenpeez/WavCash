// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title WavCashSplit
 * @notice Split agreement with EIP-712 signature-verified signing ceremony.
 *         Supports both native AVAX and ERC-20 token distributions (e.g. USDC).
 *
 * Lifecycle:
 *   1. Deployed with N empty slots (one per contributor), each with a share in basis points.
 *   2. Contributors sign via `registerSigner()` which verifies an EIP-712 signature
 *      from the signer's wallet, proving consent without requiring the signer to pay gas.
 *   3. When all slots are filled the contract auto-activates.
 *   4. In Active state, anyone can call `distributeAll()` or `distributeAllToken()`.
 *   5. Admin can `void()` the contract at any time before activation.
 */
contract WavCashSplit {
    using SafeERC20 for IERC20;

    // ----------------------------------------------------------------
    // Types
    // ----------------------------------------------------------------
    enum State { Signing, Active, Voided }

    struct Slot {
        uint256 sharesBps;   // percentage in basis points (e.g. 5000 = 50%)
        address signer;      // zero address until signed
        uint256 signedAt;    // block.timestamp of signature
    }

    // ----------------------------------------------------------------
    // State
    // ----------------------------------------------------------------
    State public state;
    uint256 public totalSlots;
    uint256 public filledSlots;
    Slot[] public slots;

    address public admin;            // deployer — can void & relay signatures
    address public feeRecipient;
    uint256 public feeBasisPoints;   // max 1000 (10%)

    // Native AVAX tracking
    uint256 public totalReleased;
    uint256 public totalFeesCollected;
    uint256 public pendingFees;

    // ERC-20 token tracking (per token)
    mapping(IERC20 => uint256) public pendingTokenFees;
    mapping(IERC20 => uint256) public totalTokenFeesCollected;

    // ----------------------------------------------------------------
    // EIP-712
    // ----------------------------------------------------------------
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant SIGN_TYPEHASH =
        keccak256("SignAgreement(uint256 slotIndex,address signer)");

    // ----------------------------------------------------------------
    // Events
    // ----------------------------------------------------------------
    event SlotSigned(uint256 indexed slotIndex, address indexed signer, uint256 timestamp);
    event SplitActivated(uint256 timestamp);
    event SplitVoided(uint256 timestamp);
    event PaymentReleased(address indexed account, uint256 amount);
    event PaymentReceived(address indexed from, uint256 amount);
    event DistributionFailed(address indexed account, uint256 amount);
    event FeeCollected(uint256 amount);
    event TokenPaymentReleased(IERC20 indexed token, address indexed account, uint256 amount);
    event TokenDistributionFailed(IERC20 indexed token, address indexed account, uint256 amount);
    event TokenFeeCollected(IERC20 indexed token, uint256 amount);
    /// @notice Human-readable action label visible on block explorers.
    event WavCashAction(string action);

    // ----------------------------------------------------------------
    // Constructor
    // ----------------------------------------------------------------
    constructor(
        uint256[] memory sharesBps_,
        address feeRecipient_,
        uint256 feeBasisPoints_
    ) {
        require(sharesBps_.length > 0, "No slots");
        require(feeRecipient_ != address(0), "Zero fee recipient");
        require(feeBasisPoints_ <= 1000, "Fee > 10%");

        uint256 total = 0;
        for (uint256 i = 0; i < sharesBps_.length; i++) {
            require(sharesBps_[i] > 0, "Zero share");
            slots.push(Slot({
                sharesBps: sharesBps_[i],
                signer: address(0),
                signedAt: 0
            }));
            total += sharesBps_[i];
        }
        require(total == 10000, "Must total 10000 bps");

        totalSlots = sharesBps_.length;
        admin = msg.sender;
        feeRecipient = feeRecipient_;
        feeBasisPoints = feeBasisPoints_;
        state = State.Signing;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("WavCashSplit"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );

        emit WavCashAction("CREATED");
    }

    // ----------------------------------------------------------------
    // Signing
    // ----------------------------------------------------------------

    /**
     * @notice Register a signer to a slot using an EIP-712 signature.
     * @dev Called by the admin/relayer. The signature proves the signer consented.
     * @param slotIndex  The slot to fill (0-based)
     * @param signer     The address that produced the signature
     * @param v          Recovery byte of the signature
     * @param r          First 32 bytes of the signature
     * @param s          Second 32 bytes of the signature
     */
    function registerSigner(
        uint256 slotIndex,
        address signer,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(state == State.Signing, "Not in signing phase");
        require(slotIndex < totalSlots, "Invalid slot");
        require(slots[slotIndex].signer == address(0), "Slot already taken");
        require(signer != address(0), "Zero signer");

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(abi.encode(SIGN_TYPEHASH, slotIndex, signer));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address recovered = ecrecover(digest, v, r, s);
        require(recovered == signer, "Invalid signature");

        // Prevent one address from signing multiple slots
        for (uint256 i = 0; i < totalSlots; i++) {
            require(slots[i].signer != signer, "Already signed");
        }

        slots[slotIndex].signer = signer;
        slots[slotIndex].signedAt = block.timestamp;
        filledSlots++;

        emit SlotSigned(slotIndex, signer, block.timestamp);
        emit WavCashAction("SIGNED");

        // Auto-activate when all slots filled
        if (filledSlots == totalSlots) {
            state = State.Active;
            emit SplitActivated(block.timestamp);
            emit WavCashAction("ACTIVATED");
        }
    }

    // ----------------------------------------------------------------
    // Admin
    // ----------------------------------------------------------------

    /**
     * @notice Void the contract, preventing further signing or distribution.
     * @dev Only callable by admin. Can void during Signing phase only.
     */
    function void_() external {
        require(msg.sender == admin, "Only admin");
        require(state == State.Signing, "Can only void during signing");
        state = State.Voided;
        emit SplitVoided(block.timestamp);
        emit WavCashAction("VOIDED");
    }

    // ----------------------------------------------------------------
    // Distribution — Native AVAX
    // ----------------------------------------------------------------

    /**
     * @notice Distribute the contract's entire AVAX balance to all signers.
     * @dev Deducts platform fee first, then pushes pro-rata shares.
     */
    function distributeAll() external {
        require(state == State.Active, "Not active");
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");

        // Deduct fee
        uint256 fee = (balance * feeBasisPoints) / 10000;
        uint256 distributable = balance - fee;

        // Send fee
        if (fee > 0) {
            (bool feeOk, ) = feeRecipient.call{value: fee}("");
            if (feeOk) {
                totalFeesCollected += fee;
                emit FeeCollected(fee);
            } else {
                pendingFees += fee;
                distributable += fee; // re-add to distributable if fee fails
            }
        }

        emit WavCashAction("PAYMENT");

        // Distribute to signers
        for (uint256 i = 0; i < totalSlots; i++) {
            uint256 amount = (distributable * slots[i].sharesBps) / 10000;
            if (amount > 0 && slots[i].signer != address(0)) {
                (bool ok, ) = slots[i].signer.call{value: amount}("");
                if (ok) {
                    totalReleased += amount;
                    emit PaymentReleased(slots[i].signer, amount);
                } else {
                    emit DistributionFailed(slots[i].signer, amount);
                }
            }
        }
    }

    /**
     * @notice Retry sending stuck native fees to the fee recipient.
     */
    function collectFees() external {
        require(pendingFees > 0, "No pending fees");
        uint256 amount = pendingFees;
        pendingFees = 0;
        (bool ok, ) = feeRecipient.call{value: amount}("");
        if (ok) {
            totalFeesCollected += amount;
            emit FeeCollected(amount);
        } else {
            pendingFees = amount; // re-store if still failing
        }
    }

    // ----------------------------------------------------------------
    // Distribution — ERC-20 Tokens (USDC, etc.)
    // ----------------------------------------------------------------

    /**
     * @notice Distribute an ERC-20 token's entire balance to all signers.
     * @dev Same logic as distributeAll() but for ERC-20 tokens.
     *      Uses SafeERC20 via try/catch wrapper for safe transfers.
     * @param token  The ERC-20 token to distribute (e.g. USDC)
     */
    function distributeAllToken(IERC20 token) external {
        require(state == State.Active, "Not active");
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No token balance");

        // Deduct fee
        uint256 fee = (balance * feeBasisPoints) / 10000;
        uint256 distributable = balance - fee;

        // Send fee
        if (fee > 0) {
            try this._executeTokenTransfer(token, feeRecipient, fee) {
                totalTokenFeesCollected[token] += fee;
                emit TokenFeeCollected(token, fee);
            } catch {
                pendingTokenFees[token] += fee;
                distributable += fee; // re-add if fee fails
            }
        }

        emit WavCashAction("PAYMENT");

        // Distribute to signers
        for (uint256 i = 0; i < totalSlots; i++) {
            uint256 amount = (distributable * slots[i].sharesBps) / 10000;
            if (amount > 0 && slots[i].signer != address(0)) {
                try this._executeTokenTransfer(token, slots[i].signer, amount) {
                    emit TokenPaymentReleased(token, slots[i].signer, amount);
                } catch {
                    emit TokenDistributionFailed(token, slots[i].signer, amount);
                }
            }
        }
    }

    /**
     * @notice Retry sending stuck ERC-20 token fees to the fee recipient.
     */
    function collectTokenFees(IERC20 token) external {
        uint256 amount = pendingTokenFees[token];
        require(amount > 0, "No pending token fees");
        pendingTokenFees[token] = 0;
        token.safeTransfer(feeRecipient, amount);
        totalTokenFeesCollected[token] += amount;
        emit TokenFeeCollected(token, amount);
    }

    /**
     * @dev External helper for try/catch on SafeERC20 transfer.
     *      Only callable by this contract itself.
     */
    function _executeTokenTransfer(IERC20 token, address to, uint256 amount) external {
        require(msg.sender == address(this), "Internal only");
        token.safeTransfer(to, amount);
    }

    // ----------------------------------------------------------------
    // Read functions (backward compat with existing cron/interact.ts)
    // ----------------------------------------------------------------

    /**
     * @notice Get all signer addresses (zero address for unfilled slots).
     */
    function getPayees() external view returns (address[] memory) {
        address[] memory payees = new address[](totalSlots);
        for (uint256 i = 0; i < totalSlots; i++) {
            payees[i] = slots[i].signer;
        }
        return payees;
    }

    /**
     * @notice Get share basis points for an address.
     */
    function shares(address account) external view returns (uint256) {
        for (uint256 i = 0; i < totalSlots; i++) {
            if (slots[i].signer == account) {
                return slots[i].sharesBps;
            }
        }
        return 0;
    }

    /**
     * @notice Get full slot info by index.
     */
    function getSlot(uint256 index) external view returns (
        uint256 sharesBps,
        address signer,
        uint256 signedAt
    ) {
        require(index < totalSlots, "Invalid slot");
        Slot storage s = slots[index];
        return (s.sharesBps, s.signer, s.signedAt);
    }

    /**
     * @notice Estimate how much an account can receive from the current AVAX balance.
     */
    function releasable(address account) external view returns (uint256) {
        if (state != State.Active) return 0;
        uint256 balance = address(this).balance;
        if (balance == 0) return 0;
        uint256 fee = (balance * feeBasisPoints) / 10000;
        uint256 distributable = balance - fee;
        for (uint256 i = 0; i < totalSlots; i++) {
            if (slots[i].signer == account) {
                return (distributable * slots[i].sharesBps) / 10000;
            }
        }
        return 0;
    }

    /**
     * @notice Estimate how much an account can receive from a token balance.
     */
    function releasableToken(IERC20 token, address account) external view returns (uint256) {
        if (state != State.Active) return 0;
        uint256 balance = token.balanceOf(address(this));
        if (balance == 0) return 0;
        uint256 fee = (balance * feeBasisPoints) / 10000;
        uint256 distributable = balance - fee;
        for (uint256 i = 0; i < totalSlots; i++) {
            if (slots[i].signer == account) {
                return (distributable * slots[i].sharesBps) / 10000;
            }
        }
        return 0;
    }

    // ----------------------------------------------------------------
    // Receive
    // ----------------------------------------------------------------
    receive() external payable {
        emit PaymentReceived(msg.sender, msg.value);
    }
}
