/**
 * @solo-labs/protocol-knowledge
 *
 * Embedded domain knowledge for AEGIS protocol agents.
 * This package provides structured documentation about AEGIS concepts,
 * patterns, and common gotchas for use by AI agents.
 *
 * Knowledge Categories:
 * - concepts/ - Core protocol concepts (L-units, sqrt(K), PIPS, etc.)
 * - patterns/ - Implementation patterns (vault ops, keeper flows, etc.)
 * - gotchas/ - Common mistakes and how to avoid them
 */

export const concepts = {
  'l-units': './concepts/l-units.md',
  'sqrt-k-floor': './concepts/sqrt-k-floor.md',
  'two-phase-execution': './concepts/two-phase-execution.md',
  'transient-storage': './concepts/transient-storage.md',
  'pips': './concepts/pips.md',
  'v4-hooks': './concepts/v4-hooks.md',
} as const;

export const patterns = {
  'vault-operations': './patterns/vault-operations.md',
  'keeper-flows': './patterns/keeper-flows.md',
  'collateral-management': './patterns/collateral-management.md',
  'fee-accrual': './patterns/fee-accrual.md',
  'session-lifecycle': './patterns/session-lifecycle.md',
} as const;

export const gotchas = {
  'equity-neutrality': './gotchas/equity-neutrality.md',
  'precision-errors': './gotchas/precision-errors.md',
  'reentrancy-risks': './gotchas/reentrancy-risks.md',
  'assemblyscript-quirks': './gotchas/assemblyscript-quirks.md',
} as const;

export type ConceptName = keyof typeof concepts;
export type PatternName = keyof typeof patterns;
export type GotchaName = keyof typeof gotchas;

/**
 * All knowledge documents indexed by category
 */
export const knowledge = {
  concepts,
  patterns,
  gotchas,
} as const;

export default knowledge;
