// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @notice Minimal ERC-20 interface used across the TrustHub stack.
interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @notice Chainlink aggregator interface (latestRoundData).
interface IChainlinkAggregator {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external view
        returns (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

/// @notice The slice of TrustSubOracle the Vault needs to convert USD prices
///         into token amounts and to ask whether a token is frozen.
interface ITrustSubOracle {
    function convert(address token, uint256 usdAmount) external returns (uint256 tokenAmount);
    function isFrozen(address token) external view returns (bool);
    function getPrice(address token) external view returns (uint256);
}