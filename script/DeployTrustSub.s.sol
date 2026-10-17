// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {TrustSubToken} from "../src/TrustSubToken.sol";
import {TrustSubOracle} from "../src/TrustSubOracle.sol";
import {TrustSubVault} from "../src/TrustSubVault.sol";
import {TrustSubAutomation} from "../src/TrustSubAutomation.sol";
import {TrustSubAccess} from "../src/TrustSubAccess.sol";
import {MockChainlinkAggregator} from "../src/mocks/MockChainlinkAggregator.sol";

/// @title DeployTrustSubScript
/// @notice Deploys the TrustSub contracts in dependency order:
///         1. TrustSubToken
///         2. TrustSubOracle (registers TrustSubToken feed)
///         3. TrustSubVault (handed TrustSubToken + TrustSubOracle)
///         4. TrustSubAutomation (handed TrustSubVault)
///         5. TrustSubAccess (handed TrustSubVault)
contract DeployTrustSubScript is Script {
    TrustSubToken public token;
    TrustSubOracle public oracle;
    TrustSubVault public vault;
    TrustSubAutomation public automation;
    TrustSubAccess public access;
    MockChainlinkAggregator public mockFeed;

    function run()
        external
        returns (
            TrustSubToken deployedToken,
            TrustSubOracle deployedOracle,
            TrustSubVault deployedVault,
            TrustSubAutomation deployedAutomation,
            TrustSubAccess deployedAccess
        )
    {
        uint256 deployerPrivateKey;
        bool hasEnvKey = false;

        try vm.envUint("PRIVATE_KEY") returns (uint256 key) {
            deployerPrivateKey = key;
            hasEnvKey = true;
        } catch {}

        if (hasEnvKey) {
            vm.startBroadcast(deployerPrivateKey);
        } else {
            vm.startBroadcast();
        }

        console.log("==================================================");
        console.log("   TrustSub Protocol Deployment Pipeline");
        console.log("==================================================");

        // Step 1: Deploy TrustSubToken (Payment Rail)
        console.log("[1/5] Deploying TrustSubToken...");
        token = new TrustSubToken("TrustSub Token", "TSUB", address(0));
        console.log("      -> TrustSubToken deployed at:", address(token));

        // Determine price feed for TrustSubOracle
        address feedAddress = address(0);
        try vm.envAddress("CHAINLINK_FEED") returns (address envFeed) {
            feedAddress = envFeed;
        } catch {}

        if (feedAddress == address(0)) {
            console.log("      (No CHAINLINK_FEED provided: deploying local MockChainlinkAggregator @ $1.00)");
            mockFeed = new MockChainlinkAggregator(1e8, 8); // 8 decimals standard Chainlink ($1.00 USD)
            feedAddress = address(mockFeed);
            console.log("      -> MockChainlinkAggregator deployed at:", feedAddress);
        }

        // Step 2: Deploy TrustSubOracle (Price Feed)
        console.log("[2/5] Deploying TrustSubOracle...");
        address[] memory tokens = new address[](1);
        tokens[0] = address(token);
        address[] memory feeds = new address[](1);
        feeds[0] = feedAddress;

        oracle = new TrustSubOracle(tokens, feeds);
        console.log("      -> TrustSubOracle deployed at:", address(oracle));

        // Step 3: Deploy TrustSubVault (Core Billing Engine)
        console.log("[3/5] Deploying TrustSubVault...");
        vault = new TrustSubVault(address(token), address(oracle));
        console.log("      -> TrustSubVault deployed at:", address(vault));

        // Step 4: Deploy TrustSubAutomation (Relayer / Keeper)
        console.log("[4/5] Deploying TrustSubAutomation...");
        automation = new TrustSubAutomation(address(vault));
        console.log("      -> TrustSubAutomation deployed at:", address(automation));

        // Step 5: Deploy TrustSubAccess (Content Gate)
        console.log("[5/5] Deploying TrustSubAccess...");
        access = new TrustSubAccess(address(vault));
        console.log("      -> TrustSubAccess deployed at:", address(access));

        vm.stopBroadcast();

        console.log("==================================================");
        console.log("   Deployment Successfully Completed!");
        console.log("==================================================");

        return (token, oracle, vault, automation, access);
    }
}
