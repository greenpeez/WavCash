// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../RoyaltySplitter.sol";

/**
 * @dev Malicious contract that attempts reentrancy on RoyaltySplitter.
 *      When it receives AVAX, it tries to call distributeAll() or release() again.
 */
contract ReentrancyAttacker {
    RoyaltySplitter public target;
    uint256 public attackCount;
    bool public attacking;

    constructor(address payable target_) {
        target = RoyaltySplitter(target_);
    }

    function startAttackDistribute() external {
        attacking = true;
        attackCount = 0;
        target.distributeAll();
    }

    function startAttackRelease() external {
        attacking = true;
        attackCount = 0;
        target.release(payable(address(this)));
    }

    receive() external payable {
        if (attacking && attackCount < 3) {
            attackCount++;
            // Attempt reentrancy
            try target.distributeAll() {} catch {}
            try target.release(payable(address(this))) {} catch {}
        }
    }
}

/**
 * @dev Contract that always reverts on receive — for testing distributeAll() try/catch.
 */
contract RevertingReceiver {
    receive() external payable {
        revert("I reject your payment");
    }
}

/**
 * @dev Contract that can selfdestruct and force-send ETH.
 */
contract ForceSender {
    constructor() payable {}

    function forceSend(address target) external {
        selfdestruct(payable(target));
    }
}
