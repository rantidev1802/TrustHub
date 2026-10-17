// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @title TrustSubAccess — the content gate.
/// @notice A small contract your backend calls to verify access. Reads
///         isSubscribed() from the Vault, gives a 3-day grace period after a
///         failed payment, and exposes accessOf(user) so other contracts can
///         grant NFT/minting rights based on membership.
contract TrustSubAccess {
    address public immutable vault;
    uint256 public constant GRACE_PERIOD = 3 days;

    event AccessChecked(address indexed user, bool subscribed, bool inGrace);

    constructor(address _vault) {
        vault = _vault;
    }

    /// @notice Returns true if the user has an active subscription OR is within
    ///         the grace period following a failed payment.
    function accessOf(address user) external view returns (bool) {
        if (_isSubscribed(user)) {
            return true;
        }
        return _inGrace(user);
    }

    /// @notice Your backend calls this to verify a user still has access.
    function checkAccess(address user) external returns (bool) {
        bool subscribed = _isSubscribed(user);
        bool grace = _inGrace(user);
        emit AccessChecked(user, subscribed, grace);
        return subscribed || grace;
    }

    // ---------- Internal helpers ----------
    function _isSubscribed(address user) internal view returns (bool) {
        (bool ok, bytes memory data) = vault.staticcall(
            abi.encodeWithSignature("isSubscribed(address)", user)
        );
        require(ok, "vault read failed");
        return abi.decode(data, (bool));
    }

    function _inGrace(address user) internal view returns (bool) {
        // Grace applies when the subscription is active but its next payment
        // timestamp has already passed (i.e. a payment was due and failed).
        (bool ok, bytes memory data) = vault.staticcall(
            abi.encodeWithSignature("subscriptions(address)", user)
        );
        if (!ok) return false;
        (,, uint256 next, bool active,) = abi.decode(data, (uint256, address, uint256, bool, uint256));
        return active && block.timestamp >= next && block.timestamp < next + GRACE_PERIOD;
    }
}