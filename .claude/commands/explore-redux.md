---
name: explore-redux
description: Analyze Redux store structure and vault state management patterns
agents: redux-architect
---

# Explore Redux Command

Analyze the Redux store architecture for AEGIS vault state management.

## Analysis Areas

### 1. Store Structure Analysis

- **Slice Architecture**: Examine how vault, market, and session state is organized
- **Normalization**: Check if entities are properly normalized (byId, allIds patterns)
- **Type Safety**: Verify TypeScript integration with Redux state

### 2. Selector Evaluation

- **Memoization**: Check if selectors are properly memoized with createSelector
- **Derived State**: Analyze LTV, health factor, and liquidation risk calculations
- **Performance**: Identify over-selection patterns causing unnecessary re-renders

### 3. Async Thunk Review

- **Contract Interactions**: Review thunks for vault operations (borrow, repay, deposit, withdraw)
- **Error Handling**: Check AEGIS-specific error parsing and recovery
- **Optimistic Updates**: Verify optimistic update patterns for better UX

### 4. RTK Query Integration

- **Endpoint Design**: Analyze contract read queries
- **Cache Configuration**: Review caching strategies for vault data
- **Invalidation**: Check tag-based cache invalidation patterns

## Output Format

```yaml
store_analysis:
  slices:
    - name: vault
      entities: [VaultPosition, NFTPosition]
      normalization: good | needs_improvement
    - name: market
      entities: [MarketData, GlobalParams]
      normalization: good | needs_improvement
    - name: session
      entities: [SessionInfo, PendingTx]
      normalization: good | needs_improvement

  selectors:
    total_count: <number>
    memoized_count: <number>
    complex_selectors:
      - name: selectVaultHealth
        dependencies: [collateral, debt, market]
        performance: good | needs_optimization

  thunks:
    - name: borrowFromVault
      error_handling: good | needs_improvement
      optimistic_update: yes | no
    - name: repayDebt
      error_handling: good | needs_improvement
      optimistic_update: yes | no

  recommendations:
    - priority: high | medium | low
      area: selectors | thunks | slices
      issue: <description>
      suggestion: <action>
```

## Usage

```bash
/explore-redux
/explore-redux --focus selectors
/explore-redux --focus thunks
/explore-redux --slice vault
```
