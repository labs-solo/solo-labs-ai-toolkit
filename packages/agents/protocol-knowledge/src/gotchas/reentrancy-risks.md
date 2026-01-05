# Reentrancy Risks: Callback Safety in AEGIS

## Overview

AEGIS operates within Uniswap V4's callback architecture, creating unique reentrancy considerations. Understanding safe patterns is critical for security.

## Reentrancy Vectors

### 1. PoolManager Callbacks

```
User → Router → PM.unlock() → unlockCallback() → [operations]
                                    ↑
                              External call could
                              re-enter here
```

### 2. ERC-721 Callbacks

```
Vault NFT transfer → onERC721Received() → malicious callback
Position NFT transfer → onERC721Received() → malicious callback
```

### 3. Hook Callbacks

```
PM operation → Hook.beforeSwap() → external call → re-enter hook
```

### 4. Flash Loan Callbacks

```
Flash loan → callback → re-enter protocol with borrowed funds
```

## Vulnerable Patterns

### 1. State Update After External Call

**Vulnerable:**

```solidity
function withdraw(uint256 amount) external {
    // External call BEFORE state update
    token.transfer(msg.sender, amount);

    // State update AFTER - vulnerable!
    balances[msg.sender] -= amount;
}
```

**Safe (Checks-Effects-Interactions):**

```solidity
function withdraw(uint256 amount) external {
    // Check
    require(balances[msg.sender] >= amount, "Insufficient");

    // Effect (state update FIRST)
    balances[msg.sender] -= amount;

    // Interaction (external call LAST)
    token.transfer(msg.sender, amount);
}
```

### 2. Callback During Session

**Vulnerable:**

```solidity
function executeWithCallback() external {
    _startSession();

    // External call during session - dangerous!
    externalContract.doSomething();

    _endSession();
}
```

**Safe (transient guard):**

```solidity
function executeWithCallback() external {
    // Check transient reentrancy guard
    require(tload(REENTRANCY_SLOT) == 0, "Reentrant");
    tstore(REENTRANCY_SLOT, 1);

    _startSession();
    externalContract.doSomething();
    _endSession();

    tstore(REENTRANCY_SLOT, 0);
}
```

### 3. NFT Transfer Callback

**Vulnerable:**

```solidity
function depositNFT(uint256 tokenId) external {
    // This triggers onERC721Received on the sender!
    nft.safeTransferFrom(msg.sender, address(this), tokenId);

    // State update after callback - vulnerable
    vaultCollateral[vaultId].push(tokenId);
}
```

**Safe:**

```solidity
function depositNFT(uint256 tokenId) external {
    // Update state FIRST
    vaultCollateral[vaultId].push(tokenId);

    // Then transfer (callback happens, but state is already updated)
    nft.safeTransferFrom(msg.sender, address(this), tokenId);
}
```

## Protection Patterns

### 1. Transient Reentrancy Guard

```solidity
modifier nonReentrantTransient() {
    require(tload(REENTRANCY_SLOT) == 0, "ReentrancyGuard: reentrant call");
    tstore(REENTRANCY_SLOT, 1);
    _;
    tstore(REENTRANCY_SLOT, 0);
}
```

**Benefits:**

- Cheaper than storage-based guard
- Automatically clears at transaction end
- Works across all functions in same transaction

### 2. Session-Based Guard

```solidity
modifier onlyOutsideSession() {
    require(tload(SESSION_ACTIVE_SLOT) == 0, "Session active");
    _;
}

modifier onlyDuringSession() {
    require(tload(SESSION_ACTIVE_SLOT) == 1, "No session");
    _;
}

// Safe: Can only start session from outside
function startSession() external onlyOutsideSession {
    tstore(SESSION_ACTIVE_SLOT, 1);
    // ...
}
```

### 3. Checks-Effects-Interactions

```solidity
function borrow(uint256 amount) external {
    // CHECKS
    require(amount > 0, "Zero amount");
    require(isCollateralized(msg.sender), "Undercollateralized");

    // EFFECTS
    debts[msg.sender] += amount;
    totalDebt += amount;

    // INTERACTIONS
    token.transfer(msg.sender, amount);
}
```

### 4. Pull Pattern

```solidity
// Instead of pushing tokens, let users pull
mapping(address => uint256) public pendingWithdrawals;

function initiateWithdrawal(uint256 amount) external {
    // State update only, no external call
    balances[msg.sender] -= amount;
    pendingWithdrawals[msg.sender] += amount;
}

function claimWithdrawal() external {
    uint256 amount = pendingWithdrawals[msg.sender];
    pendingWithdrawals[msg.sender] = 0;
    token.transfer(msg.sender, amount);
}
```

## Hook-Specific Considerations

### Safe Hook Implementation

```solidity
function beforeSwap(
    address sender,
    PoolKey calldata key,
    IPoolManager.SwapParams calldata params,
    bytes calldata hookData
) external override onlyPoolManager returns (bytes4, BeforeSwapDelta, uint24) {
    // Safe: Only read operations
    uint256 fee = _calculateFee(key, params);

    // Safe: Only transient storage
    tstore(PENDING_FEE_SLOT, fee);

    // AVOID: External calls here
    // externalOracle.getPrice(); // Risky!

    return (this.beforeSwap.selector, ZERO_DELTA, uint24(fee));
}
```

### Hook Callback Safety

```solidity
function afterSwap(...) external override onlyPoolManager {
    // State is already updated by PM
    // External calls here are safer but still require care

    // If calling external contract:
    // 1. Use reentrancy guard
    // 2. Don't trust return values for state
    // 3. Limit gas to external call
}
```

## Testing for Reentrancy

### Foundry Reentrancy Test

```solidity
contract ReentrancyAttacker {
    AegisEngine engine;
    uint256 attackCount;

    function attack() external {
        engine.withdraw(100);
    }

    receive() external payable {
        if (attackCount < 5) {
            attackCount++;
            engine.withdraw(100);  // Attempt reentry
        }
    }
}

function test_reentrancyProtection() public {
    ReentrancyAttacker attacker = new ReentrancyAttacker();

    vm.expectRevert("ReentrancyGuard: reentrant call");
    attacker.attack();
}
```

### Invariant Test

```solidity
function invariant_noReentrantStateCorruption() public {
    // After any sequence of calls, balances should sum correctly
    uint256 sum = 0;
    for (uint256 i = 0; i < users.length; i++) {
        sum += engine.balanceOf(users[i]);
    }
    assertEq(sum, engine.totalSupply());
}
```

## Common Mistakes

### 1. Using Storage Guard in Callbacks

```solidity
// This might not protect within PM callback chain
modifier nonReentrant() {
    require(!locked, "Reentrant");
    locked = true;  // SSTORE - expensive and might not help
    _;
    locked = false;
}
```

**Better: Use transient storage**

### 2. Trusting msg.sender in Callback

```solidity
function onERC721Received(...) external returns (bytes4) {
    // msg.sender is the NFT contract, not the user!
    // Don't use msg.sender for authorization
}
```

### 3. Ignoring Cross-Function Reentrancy

```solidity
// Both functions share state but only one has guard
function deposit() external nonReentrant { ... }
function withdraw() external { ... }  // Vulnerable!
```

## Related Concepts

- [Two-Phase Execution](../concepts/two-phase-execution.md) - Callback architecture
- [Session Lifecycle](../patterns/session-lifecycle.md) - Session guards
- [Transient Storage](../concepts/transient-storage.md) - Guard implementation
