# Vault Operations: Core User Flows

## Overview

Vaults are ERC-721 NFTs representing user positions in AEGIS. Each vault can hold collateral (Uniswap V4 liquidity positions) and carry debt.

## Vault Lifecycle

```
Create Vault → Deposit Collateral → Borrow → Repay → Withdraw → Close Vault
       ↑              ↑                ↑        ↑         ↑
       └──────────────┴────────────────┴────────┴─────────┘
                    (Can repeat any operation)
```

## Core Operations

### Create Vault

```solidity
function createVault() external returns (uint256 vaultId) {
    vaultId = _nextVaultId++;

    // Mint NFT to caller
    _mint(msg.sender, vaultId);

    // Initialize vault state
    vaults[vaultId] = Vault({
        owner: msg.sender,
        collateralL: 0,
        debtL: 0,
        createdAt: block.timestamp
    });

    emit VaultCreated(vaultId, msg.sender);
}
```

### Deposit Collateral

```solidity
function depositCollateral(
    uint256 vaultId,
    uint256 positionId  // Uniswap V4 position NFT
) external {
    require(ownerOf(vaultId) == msg.sender, "Not vault owner");

    // Transfer position to vault
    positionManager.transferFrom(msg.sender, address(this), positionId);

    // Calculate L-units
    uint256 positionL = _getPositionL(positionId);

    // Update vault collateral
    vaults[vaultId].collateralL += positionL;

    emit CollateralDeposited(vaultId, positionId, positionL);
}
```

### Borrow

```solidity
function borrow(
    uint256 vaultId,
    uint256 borrowAmountL
) external {
    require(ownerOf(vaultId) == msg.sender, "Not vault owner");

    Vault storage vault = vaults[vaultId];

    // Check collateral ratio after borrow
    uint256 newDebtL = vault.debtL + borrowAmountL;
    require(
        _isCollateralSufficient(vault.collateralL, newDebtL),
        "Insufficient collateral"
    );

    // Check utilization cap
    require(
        _isUtilizationSafe(newDebtL),
        "Utilization cap exceeded"
    );

    // Update debt (equity neutrality: equityL unchanged)
    vault.debtL = newDebtL;

    // Transfer tokens to borrower
    _transferBorrowedTokens(msg.sender, borrowAmountL);

    emit Borrowed(vaultId, borrowAmountL);
}
```

### Repay

```solidity
function repay(
    uint256 vaultId,
    uint256 repayAmountL
) external {
    Vault storage vault = vaults[vaultId];

    // Calculate actual repayment (may include accrued interest)
    uint256 totalOwed = _calculateTotalOwed(vault.debtL);
    uint256 actualRepay = repayAmountL > totalOwed ? totalOwed : repayAmountL;

    // Transfer tokens from repayer
    _transferRepaymentTokens(msg.sender, actualRepay);

    // Update debt (equity neutrality: equityL unchanged)
    vault.debtL = totalOwed - actualRepay;

    emit Repaid(vaultId, actualRepay);
}
```

### Withdraw Collateral

```solidity
function withdrawCollateral(
    uint256 vaultId,
    uint256 positionId
) external {
    require(ownerOf(vaultId) == msg.sender, "Not vault owner");

    Vault storage vault = vaults[vaultId];

    // Calculate remaining collateral
    uint256 positionL = _getPositionL(positionId);
    uint256 remainingL = vault.collateralL - positionL;

    // Check collateral ratio after withdrawal
    require(
        _isCollateralSufficient(remainingL, vault.debtL),
        "Would undercollateralize"
    );

    // Update vault and transfer
    vault.collateralL = remainingL;
    positionManager.transferFrom(address(this), msg.sender, positionId);

    emit CollateralWithdrawn(vaultId, positionId, positionL);
}
```

## State Transitions

### Vault Health States

| State | Condition | Actions Allowed |
|-------|-----------|-----------------|
| Empty | collateralL = 0, debtL = 0 | Deposit |
| Healthy | ratio > 120% | All |
| Warning | 110% < ratio ≤ 120% | Repay, Deposit |
| Liquidatable | ratio ≤ 110% | Repay, Liquidate |

### Collateral Ratio Calculation

```solidity
function getCollateralRatio(uint256 vaultId) public view returns (uint256) {
    Vault memory vault = vaults[vaultId];

    if (vault.debtL == 0) return type(uint256).max;

    // ratio = (collateralL * PIPS_DENOMINATOR) / debtL
    return FullMath.mulDiv(
        vault.collateralL,
        PIPS_DENOMINATOR,
        vault.debtL
    );
}
```

## Session Integration

All vault operations occur within sessions:

```solidity
function executeVaultAction(
    uint256 vaultId,
    bytes calldata actionData
) external {
    // Start session (Phase 1 → Phase 0)
    poolManager.unlock(abi.encode(vaultId, actionData));
}

function unlockCallback(bytes calldata data) external {
    (uint256 vaultId, bytes memory actionData) = abi.decode(
        data,
        (uint256, bytes)
    );

    // Phase 0: Execute action
    _startSession(vaultId);
    _executeAction(vaultId, actionData);
    _endSession();
}
```

## Multi-Position Vaults

### Adding Multiple Collateral Positions

```solidity
function depositMultipleCollateral(
    uint256 vaultId,
    uint256[] calldata positionIds
) external {
    for (uint256 i = 0; i < positionIds.length; i++) {
        depositCollateral(vaultId, positionIds[i]);
    }
}
```

### Position Aggregation

```solidity
function getVaultCollateralDetails(uint256 vaultId)
    external view returns (
        uint256 totalL,
        uint256 totalSqrtK,
        uint256[] memory positionIds
    )
{
    // Sum across all positions
    positionIds = vaultPositions[vaultId];
    for (uint256 i = 0; i < positionIds.length; i++) {
        totalL += _getPositionL(positionIds[i]);
        totalSqrtK += _getPositionSqrtK(positionIds[i]);
    }
}
```

## Error Handling

### Common Revert Reasons

| Error | Cause | Resolution |
|-------|-------|------------|
| `NotVaultOwner` | Caller != NFT owner | Use correct account |
| `InsufficientCollateral` | Collateral < required | Deposit more |
| `UtilizationExceeded` | Market full | Wait or reduce borrow |
| `NoDebt` | Trying to repay zero | No action needed |
| `VaultNotEmpty` | Close with debt | Repay first |

## Events

```solidity
event VaultCreated(uint256 indexed vaultId, address indexed owner);
event CollateralDeposited(uint256 indexed vaultId, uint256 positionId, uint256 amountL);
event CollateralWithdrawn(uint256 indexed vaultId, uint256 positionId, uint256 amountL);
event Borrowed(uint256 indexed vaultId, uint256 amountL);
event Repaid(uint256 indexed vaultId, uint256 amountL);
event VaultLiquidated(uint256 indexed vaultId, address indexed liquidator);
```

## Related Concepts

- [L-Units](../concepts/l-units.md) - Liquidity accounting
- [sqrt(K) Floor](../concepts/sqrt-k-floor.md) - Collateral requirements
- [Session Lifecycle](./session-lifecycle.md) - Operation sessions
- [Keeper Flows](./keeper-flows.md) - Liquidation process
