# Phase 2C Closeout — 10-Repetition Sepolia Experiment

## Status

Phase 2C is complete.

The final public-testnet experiment executed **10 repetitions of each of 12 workflow operations**, producing **120 measured Sepolia transactions** after successful compilation and local validation.

## Provenance

- Network: Ethereum Sepolia
- Chain ID: 11155111
- Experiment commit: `76d1f1a06322dd5cd7760af10253d8c0df125ad4`
- GitHub Actions run: `35310676524`
- Artifact ID: `10534325697`
- Artifact SHA-256: `15294c3d7e6cedcd57ec29af46fa987aca25eaa6cd98ceb7b1cb229726bbf7cd`
- Contract address: `0xbf99988e2434943A1829fC5D6db825AEe716A7a9`
- Deployment transaction: `0x245f25be60c780df1eb355e904d2642f6dc11af9f20d612e0b54703e73c93aa8`
- Real personal data used: none

Explorer:
- https://sepolia.etherscan.io/address/0xbf99988e2434943A1829fC5D6db825AEe716A7a9
- https://sepolia.etherscan.io/tx/0x245f25be60c780df1eb355e904d2642f6dc11af9f20d612e0b54703e73c93aa8

## Environment

- Node.js 20.20.2
- Hardhat 2.28.0
- OpenZeppelin Contracts 5.6.1
- Solidity 0.8.37

## Deployment

| Measure | Result |
|---|---:|
| Deployment gas | 2,031,507 |
| Deployment confirmation latency | 14.729 s |
| Approximate test-wallet spend for session | 0.021933293172829889 Sepolia ETH |

Sepolia ETH is test-network currency and is not a real-world operating-cost estimate.

## 120-transaction aggregate

| Measure | Result |
|---|---:|
| Successful measured transactions | 120 / 120 |
| Total measured gas | 14,588,306 |
| Mean gas per measured transaction | 121,569.2 |
| Median gas | 140,731.5 |
| Mean confirmation latency | 12.830 s |
| Median confirmation latency | 11.974 s |
| Overall p95 confirmation latency | 23.187 s |
| Minimum confirmation latency | 10.506 s |
| Maximum confirmation latency | 35.503 s |

The overall latency statistics aggregate different workflow operations and are therefore descriptive rather than operation-specific performance guarantees.

## Operation-level results

| Operation | Mean gas | Mean latency (s) | Median latency (s) | p95 latency (s) |
|---|---:|---:|---:|---:|
| Registration submission | 189,651.0 | 11.652 | 11.588 | 12.682 |
| Registration survey verification | 35,725.8 | 12.284 | 12.439 | 13.065 |
| Registration administrative verification | 35,789.8 | 14.322 | 12.076 | 24.151 |
| Registration authorisation | 210,276.8 | 13.146 | 12.035 | 24.781 |
| Transfer submission | 195,686.2 | 12.228 | 12.031 | 13.834 |
| Transfer survey verification | 35,723.4 | 11.723 | 11.824 | 12.349 |
| Transfer administrative verification | 35,787.4 | 13.255 | 12.217 | 24.969 |
| Transfer authorisation | 197,778.4 | 15.237 | 12.111 | 35.503 |
| Correction | 180,928.4 | 12.931 | 11.797 | 23.138 |
| Dispute opening | 100,558.6 | 11.602 | 11.549 | 13.021 |
| Dispute resolution | 56,846.4 | 12.200 | 12.249 | 13.468 |
| Revocation | 184,078.4 | 13.385 | 11.954 | 24.527 |

## Interpretation

The 10-repetition run confirms that the implemented workflows are executable on a public EVM test network and that the gas characteristics observed locally are reproducible on Sepolia.

The latency results also demonstrate why network-inclusive confirmation performance must be treated separately from local execution. Most transaction medians were close to twelve seconds, while several operations contained longer confirmation observations. The maximum observed transaction latency was approximately 35.5 seconds.

The experiment supports descriptive pilot-performance claims only. Ten repetitions per operation are sufficient for a more defensible descriptive dataset than the earlier three-repetition pilot, but they remain insufficient for strong inferential claims about long-run Sepolia latency distributions or production service levels.

## Phase 2C evidence hierarchy

For the manuscript:

1. **Primary public-testnet dataset:** this 10-repetition, 120-transaction Sepolia run.
2. **Reproducibility/pilot dataset:** earlier three-repetition, 36-transaction Sepolia run.
3. **Controlled execution baseline:** 30-repetition local Hardhat experiment, 360 measured transactions.
4. **Functional validation:** automated Phase 2B suite, 26 passing tests.

## Boundaries

Phase 2C does not establish:
- legal recognition of the blockchain record as Nigerian land title;
- production security;
- national-scale throughput;
- fraud-reduction effectiveness;
- institutional or citizen adoption;
- real land-registry processing time;
- production financial cost.

Those questions require security, legal, institutional and field evaluation beyond Phase 2C.

## Next phase

Phase 2D performs security-oriented static analysis and property/invariant testing before the manuscript is reconstructed around the implemented and measured artefact.
