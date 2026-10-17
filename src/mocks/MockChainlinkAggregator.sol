// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {IChainlinkAggregator} from "../IERC20.sol";

/// @notice Mock Chainlink aggregator used for local Anvil / test deployments when no feed is provided.
contract MockChainlinkAggregator is IChainlinkAggregator {
    int256 private _price;
    uint8 private _decimals;

    constructor(int256 initialPrice, uint8 initialDecimals) {
        _price = initialPrice;
        _decimals = initialDecimals;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (1, _price, block.timestamp, block.timestamp, 1);
    }

    function setPrice(int256 newPrice) external {
        _price = newPrice;
    }
}
