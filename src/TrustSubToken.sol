// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IERC20.sol";

/// @title TrustSubToken — the payment rail.
/// @notice ERC-20 with gasless approvals (EIP-2612 permit). Users sign instead of
///         paying gas to approve, then grant the Vault a standing allowance it
///         can draw from each month.
contract TrustSubToken is IERC20 {
    string public name;
    string public symbol;
    uint8 public constant DECIMALS = 18;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    function decimals() external pure returns (uint8) {
        return DECIMALS;
    }

    // EIP-2612 domain separator — the foundation of gasless approvals.
    bytes32 private immutable DOMAIN_SEPARATOR;
    bytes32 private immutable PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    mapping(address => uint256) public nonces;

    constructor(string memory _name, string memory _symbol, address _verifyingContract) {
        name = _name;
        symbol = _symbol;
        address verifying = _verifyingContract == address(0) ? address(this) : _verifyingContract;
        DOMAIN_SEPARATOR = keccak256(
            abi.encodePacked(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes("1")),
                block.chainid,
                verifying
            )
        );
    }

    // ---------- Standard ERC-20 ----------
    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        uint256 allowed = _allowances[from][msg.sender];
        require(allowed >= type(uint256).max || allowed >= amount, "allowance");
        if (allowed < type(uint256).max) {
            _allowances[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    // ---------- Minting (deployer / treasury) ----------
    function mint(address to, uint256 amount) external {
        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    // ---------- Gasless approval (EIP-2612 permit) ----------
    /// @notice Sign off-chain, then submit this to approve without paying gas.
    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        require(block.timestamp <= deadline, "expired");
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner], deadline))
            )
        );
        require(owner == ecrecover(digest, v, r, s), "invalid signature");
        nonces[owner]++;
        _allowances[owner][spender] = value;
        emit Approval(owner, spender, value);
    }

    // ---------- Internal ----------
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "from zero");
        require(to != address(0), "to zero");
        require(_balances[from] >= amount, "balance");
        _balances[from] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }
}