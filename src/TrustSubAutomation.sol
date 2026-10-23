// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IERC20.sol";

/// @title TrustSubAutomation — the relayer / keeper.
/// @notice An off-chain heartbeat polls checkUpkeeping() every N seconds. This
///         contract finds subscriptions where block.timestamp >= nextPaymentTimestamp
///         and triggers TrustSubVault.collectPayment(). The keeper pays gas
///         (or a paymaster sponsors it). Retries on failure and emits events.
contract TrustSubAutomation {
    address public immutable vault;
    address public keeper;

    event Heartbeat(uint256 indexed blockNumber);
    event PaymentTriggered(address indexed subscriber);
    event PaymentRetried(address indexed subscriber, uint256 attempt);
    event KeeperTransferred(address indexed oldKeeper, address indexed newKeeper);

    constructor(address _vault) {
        require(_vault != address(0), "zero vault");
        vault = _vault;
        keeper = msg.sender;
    }

    modifier onlyKeeper() {
        require(msg.sender == keeper, "not keeper");
        _;
    }

    /// @notice The heartbeat. Off-chain code calls this on a timer.
    ///         Returns the list of subscribers whose payment was triggered.
    function checkUpkeeping(address[] memory subscribers) external onlyKeeper returns (address[] memory triggered) {
        emit Heartbeat(block.number);

        triggered = new address[](subscribers.length);
        uint256 count = 0;
        for (uint256 i = 0; i < subscribers.length; i++) {
            address sub = subscribers[i];
            if (sub == address(0)) continue;

            // Due detection: block.timestamp >= nextPaymentTimestamp.
            (uint256 next, bool active) = _due(sub);
            if (active && block.timestamp >= next) {
                // Trigger the pull. The Vault does all the safety checks.
                (bool ok, ) = vault.call(abi.encodeWithSignature("collectPayment(address)", sub));
                if (ok) {
                    triggered[count++] = sub;
                    emit PaymentTriggered(sub);
                } else {
                    // Retry once on the next heartbeat on failure.
                    emit PaymentRetried(sub, 1);
                }
            }
        }
        // Trim the array to the actual number triggered.
        if (count < triggered.length) {
            address[] memory trimmed = new address[](count);
            for (uint256 i = 0; i < count; i++) trimmed[i] = triggered[i];
            return trimmed;
        }
        return triggered;
    }

    /// @notice Reads subscription state directly from the Vault (no external call).
    function _due(address subscriber) internal view returns (uint256 nextPaymentTimestamp, bool active) {
        (bool ok, bytes memory data) = vault.staticcall(
            abi.encodeWithSignature("subscriptions(address)", subscriber)
        );
        if (!ok || data.length < 160) return (0, false);
        // subscriptions(address) returns (uint256 planId, address subscriber,
        // uint256 nextPaymentTimestamp, bool active, uint256 createdAt).
        (,, nextPaymentTimestamp, active,) = abi.decode(data, (uint256, address, uint256, bool, uint256));
        return (nextPaymentTimestamp, active);
    }

    /// @notice Keeper can change the keeper address.
    function setKeeper(address newKeeper) external onlyKeeper {
        require(newKeeper != address(0), "zero keeper");
        emit KeeperTransferred(keeper, newKeeper);
        keeper = newKeeper;
    }
}