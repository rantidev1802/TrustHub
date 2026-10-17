// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {DeployTrustSubScript} from "../script/DeployTrustSub.s.sol";
import {TrustSubToken} from "../src/TrustSubToken.sol";
import {TrustSubOracle} from "../src/TrustSubOracle.sol";
import {TrustSubVault} from "../src/TrustSubVault.sol";
import {TrustSubAutomation} from "../src/TrustSubAutomation.sol";
import {TrustSubAccess} from "../src/TrustSubAccess.sol";

contract DeployTrustSubTest is Test {
    DeployTrustSubScript public deployer;

    TrustSubToken public token;
    TrustSubOracle public oracle;
    TrustSubVault public vault;
    TrustSubAutomation public automation;
    TrustSubAccess public access;

    address public merchant = address(0xABCD);
    address public subscriber = address(0x1234);

    function setUp() public {
        deployer = new DeployTrustSubScript();
        (token, oracle, vault, automation, access) = deployer.run();
    }

    function test_DeploymentWiring() public view {
        // 1. Verify all deployed contracts have code
        assertTrue(address(token).code.length > 0, "token not deployed");
        assertTrue(address(oracle).code.length > 0, "oracle not deployed");
        assertTrue(address(vault).code.length > 0, "vault not deployed");
        assertTrue(address(automation).code.length > 0, "automation not deployed");
        assertTrue(address(access).code.length > 0, "access not deployed");

        // 2. Verify Vault wiring
        assertEq(address(vault.token()), address(token), "vault token mismatch");
        assertEq(address(vault.oracle()), address(oracle), "vault oracle mismatch");

        // 3. Verify Automation wiring
        assertEq(automation.vault(), address(vault), "automation vault mismatch");

        // 4. Verify Access wiring
        assertEq(access.vault(), address(vault), "access vault mismatch");
    }

    function test_FullLifecycleAfterDeployment() public {
        // 1. Merchant creates a $20 plan (interval: 30 days)
        uint256 planPriceUsd = 20e18; // $20.00
        uint256 planInterval = 30 days;

        vm.prank(merchant);
        uint256 planId = vault.createPlan(address(token), planPriceUsd, planInterval);
        assertEq(planId, 1, "planId should be 1");

        // 2. Fund subscriber with TSUB tokens and grant standing allowance to Vault
        token.mint(subscriber, 1000e18);

        vm.startPrank(subscriber);
        token.approve(address(vault), type(uint256).max);
        vault.startSubscription(subscriber, planId);
        vm.stopPrank();

        // 3. Immediately after starting subscription, access is active
        assertTrue(vault.isSubscribed(subscriber), "subscriber should be active");
        assertTrue(access.accessOf(subscriber), "access contract should allow access");

        // 4. Fast-forward time past the first interval
        vm.warp(block.timestamp + 31 days);

        // Before payment is collected, isSubscribed is false (due for billing)
        assertFalse(vault.isSubscribed(subscriber), "sub should be due");
        // But grace period in access contract still protects user for up to 3 days!
        assertTrue(access.accessOf(subscriber), "access should be granted under grace period");

        // 5. Automation keeper triggers checkUpkeeping
        address[] memory subsToCheck = new address[](1);
        subsToCheck[0] = subscriber;

        // Automation keeper is deployer
        address keeper = automation.keeper();
        vm.prank(keeper);
        address[] memory triggered = automation.checkUpkeeping(subsToCheck);

        assertEq(triggered.length, 1, "subscriber payment should be triggered");
        assertEq(triggered[0], subscriber, "triggered address should match subscriber");

        // 6. Verify funds moved to merchant (at $1.00 per token, $20 = 20 TSUB)
        assertEq(token.balanceOf(merchant), 20e18, "merchant should have received 20 tokens");
        assertEq(token.balanceOf(subscriber), 980e18, "subscriber balance should be 980 tokens");

        // 7. Verify subscription is active again for the next cycle
        assertTrue(vault.isSubscribed(subscriber), "subscription should be renewed");
        assertTrue(access.accessOf(subscriber), "access should remain active");
    }
}
