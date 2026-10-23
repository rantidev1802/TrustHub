// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IERC20.sol";

/// @title TrustSubOracle — the price feed.
/// @notice Chainlink-compatible oracle. Pulls USD/ETH or USD/USDC, converts a
///         plan's USD price into the correct token amount, and freezes billing
///         if price moves >5% in a cycle (volatility protection).
contract TrustSubOracle is ITrustSubOracle {
    // 5% volatility threshold (scaled by 1e18: 0.05e18 = 5e16).
    uint256 public constant VOLATILITY_THRESHOLD = 0.05e18;

    // Chainlink aggregator per token (e.g. ETH/USD, USDC/USD).
    mapping(address => IChainlinkAggregator) public priceFeed;

    // Last observed price per token; used to detect a >5% move in a cycle.
    mapping(address => uint256) public lastPrice;
    // Whether a token is currently frozen for billing.
    mapping(address => bool) public frozen;
    address public admin;

    event PriceUpdated(address indexed token, uint256 price);
    event PriceFrozen(address indexed token, uint256 price);
    event PriceUnfrozen(address indexed token);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);

    constructor(address[] memory _tokens, address[] memory _feeds) {
        require(_tokens.length == _feeds.length, "length mismatch");
        admin = msg.sender;
        for (uint256 i = 0; i < _tokens.length; i++) {
            require(_tokens[i] != address(0), "zero token");
            priceFeed[_tokens[i]] = IChainlinkAggregator(_feeds[i]);
            if (_feeds[i] != address(0)) {
                uint256 p = getPrice(_tokens[i]);
                lastPrice[_tokens[i]] = p;
                emit PriceUpdated(_tokens[i], p);
            }
        }
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "zero admin");
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }

    function setFeed(address token, address feed) external onlyAdmin {
        require(token != address(0), "zero token");
        require(feed != address(0), "zero feed");
        priceFeed[token] = IChainlinkAggregator(feed);
        uint256 p = getPrice(token);
        lastPrice[token] = p;
        emit PriceUpdated(token, p);
    }

    /// @notice Pull the latest Chainlink price for a token (1e18 scaled).
    function getPrice(address token) public view override returns (uint256) {
        IChainlinkAggregator feed = priceFeed[token];
        require(address(feed) != address(0), "no feed");
        (uint80 roundId, int256 rawPrice, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) = feed.latestRoundData();
        startedAt; // silence unused variable warning
        require(rawPrice > 0, "bad price");
        require(answeredInRound >= roundId, "stale price");
        require(updatedAt != 0, "round not complete");

        uint8 feedDecimals = 8;
        try feed.decimals() returns (uint8 d) {
            feedDecimals = d;
        } catch {}

        // Casting to uint256 is safe because rawPrice > 0 is verified above
        // forge-lint: disable-next-line(unsafe-typecast)
        if (feedDecimals <= 18) {
            // forge-lint: disable-next-line(unsafe-typecast)
            return uint256(rawPrice) * (10 ** (18 - feedDecimals));
        } else {
            // forge-lint: disable-next-line(unsafe-typecast)
            return uint256(rawPrice) / (10 ** (feedDecimals - 18));
        }
    }

    /// @notice Returns true if the token is flagged frozen or if the current
    ///         Chainlink price has abruptly changed >5% from lastPrice.
    function isFrozen(address token) public view override returns (bool) {
        if (address(priceFeed[token]) == address(0)) {
            return true;
        }
        if (frozen[token]) {
            return true;
        }
        uint256 prev = lastPrice[token];
        if (prev > 0) {
            uint256 currentPrice = getPrice(token);
            uint256 delta = currentPrice > prev ? currentPrice - prev : prev - currentPrice;
            uint256 pct = (delta * 1e18) / prev;
            if (pct > VOLATILITY_THRESHOLD) {
                return true;
            }
        }
        return false;
    }

    /// @notice Convert a USD amount (1e18) into the token amount needed.
    ///         Reverts if the price has abruptly crashed/spiked or is frozen.
    function convert(address token, uint256 usdAmount) external override returns (uint256 tokenAmount) {
        require(!isFrozen(token), "price frozen");
        uint256 price = _pullAndCheck(token);
        require(!frozen[token], "price frozen");

        uint8 tokenDecimals = 18;
        (bool ok, bytes memory data) = token.staticcall(abi.encodeWithSignature("decimals()"));
        if (ok && data.length >= 32) {
            tokenDecimals = abi.decode(data, (uint8));
        }

        // tokenAmount = (usdAmount * 10^tokenDecimals) / price
        tokenAmount = (usdAmount * (10 ** tokenDecimals)) / price;
    }

    /// @notice Pull the price, update state, and freeze if volatility exceeds threshold.
    function _pullAndCheck(address token) internal returns (uint256 price) {
        price = getPrice(token);

        uint256 prev = lastPrice[token];
        if (prev > 0) {
            uint256 delta = price > prev ? price - prev : prev - price;
            uint256 pct = (delta * 1e18) / prev;
            if (pct > VOLATILITY_THRESHOLD) {
                frozen[token] = true;
                emit PriceFrozen(token, price);
                return price;
            }
        }

        lastPrice[token] = price;
        emit PriceUpdated(token, price);
    }

    /// @notice Allow an admin to manually freeze a token in an emergency.
    function freeze(address token) external onlyAdmin {
        frozen[token] = true;
        emit PriceFrozen(token, getPrice(token));
    }

    /// @notice Allow an admin to manually unfreeze a token after a volatile cycle.
    ///         Resets lastPrice to the current market price upon unfreezing.
    function unfreeze(address token) external onlyAdmin {
        frozen[token] = false;
        lastPrice[token] = getPrice(token);
        emit PriceUnfrozen(token);
    }
}