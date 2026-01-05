# Keeper Flows: Peel and Liquidation

## Overview

Keepers are external actors who maintain protocol health by executing liquidations and "peel" operations. They are economically incentivized through rewards.

## Keeper Operations

### 1. Peel (Soft Liquidation)

Removes excess debt by selling collateral at favorable terms.

```
Vault in Warning Zone (110-120% ratio)
    ↓
Keeper calls peel()
    ↓
Small portion of collateral sold
    ↓
Debt reduced, ratio improved
    ↓
Vault returns to Healthy state
```

### 2. Full Liquidation

Forces closure of undercollateralized vaults.

```
Vault below 110% ratio
    ↓
Keeper calls liquidate()
    ↓
All collateral sold
    ↓
Debt fully repaid (or bad debt recorded)
    ↓
Vault closed, keeper rewarded
```

## Peel Operation

### When to Peel

```solidity
function canPeel(uint256 vaultId) public view returns (bool) {
    uint256 ratio = getCollateralRatio(vaultId);

    // Peelable: between liquidation threshold and target ratio
    return ratio > LIQUIDATION_THRESHOLD_PIPS &&
           ratio < TARGET_COLLATERAL_RATIO_PIPS;
}
```

### Peel Implementation

```solidity
function peel(uint256 vaultId, uint256 peelAmountL) external {
    require(canPeel(vaultId), "Cannot peel");

    Vault storage vault = vaults[vaultId];

    // Calculate how much collateral to sell
    uint256 collateralToSell = _calculatePeelCollateral(
        vault.collateralL,
        vault.debtL,
        peelAmountL
    );

    // Execute swap (collateral → debt tokens)
    uint256 debtRepaid = _swapCollateralForDebt(collateralToSell);

    // Update vault state
    vault.collateralL -= collateralToSell;
    vault.debtL -= debtRepaid;

    // Reward keeper
    uint256 reward = _calculatePeelReward(debtRepaid);
    _transferReward(msg.sender, reward);

    emit Peeled(vaultId, collateralToSell, debtRepaid, msg.sender);
}
```

### Peel Limits

```solidity
// Maximum peel per call (prevent over-liquidation)
uint256 constant MAX_PEEL_RATIO = 100_000;  // 10% of debt

function _calculateMaxPeel(uint256 debtL) internal pure returns (uint256) {
    return FullMath.mulDiv(debtL, MAX_PEEL_RATIO, PIPS_DENOMINATOR);
}
```

## Full Liquidation

### When to Liquidate

```solidity
function canLiquidate(uint256 vaultId) public view returns (bool) {
    uint256 ratio = getCollateralRatio(vaultId);
    return ratio <= LIQUIDATION_THRESHOLD_PIPS;
}
```

### Liquidation Implementation

```solidity
function liquidate(uint256 vaultId) external {
    require(canLiquidate(vaultId), "Cannot liquidate");

    Vault storage vault = vaults[vaultId];

    // Calculate liquidation amounts
    uint256 collateralL = vault.collateralL;
    uint256 debtL = vault.debtL;

    // Sell all collateral
    uint256 proceeds = _sellAllCollateral(vaultId);

    // Repay debt
    if (proceeds >= debtL) {
        // Full repayment
        vault.debtL = 0;

        // Remaining goes to vault owner
        uint256 remainder = proceeds - debtL;
        _transferRemainder(ownerOf(vaultId), remainder);
    } else {
        // Bad debt - socialize loss
        uint256 badDebt = debtL - proceeds;
        vault.debtL = 0;
        _recordBadDebt(badDebt);
    }

    // Clear vault
    vault.collateralL = 0;

    // Reward keeper
    uint256 reward = _calculateLiquidationReward(collateralL);
    _transferReward(msg.sender, reward);

    emit Liquidated(vaultId, collateralL, proceeds, msg.sender);
}
```

## Keeper Incentives

### Reward Structure

| Operation | Reward | Source |
|-----------|--------|--------|
| Peel | 0.5% of debt repaid | Protocol reserve |
| Liquidation | 5% of collateral | Collateral |
| Gas rebate | Actual gas × 1.1 | Protocol reserve |

