// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RoyaltySplitter
 * @notice Splits incoming payments (native AVAX and ERC-20 tokens) among a fixed
 *         set of payees according to their share in basis points, with a
 *         configurable processing fee sent to a designated fee recipient.
 *
 * @dev Inspired by OpenZeppelin PaymentSplitter v4 (removed in v5).
 *      Custom implementation for WavCash royalty distribution.
 *
 *      Fee model:
 *      - A processing fee (e.g. 2.5% = 250 bps) is deducted from each payee's
 *        gross entitlement on every distribution.
 *      - Fees are accumulated per distribution round and sent to feeRecipient.
 *      - If fee transfer fails, fees are tracked in _pendingFees and can be
 *        collected later via collectFees().
 *
 *      Security model:
 *      - Immutable: payees, shares, feeRecipient, and feeBasisPoints are set
 *        once in the constructor.
 *      - Pull + Push hybrid: `distributeAll()` pushes to all payees with
 *        per-payee try/catch. Individual `release()` as fallback.
 *      - CEI pattern + ReentrancyGuard on all external-call functions.
 *      - SafeERC20 for all token transfers.
 *      - No owner, no admin, no backdoors, no upgradability.
 *
 *      Unsupported token types:
 *      - Fee-on-transfer tokens (accounting assumes exact delivery).
 *      - Rebasing tokens (balance changes break the formula).
 *      Standard ERC-20 tokens (USDC, USDT, WAVAX) are fully supported.
 */
