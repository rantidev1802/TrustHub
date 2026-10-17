// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {DeployTrustSubScript} from "../script/DeployTrustSub.s.sol";
import {TrustSubToken} from "../src/TrustSubToken.sol";
import {TrustSubOracle} from "../src/TrustSubOracle.sol";
import {TrustSubVault} from "../src/TrustSubVault.sol";
import {TrustSubAutomation} from "../src/TrustSubAutomation.sol";
import {TrustSubAccess} from "../src/TrustSubAccess.sol";
import {MockChainlinkAggregator} from "../src/mocks/MockChainlinkAggregator.sol";

contract TrustSubVolatilityTest is Test {
    DeployTrustSubScript public deployer;

    TrustSubToken public token;
    TrustSubOracle public oracle;
    TrustSubVault public vault;
    TrustSubAutomation public automation;
    TrustSubAccess public access;
    MockChainlinkAggregator public mockFeed;

    address public merchant = address(0xABCD);
    address public subscriber = address(0x1234);

    uint256 public planId;

    function setUp() public {
        deployer = new DeployTrustSubScript();
        (token, oracle, vault, automation, access) = deployer.run();

        // Retrieve mock feed created by deployer script
        mockFeed = deployer.mockFeed();

        // Merchant sets up a plan: $20.00 / 30 days
        vm.prank(merchant);
        planId = vault.createPlan(address(token), 20e18, 30 days);

        // Fund subscriber with tokens and start subscription
        token.mint(subscriber, 1000e18);
        vm.startPrank(subscriber);
        token.approve(address(vault), type(uint256).max);
        vault.startSubscription(subscriber, planId);
        vm.stopPrank();
    }

    function test_InitialStateNotFrozen() public view {
        assertFalse(oracle.isFrozen(address(token)), "token should not be frozen initially");
    }

    function test_SmallPriceMove_DoesNotFreeze() public {
        // Move price by +2% ($1.00 -> $1.02)
        mockFeed.setPrice(102000000); // 1.02 * 1e8

        assertFalse(oracle.isFrozen(address(token)), "2% move should not freeze token");

        // Fast-forward to due timestamp
        vm.warp(block.timestamp + 31 days);

        // Payment should collect smoothly
        vault.collectPayment(subscriber);
        assertFalse(oracle.isFrozen(address(token)), "token should still not be frozen");
    }

    function test_AbruptPriceSpike_CausesFreezeAndBlocksBilling() public {
        // Fast-forward to billing due date
        vm.warp(block.timestamp + 31 days);

        // Abrupt spike: +20% ($1.00 -> $1.20)
        mockFeed.setPrice(120000000);

        // 1. isFrozen() view check immediately detects the spike
        assertTrue(oracle.isFrozen(address(token)), "token must be detected as frozen due to abrupt spike");

        // 2. Vault collectPayment must revert due to price freeze
        vm.expectRevert("token price frozen");
        vault.collectPayment(subscriber);

        // 3. Oracle convert must also revert if called directly
        vm.expectRevert("price frozen");
        oracle.convert(address(token), 20e18);

        // 4. Automation keeper attempt fails gracefully without draining funds
        address[] memory subs = new address[](1);
        subs[0] = subscriber;

        address keeper = automation.keeper();
        vm.prank(keeper);
        address[] memory triggered = automation.checkUpkeeping(subs);
        assertEq(triggered.length, 0, "no subscriptions should be triggered when frozen");

        // 5. Subscriber still retains access via grace period
        assertTrue(access.accessOf(subscriber), "subscriber must retain access under grace period during freeze");
    }

    function test_AbruptPriceCrash_CausesFreezeAndBlocksBilling() public {
        // Fast-forward to billing due date
        vm.warp(block.timestamp + 31 days);

        // Abrupt crash: -20% ($1.00 -> $0.80)
        mockFeed.setPrice(80000000);

        // isFrozen() view check immediately detects the crash
        assertTrue(oracle.isFrozen(address(token)), "token must be detected as frozen due to abrupt crash");

        // Direct Vault collectPayment reverts
        vm.expectRevert("token price frozen");
        vault.collectPayment(subscriber);
    }

    function test_AdminCanUnfreezeAfterVolatilityStabilizes() public {
        // Trigger abrupt move (+15%)
        mockFeed.setPrice(115000000);
        assertTrue(oracle.isFrozen(address(token)), "should be frozen");

        // Non-admin cannot unfreeze
        vm.prank(address(0x999));
        vm.expectRevert("not admin");
        oracle.unfreeze(address(token));

        // Admin unfreezes token
        address admin = oracle.admin();
        vm.prank(admin);
        oracle.unfreeze(address(token));

        // isFrozen is now false because lastPrice was synchronized to current market price
        assertFalse(oracle.isFrozen(address(token)), "token should be unfrozen");

        // Now fast-forward and collect payment at stabilized price
        vm.warp(block.timestamp + 31 days);
        vault.collectPayment(subscriber);

        // Verified payment went through
        assertTrue(token.balanceOf(merchant) > 0, "merchant should have received payment");
    }
}