### Reward Calculation

```solidity
function _calculateLiquidationReward(uint256 collateralL)
    internal pure returns (uint256)
{
    return FullMath.mulDiv(
        collateralL,
        LIQUIDATION_REWARD_PIPS,  // 50,000 = 5%
        PIPS_DENOMINATOR
    );
}
```

## Dutch Auction Liquidations

For large positions, use Dutch auction to minimize slippage:

```solidity
struct Auction {
    uint256 vaultId;
    uint256 startPrice;
    uint256 endPrice;
    uint256 startTime;
    uint256 duration;
}

function startAuction(uint256 vaultId) external {
    require(canLiquidate(vaultId), "Cannot liquidate");

    auctions[vaultId] = Auction({
        vaultId: vaultId,
        startPrice: _getOraclePrice() * 110 / 100,  // 10% premium
        endPrice: _getOraclePrice() * 80 / 100,     // 20% discount
        startTime: block.timestamp,
        duration: 1 hours
    });
}

function bidAuction(uint256 vaultId) external {
    Auction memory auction = auctions[vaultId];
    uint256 currentPrice = _getAuctionPrice(auction);

    // Transfer payment
    _transferPayment(msg.sender, currentPrice);

    // Transfer collateral
    _transferCollateral(msg.sender, vaultId);

    delete auctions[vaultId];
}
```

## MEV Considerations

### Flash Loan Attacks

```solidity
// Protection: Check price deviation
function _validatePrice(uint256 expectedPrice, uint256 actualPrice) internal {
    uint256 deviation = _calculateDeviation(expectedPrice, actualPrice);
    require(deviation <= MAX_PRICE_DEVIATION, "Price manipulated");
}
```

### Backrunning Protection

```solidity
// Use commit-reveal for large liquidations
mapping(bytes32 => uint256) public commits;

function commitLiquidation(bytes32 commitment) external {
    commits[commitment] = block.number;
}

function revealLiquidation(
    uint256 vaultId,
    bytes32 secret
) external {
    bytes32 commitment = keccak256(abi.encodePacked(vaultId, secret, msg.sender));
    require(commits[commitment] > 0, "No commit");
    require(block.number > commits[commitment] + 1, "Too early");

    _executeLiquidation(vaultId);
}
```

## Keeper Bot Implementation

### Basic Bot Structure

```typescript
class KeeperBot {
    async run() {
        while (true) {
            // 1. Scan for opportunities
            const vaults = await this.getActiveVaults();

            for (const vault of vaults) {
                // 2. Check peel eligibility
                if (await this.canPeel(vault.id)) {
                    await this.executePeel(vault.id);
                }

                // 3. Check liquidation eligibility
                if (await this.canLiquidate(vault.id)) {
                    await this.executeLiquidation(vault.id);
                }
            }

            // 4. Wait before next scan
            await sleep(SCAN_INTERVAL);
        }
    }
}
```

### Profitability Check

```typescript
async function isProfitable(
    vaultId: bigint,
    operation: 'peel' | 'liquidate'
): Promise<boolean> {
    const reward = await estimateReward(vaultId, operation);
    const gasCost = await estimateGasCost(operation);

    return reward > gasCost * 1.2;  // 20% margin
}
```

## Events

```solidity
event Peeled(
    uint256 indexed vaultId,
    uint256 collateralSold,
    uint256 debtRepaid,
    address indexed keeper
);

event Liquidated(
    uint256 indexed vaultId,
    uint256 collateralL,
    uint256 proceeds,
    address indexed keeper
);

event AuctionStarted(
    uint256 indexed vaultId,
    uint256 startPrice,
    uint256 endPrice
);
```

## Related Concepts

- [Vault Operations](./vault-operations.md) - Core vault flows
- [Collateral Management](./collateral-management.md) - Collateral handling
- [sqrt(K) Floor](../concepts/sqrt-k-floor.md) - Collateral requirements
