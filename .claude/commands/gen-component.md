---
name: gen-component
description: Generate AEGIS-specific React components with L-unit display and vault integration
agents: vault-ui-builder, web3-integrator
---

# Generate Component Command

Generate production-ready React components with AEGIS Protocol integrations.

## Component Templates

### 1. Vault Display Components

```bash
/gen-component VaultCard --type display
```

Generates a vault card with:

- L-unit formatted collateral/debt display
- LTV gauge visualization
- Health factor indicator
- Locked state warning

### 2. Vault Action Forms

```bash
/gen-component BorrowForm --type action
```

Generates action forms with:

- Amount input with L-unit formatting
- Max amount calculation and button
- LTV preview slider
- Error state handling
- Loading/confirming states

### 3. Data Visualization

```bash
/gen-component CollateralBreakdown --type visualization
```

Generates visualizations for:

- NFT position pie charts
- LTV history line charts
- Transaction history tables
- Utilization rate gauges

### 4. Connected Components

```bash
/gen-component VaultDashboard --type connected
```

Generates fully connected components with:

- wagmi hooks for contract reads
- Redux integration for state
- Apollo Client for subgraph data
- Real-time event subscriptions

## Component Specifications

### Props Interface Pattern

```typescript
interface ComponentNameProps {
  // Required data props
  vault: VaultPosition;
  market: MarketData;

  // Optional configuration
  showSymbol?: boolean;
  precision?: number;

  // Callbacks
  onAction?: (params: ActionParams) => Promise<void>;
  onError?: (error: AegisError) => void;
}
```

### Styling Guidelines

- Use Tailwind CSS utility classes
- Follow health state color palette:
  - Safe (green): LTV < 90% of max
  - Warning (yellow): LTV 90-98% of max
  - Danger (orange): LTV 98-99%
  - Critical (red): LTV >= 99%
- Responsive design with mobile-first approach

### Accessibility Requirements

- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader announcements for state changes
- Focus management for modals/dialogs

## Output Structure

```
src/components/vault/
├── ComponentName/
│   ├── index.ts           # Export barrel
│   ├── ComponentName.tsx  # Main component
│   ├── ComponentName.types.ts  # TypeScript interfaces
│   ├── ComponentName.hooks.ts  # Custom hooks
│   └── ComponentName.test.tsx  # Test file
```

## Usage Examples

```bash
# Generate a vault health display component
/gen-component VaultHealth --type display --features ltv,health-factor

# Generate a borrow form with validation
/gen-component BorrowForm --type action --validation max-ltv

# Generate a transaction history table
/gen-component TxHistory --type visualization --pagination infinite

# Generate a full vault dashboard
/gen-component VaultDashboard --type connected --features all
```

## Integration Points

### With Redux Store

```typescript
const vault = useSelector(selectVaultById(vaultId));
const market = useSelector(selectMarketByPool(vault.poolId));
const health = useSelector(selectVaultHealth(vaultId));
```

### With wagmi Hooks

```typescript
const { borrow, isPending, isConfirming } = useBorrow();
const { data: position } = useVaultPosition(vaultId);
```

### With Apollo Client

```typescript
const { data, loading } = useQuery(GET_VAULT_HISTORY, {
  variables: { vaultId },
});
```