contract RoyaltySplitter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────
    // State
    // ──────────────────────────────────────────────

    uint256 private _totalShares;
    address[] private _payees;
    mapping(address => uint256) private _shares;

    // Fee configuration (immutable after deploy)
    address private immutable _feeRecipient;
    uint256 private immutable _feeBasisPoints; // e.g. 250 = 2.5%

    // Native AVAX pull-payment accounting
    uint256 private _totalReleased;
    mapping(address => uint256) private _released;

    // Native AVAX fee tracking
    uint256 private _pendingFees;
    uint256 private _totalFeesCollected;

    // ERC-20 pull-payment accounting (per token)
    mapping(IERC20 => uint256) private _erc20TotalReleased;
    mapping(IERC20 => mapping(address => uint256)) private _erc20Released;

    // ERC-20 fee tracking (per token)
    mapping(IERC20 => uint256) private _pendingTokenFees;
    mapping(IERC20 => uint256) private _erc20TotalFeesCollected;

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────

    event PaymentReceived(address indexed from, uint256 amount);
    event PaymentReleased(address indexed to, uint256 amount);
    event TokenPaymentReleased(IERC20 indexed token, address indexed to, uint256 amount);
    event DistributionFailed(address indexed account, uint256 amount);
    event TokenDistributionFailed(IERC20 indexed token, address indexed account, uint256 amount);
    event FeeCollected(address indexed recipient, uint256 amount);
    event TokenFeeCollected(IERC20 indexed token, address indexed recipient, uint256 amount);

    // ──────────────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────────────

    /**
     * @param payees_        Array of payee addresses. Must be non-empty, no zeros, no duplicates.
     * @param shares_        Array of share amounts in basis points. Must match payees_ length.
     *                       Each share must be > 0. Total must equal 10000 (100%).
     * @param feeRecipient_  Address that receives the processing fee. Must not be zero.
     * @param feeBasisPoints_ Fee in basis points (e.g. 250 = 2.5%). Must be <= 1000 (10%).
     */
    constructor(
        address[] memory payees_,
        uint256[] memory shares_,
        address feeRecipient_,
        uint256 feeBasisPoints_
    ) {
        require(payees_.length > 0, "RoyaltySplitter: no payees");
        require(payees_.length == shares_.length, "RoyaltySplitter: length mismatch");
        require(feeRecipient_ != address(0), "RoyaltySplitter: zero fee recipient");
        require(feeBasisPoints_ <= 1000, "RoyaltySplitter: fee too high");

        _feeRecipient = feeRecipient_;
        _feeBasisPoints = feeBasisPoints_;

        uint256 totalShares_;
        for (uint256 i = 0; i < payees_.length; i++) {
            require(payees_[i] != address(0), "RoyaltySplitter: zero address");
            require(shares_[i] > 0, "RoyaltySplitter: zero shares");
            require(_shares[payees_[i]] == 0, "RoyaltySplitter: duplicate payee");

            _payees.push(payees_[i]);
            _shares[payees_[i]] = shares_[i];
            totalShares_ += shares_[i];
        }

        require(totalShares_ == 10000, "RoyaltySplitter: shares must total 10000");
        _totalShares = totalShares_;
    }

    // ──────────────────────────────────────────────
    // Receive
    // ──────────────────────────────────────────────

    receive() external payable {
        emit PaymentReceived(msg.sender, msg.value);
    }

    // ──────────────────────────────────────────────
    // Push distribution (for auto-push cron)
    // ──────────────────────────────────────────────

    /**
     * @notice Distributes all pending native AVAX to every payee, minus the processing fee.
     *         Fees are accumulated and sent to feeRecipient at the end.
     *         If a payee's transfer fails (e.g., contract with reverting fallback),
     *         accounting is rolled back for that payee and they can claim via release().
     */
    function distributeAll() external nonReentrant {
        uint256 len = _payees.length;

        // Pre-calculate all gross payments BEFORE any state changes.
        // This prevents mid-loop accounting drift caused by fees remaining
        // in the contract balance between payee transfers.
        uint256[] memory grossPayments = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            grossPayments[i] = _pendingPayment(_payees[i]);
        }

        uint256 totalFees = 0;

        for (uint256 i = 0; i < len; i++) {
            if (grossPayments[i] == 0) continue;

            address payable account = payable(_payees[i]);
            uint256 fee = (grossPayments[i] * _feeBasisPoints) / 10000;
            uint256 netPayment = grossPayments[i] - fee;

            // Effects before interactions (CEI) — track GROSS as released
            _released[account] += grossPayments[i];
            _totalReleased += grossPayments[i];

            // Interaction — try/catch isolates failures
            (bool success, ) = account.call{value: netPayment}("");
            if (!success) {
                // Roll back accounting so they can claim later via release()
                _released[account] -= grossPayments[i];
                _totalReleased -= grossPayments[i];
                emit DistributionFailed(account, grossPayments[i]);
            } else {
                totalFees += fee;
                emit PaymentReleased(account, netPayment);
            }
        }

        // Send accumulated fees to feeRecipient
        if (totalFees > 0) {
            _pendingFees += totalFees;
            (bool feeSuccess, ) = payable(_feeRecipient).call{value: totalFees}("");
            if (feeSuccess) {
                _pendingFees -= totalFees;
                _totalFeesCollected += totalFees;
                emit FeeCollected(_feeRecipient, totalFees);
            }
            // If fee transfer fails, totalFees stays in _pendingFees for collectFees()
        }
    }

    /**
     * @notice Distributes all pending ERC-20 tokens to every payee, minus the processing fee.
     */
    function distributeAllToken(IERC20 token) external nonReentrant {
        uint256 len = _payees.length;

        // Pre-calculate all gross payments BEFORE any state changes
        uint256[] memory grossPayments = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            grossPayments[i] = _pendingTokenPayment(token, _payees[i]);
        }

        uint256 totalFees = 0;

        for (uint256 i = 0; i < len; i++) {
            if (grossPayments[i] == 0) continue;

            address account = _payees[i];
            uint256 fee = (grossPayments[i] * _feeBasisPoints) / 10000;
            uint256 netPayment = grossPayments[i] - fee;

            // Effects before interactions (CEI) — track GROSS as released
            _erc20Released[token][account] += grossPayments[i];
            _erc20TotalReleased[token] += grossPayments[i];

            // SafeERC20 reverts on failure — wrap in try/catch via low-level call
            try this._executeTokenTransfer(token, account, netPayment) {
                totalFees += fee;
                emit TokenPaymentReleased(token, account, netPayment);
            } catch {
                // Roll back accounting
                _erc20Released[token][account] -= grossPayments[i];
                _erc20TotalReleased[token] -= grossPayments[i];
                emit TokenDistributionFailed(token, account, grossPayments[i]);
            }
        }

        // Send accumulated token fees to feeRecipient
        if (totalFees > 0) {
            _pendingTokenFees[token] += totalFees;
            try this._executeTokenTransfer(token, _feeRecipient, totalFees) {
                _pendingTokenFees[token] -= totalFees;
                _erc20TotalFeesCollected[token] += totalFees;
                emit TokenFeeCollected(token, _feeRecipient, totalFees);
            } catch {
                // If fee transfer fails, totalFees stays in _pendingTokenFees
            }
        }
    }

    /**
     * @dev External helper for try/catch on SafeERC20 transfer.
     *      Only callable by this contract itself.
     */
    function _executeTokenTransfer(IERC20 token, address to, uint256 amount) external {
        require(msg.sender == address(this), "RoyaltySplitter: internal only");
        token.safeTransfer(to, amount);
    }

    // ──────────────────────────────────────────────
    // Pull distribution (individual fallback)
    // ──────────────────────────────────────────────

    /**
     * @notice Releases the pending native AVAX owed to `account`, minus the processing fee.
     */
    function release(address payable account) external nonReentrant {
        require(_shares[account] > 0, "RoyaltySplitter: no shares");
        uint256 grossPayment = _pendingPayment(account);
        require(grossPayment > 0, "RoyaltySplitter: nothing due");

        uint256 fee = (grossPayment * _feeBasisPoints) / 10000;
        uint256 netPayment = grossPayment - fee;

        // Effects before interactions (CEI) — track GROSS as released
        _released[account] += grossPayment;
        _totalReleased += grossPayment;

        // Interaction: send net to payee
        (bool success, ) = account.call{value: netPayment}("");
        require(success, "RoyaltySplitter: transfer failed");
        emit PaymentReleased(account, netPayment);

        // Send fee to feeRecipient
        if (fee > 0) {
            _pendingFees += fee;
            (bool feeSuccess, ) = payable(_feeRecipient).call{value: fee}("");
            if (feeSuccess) {
                _pendingFees -= fee;
                _totalFeesCollected += fee;
                emit FeeCollected(_feeRecipient, fee);
            }
            // If fee transfer fails, stays in _pendingFees for collectFees()
        }
    }

    /**
     * @notice Releases the pending ERC-20 tokens owed to `account`, minus the processing fee.
     */
    function releaseToken(IERC20 token, address account) external nonReentrant {
        require(_shares[account] > 0, "RoyaltySplitter: no shares");
        uint256 grossPayment = _pendingTokenPayment(token, account);
        require(grossPayment > 0, "RoyaltySplitter: nothing due");

        uint256 fee = (grossPayment * _feeBasisPoints) / 10000;
        uint256 netPayment = grossPayment - fee;

        // Effects before interactions (CEI) — track GROSS as released
        _erc20Released[token][account] += grossPayment;
        _erc20TotalReleased[token] += grossPayment;

        // Interaction: send net to payee
        token.safeTransfer(account, netPayment);
        emit TokenPaymentReleased(token, account, netPayment);

        // Send fee to feeRecipient
        if (fee > 0) {
            _pendingTokenFees[token] += fee;
            try this._executeTokenTransfer(token, _feeRecipient, fee) {
                _pendingTokenFees[token] -= fee;
                _erc20TotalFeesCollected[token] += fee;
                emit TokenFeeCollected(token, _feeRecipient, fee);
            } catch {
                // If fee transfer fails, stays in _pendingTokenFees
            }
        }
    }

    // ──────────────────────────────────────────────
    // Fee collection (retry for stuck fees)
    // ──────────────────────────────────────────────

    /**
     * @notice Retries sending any stuck native AVAX fees to the feeRecipient.
     *         Anyone can call this.
     */
    function collectFees() external nonReentrant {
        uint256 amount = _pendingFees;
        require(amount > 0, "RoyaltySplitter: no pending fees");

        _pendingFees = 0;
        (bool success, ) = payable(_feeRecipient).call{value: amount}("");
        if (!success) {
            _pendingFees = amount;
            revert("RoyaltySplitter: fee transfer failed");
        }

        _totalFeesCollected += amount;
        emit FeeCollected(_feeRecipient, amount);
    }

    /**
     * @notice Retries sending any stuck ERC-20 token fees to the feeRecipient.
     */
    function collectTokenFees(IERC20 token) external nonReentrant {
        uint256 amount = _pendingTokenFees[token];
        require(amount > 0, "RoyaltySplitter: no pending token fees");

        _pendingTokenFees[token] = 0;
        token.safeTransfer(_feeRecipient, amount);

        _erc20TotalFeesCollected[token] += amount;
        emit TokenFeeCollected(token, _feeRecipient, amount);
    }

    // ──────────────────────────────────────────────
    // View functions
    // ──────────────────────────────────────────────

    function totalShares() external view returns (uint256) {
        return _totalShares;
    }

    function shares(address account) external view returns (uint256) {
        return _shares[account];
    }

    function totalReleased() external view returns (uint256) {
        return _totalReleased;
    }

    function released(address account) external view returns (uint256) {
        return _released[account];
    }

    function totalReleasedToken(IERC20 token) external view returns (uint256) {
        return _erc20TotalReleased[token];
    }

    function releasedToken(IERC20 token, address account) external view returns (uint256) {
        return _erc20Released[token][account];
    }

    function getPayees() external view returns (address[] memory) {
        return _payees;
    }

    function feeRecipient() external view returns (address) {
        return _feeRecipient;
    }

    function feeBasisPoints() external view returns (uint256) {
        return _feeBasisPoints;
    }

    function pendingFees() external view returns (uint256) {
        return _pendingFees;
    }

    function totalFeesCollected() external view returns (uint256) {
        return _totalFeesCollected;
    }

    function pendingTokenFees(IERC20 token) external view returns (uint256) {
        return _pendingTokenFees[token];
    }

    function totalTokenFeesCollected(IERC20 token) external view returns (uint256) {
        return _erc20TotalFeesCollected[token];
    }

    /**
     * @notice Returns the amount of native AVAX pending for `account` (gross, before fee).
     */
    function releasable(address account) external view returns (uint256) {
        return _pendingPayment(account);
    }

    /**
     * @notice Returns the amount of ERC-20 tokens pending for `account` (gross, before fee).
     */
    function releasableToken(IERC20 token, address account) external view returns (uint256) {
        return _pendingTokenPayment(token, account);
    }

    // ──────────────────────────────────────────────
    // Internal
    // ──────────────────────────────────────────────

    /**
     * @dev Calculates the pending native AVAX for `account`.
     *      Formula: (totalReceived * accountShares / totalShares) - alreadyReleased
     *      Where totalReceived = currentBalance + totalReleased - pendingFees
     *      (pendingFees are excluded because they belong to feeRecipient, not payees)
     */
    function _pendingPayment(address account) private view returns (uint256) {
        uint256 totalReceived = address(this).balance + _totalReleased - _pendingFees;
        uint256 entitled = (totalReceived * _shares[account]) / _totalShares;
        return entitled - _released[account];
    }

    /**
     * @dev Calculates the pending ERC-20 tokens for `account`.
     */
    function _pendingTokenPayment(IERC20 token, address account) private view returns (uint256) {
        uint256 totalReceived = token.balanceOf(address(this)) + _erc20TotalReleased[token] - _pendingTokenFees[token];
        uint256 entitled = (totalReceived * _shares[account]) / _totalShares;
        return entitled - _erc20Released[token][account];
    }
}
