// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IERC20.sol";

/// @title TrustSubVault — the single source of truth for subscriptions.
/// @notice The ONLY contract that can move user funds. Everything routes through it.
contract TrustSubVault {
    // ---------- Plan registry ----------
    struct Plan {
        address merchant;
        address token;
        uint256 price; // USD amount, 18 decimals (e.g. 20e18 = $20)
        uint256 interval; // seconds between billing cycles
        bool active;
    }

    uint256 public planCount;
    mapping(uint256 => Plan) public plans;

    event PlanCreated(uint256 indexed planId, address indexed merchant, address token, uint256 price, uint256 interval);

    // ---------- Subscription state ----------
    struct Subscription {
        uint256 planId;
        address subscriber;
        uint256 nextPaymentTimestamp;
        bool active;
        uint256 createdAt;
    }

    mapping(address => Subscription) public subscriptions;

    event SubscriptionStarted(address indexed subscriber, uint256 indexed planId, uint256 nextPaymentTimestamp);
    event SubscriptionCancelled(address indexed subscriber);
    event PaymentCollected(address indexed subscriber, address indexed merchant, address token, uint256 amount);
    event PaymentFailed(address indexed subscriber, uint256 planId, string reason);

    IERC20 public token;
    ITrustSubOracle public oracle;

    constructor(address _token, address _oracle) {
        token = IERC20(_token);
        oracle = ITrustSubOracle(_oracle);
    }

    // ---------- Plan management (merchant) ----------
    function createPlan(address _token, uint256 _price, uint256 _interval) external returns (uint256 planId) {
        require(!oracle.isFrozen(_token), "token price frozen");
        planId = ++planCount;
        plans[planId] = Plan({
            merchant: msg.sender,
            token: _token,
            price: _price,
            interval: _interval,
            active: true
        });
        emit PlanCreated(planId, msg.sender, _token, _price, _interval);
    }

    function setPlanActive(uint256 planId, bool _active) external {
        Plan memory p = plans[planId];
        require(p.merchant == msg.sender, "not merchant");
        plans[planId].active = _active;
    }

    // ---------- Subscription management (subscriber) ----------
    function startSubscription(address subscriber, uint256 planId) external {
        require(msg.sender == subscriber, "not subscriber");
        Plan memory p = plans[planId];
        require(p.active, "plan inactive");
        require(!subscriptions[subscriber].active, "already active");
        require(!oracle.isFrozen(p.token), "token price frozen");

        subscriptions[subscriber] = Subscription({
            planId: planId,
            subscriber: subscriber,
            nextPaymentTimestamp: block.timestamp + p.interval,
            active: true,
            createdAt: block.timestamp
        });

        emit SubscriptionStarted(subscriber, planId, block.timestamp + p.interval);
    }

    function cancel(address subscriber) external {
        require(subscriptions[subscriber].subscriber == msg.sender, "not subscriber");
        require(subscriptions[subscriber].active, "not active");
        subscriptions[subscriber].active = false;
        emit SubscriptionCancelled(subscriber);
    }

    // ---------- Access gating ----------
    /// @notice Returns true while the subscription is within its current billing period.
    function isSubscribed(address subscriber) external view returns (bool) {
        Subscription memory s = subscriptions[subscriber];
        return s.active && block.timestamp < s.nextPaymentTimestamp;
    }

    function nextPayment(address subscriber) external view returns (uint256) {
        return subscriptions[subscriber].nextPaymentTimestamp;
    }

    // ---------- THE PULL PAYMENT — the only way money moves ----------
    /// @notice Collects the due payment from `subscriber` to the plan's merchant.
    ///         Callable by anyone (relayer/automation); funds always go to the merchant.
    function collectPayment(address subscriber) external {
        Subscription memory s = subscriptions[subscriber];
        require(s.active, "not active");
        require(block.timestamp >= s.nextPaymentTimestamp, "not due");

        Plan memory p = plans[s.planId];
        require(p.active, "plan inactive");

        // Volatility freeze check: ensure token price is not frozen due to crash or spike
        require(!oracle.isFrozen(p.token), "token price frozen");

        // Convert the plan's USD price into the correct token amount.
        uint256 amount = oracle.convert(p.token, p.price);

        // The Vault checks the standing allowance before it moves a single satoshi.
        require(token.allowance(subscriber, address(this)) >= amount, "allowance");
        require(token.balanceOf(subscriber) >= amount, "balance");

        // Pull the funds. Only this contract can do it.
        bool ok = token.transferFrom(subscriber, p.merchant, amount);
        if (!ok) {
            emit PaymentFailed(subscriber, s.planId, "transferFrom failed");
            return;
        }

        // Advance to the next billing cycle, aligned to now.
        s.nextPaymentTimestamp = block.timestamp + p.interval;
        subscriptions[subscriber] = s;

        emit PaymentCollected(subscriber, p.merchant, p.token, amount);
    }
}