---
name: analyze-vault-flow
description: Trace vault interaction flows from UI to contract execution
agents: web3-integrator, redux-architect, vault-ui-builder
---

# Analyze Vault Flow Command

Trace complete user flows for vault interactions from UI components through state management to contract execution.

## Flow Analysis

### 1. User Action Tracing

Trace common vault operations:

- **Borrow Flow**: Button click → Form validation → Contract call → State update → UI refresh
- **Repay Flow**: Amount entry → Balance check → Approval (if needed) → Contract call → Debt update
- **Deposit Collateral**: NFT selection → Approval → Attach to vault → Collateral update
- **Withdraw Collateral**: LTV check → Detach NFT → Collateral decrease

### 2. Component-to-Contract Mapping

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   UI Component  │────▶│  Redux Action   │────▶│  wagmi Hook     │
│   BorrowForm    │     │  borrowFromVault│     │  useWriteContract│
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │
         ▼                      ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Form State    │     │   Vault Slice   │     │  AegisEngine    │
│   Validation    │     │   Optimistic    │     │  .borrow()      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 3. Error Boundary Analysis

- **Contract Revert Handling**: VaultNotSolvent, InsufficientCollateral, SessionNotActive
- **Network Errors**: Transaction failures, gas estimation errors
- **UI Recovery**: Error display, retry mechanisms, state rollback

### 4. Transaction State Machine

```
idle → pending → confirming → success/error
  │                              │
  └──────── retry ◄──────────────┘
```

## Output Format

```yaml
flow_analysis:
  operation: borrow | repay | deposit | withdraw

  steps:
    - layer: ui
      component: BorrowForm
      file: src/components/vault/BorrowForm.tsx
      actions: [setAmount, handleSubmit]

    - layer: state
      action: borrowFromVault
      file: src/store/vault/thunks.ts
      optimistic: true

    - layer: contract
      hook: useBorrow
      file: src/hooks/useVaultOperations.ts
      contract_function: aegisEngine.borrow

  error_handling:
    contract_errors:
      - error: VaultNotSolvent
        ui_message: "Vault LTV exceeds maximum allowed"
        recovery: "Add more collateral or reduce borrow amount"
    network_errors:
      - error: TransactionFailed
        ui_message: "Transaction failed"
        recovery: "Retry button shown"

  state_updates:
    optimistic:
      - slice: vault
        field: debtL
        calculation: "currentDebt + borrowAmount"
    confirmed:
      - source: contract_event
        event: VaultUpdated
        updates: [debtL, ltv, lastUpdated]

  recommendations:
    - issue: <description>
      suggestion: <action>
      priority: high | medium | low
```

## Usage

```bash
/analyze-vault-flow borrow
/analyze-vault-flow repay
/analyze-vault-flow deposit
/analyze-vault-flow withdraw
/analyze-vault-flow --all
```
