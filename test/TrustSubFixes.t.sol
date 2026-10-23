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
import {IERC20} from "../src/IERC20.sol";

contract MockERC20 is IERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;
    uint256 public override totalSupply;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(allowance[from][msg.sender] >= amount, "allowance");
        require(balanceOf[from] >= amount, "balance");
        if (allowance[from][msg.sender] < type(uint256).max) {
            allowance[from][msg.sender] -= amount;
        }
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}

contract TrustSubFixesTest is Test {
    DeployTrustSubScript public deployer;

    TrustSubToken public token;
    TrustSubOracle public oracle;
    TrustSubVault public vault;
    TrustSubAutomation public automation;
    TrustSubAccess public access;
    MockChainlinkAggregator public mockFeed;

    address public merchant = address(0xABCD);
    address public subscriber = address(0x1234);

    uint256 internal signerPrivateKey = 0xA11CE;
    address internal alice;

    function setUp() public {
        alice = vm.addr(signerPrivateKey);
        deployer = new DeployTrustSubScript();
        (token, oracle, vault, automation, access) = deployer.run();
        mockFeed = deployer.mockFeed();
    }

    // ----------------------------------------------------
    // Test 1: EIP-712 Permit Verification with standard DOMAIN_SEPARATOR
    // ----------------------------------------------------
    function test_Permit_Success() public {
        uint256 permitAmount = 500e18;
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = token.nonces(alice);

        bytes32 structHash = keccak256(
            abi.encode(
                token.PERMIT_TYPEHASH(),
                alice,
                address(vault),
                permitAmount,
                nonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);

        // Execute permit
        token.permit(alice, address(vault), permitAmount, deadline, v, r, s);

        // Verify allowance was set
        assertEq(token.allowance(alice, address(vault)), permitAmount);
        assertEq(token.nonces(alice), nonce + 1);
    }

    function test_Permit_RevertIfExpired() public {
        uint256 deadline = vm.getBlockTimestamp();
        vm.warp(deadline + 1);

        bytes32 structHash = keccak256(
            abi.encode(
                token.PERMIT_TYPEHASH(),
                alice,
                address(vault),
                100e18,
                token.nonces(alice),
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);

        vm.expectRevert("expired");
        token.permit(alice, address(vault), 100e18, deadline, v, r, s);
    }

    function test_Permit_RevertIfZeroOwner() public {
        vm.expectRevert("zero owner");
        token.permit(address(0), address(vault), 100e18, block.timestamp + 100, 27, bytes32(0), bytes32(0));
    }

    function test_Permit_RevertOnInvalidSignature() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash = keccak256(
            abi.encode(
                token.PERMIT_TYPEHASH(),
                alice,
                address(vault),
                100e18,
                token.nonces(alice),
                deadline
            )
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash)
        );

        // Signed with a different key
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xB0B, digest);

        vm.expectRevert("invalid signature");
        token.permit(alice, address(vault), 100e18, deadline, v, r, s);
    }

    // ----------------------------------------------------
    // Test 2: Multi-Token Support in TrustSubVault
    // ----------------------------------------------------
    function test_Vault_MultiTokenPlan() public {
        // Deploy second token (USDC mock with 6 decimals)
        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        MockChainlinkAggregator usdcFeed = new MockChainlinkAggregator(1e8, 8); // $1.00

        address admin = oracle.admin();
        vm.prank(admin);
        oracle.setFeed(address(usdc), address(usdcFeed));

        // Merchant creates a plan for $50 using USDC
        vm.prank(merchant);
        uint256 planId = vault.createPlan(address(usdc), 50e18, 30 days);

        // Fund subscriber with USDC
        usdc.mint(subscriber, 1000e6); // 1000 USDC

        vm.startPrank(subscriber);
        usdc.approve(address(vault), type(uint256).max);
        vault.startSubscription(subscriber, planId);
        vm.stopPrank();

        // Warp to next billing cycle
        vm.warp(block.timestamp + 31 days);

        // Collect payment
        vault.collectPayment(subscriber);

        // Verify USDC moved (at $1.00 per token, $50 = 50 USDC = 50e6)
        assertEq(usdc.balanceOf(merchant), 50e6, "merchant should have received 50 USDC");
        assertEq(usdc.balanceOf(subscriber), 950e6, "subscriber should have 950 USDC remaining");
    }

    // ----------------------------------------------------
    // Test 3: Plan Validation (Zero Interval / Price / Token)
    // ----------------------------------------------------
    function test_CreatePlan_RevertZeroInterval() public {
        vm.prank(merchant);
        vm.expectRevert("zero interval");
        vault.createPlan(address(token), 20e18, 0);
    }

    function test_CreatePlan_RevertZeroPrice() public {
        vm.prank(merchant);
        vm.expectRevert("zero price");
        vault.createPlan(address(token), 0, 30 days);
    }

    function test_CreatePlan_RevertZeroToken() public {
        vm.prank(merchant);
        vm.expectRevert("zero token");
        vault.createPlan(address(0), 20e18, 30 days);
    }

    // ----------------------------------------------------
    // Test 4: Dynamic Oracle Feed Decimals (18-decimal feed)
    // ----------------------------------------------------
    function test_Oracle_Supports18DecimalFeed() public {
        // Deploy a token and an 18-decimal Chainlink feed
        MockERC20 testToken = new MockERC20("Test Token", "TEST", 18);
        MockChainlinkAggregator feed18 = new MockChainlinkAggregator(2000e18, 18); // $2000 price with 18 decimals

        address admin = oracle.admin();
        vm.prank(admin);
        oracle.setFeed(address(testToken), address(feed18));

        // getPrice should return 2000e18
        assertEq(oracle.getPrice(address(testToken)), 2000e18);

        // $100 plan converted to TEST token: 100e18 / 2000e18 = 0.05e18
        uint256 tokenAmount = oracle.convert(address(testToken), 100e18);
        assertEq(tokenAmount, 0.05e18);
    }

    // ----------------------------------------------------
    // Test 5: Admin Emergency Freeze and Unfreeze
    // ----------------------------------------------------
    function test_Oracle_AdminEmergencyFreeze() public {
        assertFalse(oracle.isFrozen(address(token)));

        address admin = oracle.admin();
        vm.prank(admin);
        oracle.freeze(address(token));

        assertTrue(oracle.isFrozen(address(token)));

        // convert reverts while frozen
        vm.expectRevert("price frozen");
        oracle.convert(address(token), 20e18);

        // Admin unfreezes
        vm.prank(admin);
        oracle.unfreeze(address(token));
        assertFalse(oracle.isFrozen(address(token)));
    }

    // ----------------------------------------------------
    // Test 6: Automation Resilience (Broken Sub does not DoS batch)
    // ----------------------------------------------------
    function test_Automation_BatchResilience() public {
        // Merchant creates a plan
        vm.prank(merchant);
        uint256 planId = vault.createPlan(address(token), 20e18, 30 days);

        // Valid subscriber
        token.mint(subscriber, 100e18);
        vm.startPrank(subscriber);
        token.approve(address(vault), type(uint256).max);
        vault.startSubscription(subscriber, planId);
        vm.stopPrank();

        // Warp time
        vm.warp(block.timestamp + 31 days);

        // Keeper passes an array containing an invalid subscriber and a valid subscriber
        address[] memory subs = new address[](3);
        subs[0] = address(0xDEAD); // non-subscriber
        subs[1] = subscriber;     // due subscriber
        subs[2] = address(0);        // zero address

        address keeper = automation.keeper();
        vm.prank(keeper);
        address[] memory triggered = automation.checkUpkeeping(subs);

        // Valid subscriber should still succeed without reverting the batch
        assertEq(triggered.length, 1);
        assertEq(triggered[0], subscriber);
        assertEq(token.balanceOf(merchant), 20e18);
    }
}
