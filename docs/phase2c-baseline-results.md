# Phase 2C Controlled Local Baseline Results

## Validated run

The controlled local benchmark was executed in GitHub Actions on commit:

`666e6dee93547562d62aabc8f73ec3b44b56aa45`

Workflow run:

`35304389120`

Artifact:

`phase2c-experiment-35304389120`

Artifact ID:

`10531182482`

Artifact digest:

`sha256:b3d6293ac26e0349b2dcc68415056e69ed9c3334a79bd5397e9c1ec2924ecf29`

The artifact contains the raw CSV transaction log, summary CSV, benchmark JSON and deterministic synthetic dataset.

## Environment

- Network: Hardhat local network
- Chain ID: 31337
- Repetitions per workflow item: 30
- Total measured transactions: 360
- Node.js: 20.20.2
- Hardhat: 2.28.0
- OpenZeppelin Contracts: 5.6.1
- Solidity configuration: 0.8.37
- Runner OS: Linux x64
- Runner CPU: Intel Xeon Platinum 8573C, 4 vCPUs
- Synthetic parties: 1,000
- Synthetic parcels generated: 10,000
- Real personal data: none

## Deployment

| Measure | Result |
|---|---:|
| Deployment gas | 2,031,507 |
| Deployment wall-clock latency | 9.293 ms |
| Runtime bytecode size | 9,017 bytes |

## Transaction results

The table reports mean gas consumption, mean local wall-clock send-and-confirm latency, and p95 local latency for 30 repetitions of each operation.

| Operation | Mean gas | Mean latency (ms) | p95 latency (ms) |
|---|---:|---:|---:|
| Registration submission | 189,651.8 | 1.461 | 2.319 |
| Registration survey verification | 35,726.6 | 1.211 | 1.848 |
| Registration administrative verification | 35,790.6 | 1.203 | 1.788 |
| Registration authorisation | 210,277.6 | 1.412 | 1.974 |
| Transfer submission | 195,684.2 | 1.389 | 1.907 |
| Transfer survey verification | 35,724.6 | 1.110 | 1.470 |
| Transfer administrative verification | 35,788.6 | 1.114 | 1.298 |
| Transfer authorisation | 197,779.6 | 1.297 | 1.404 |
| Correction | 180,928.8 | 1.451 | 1.939 |
| Dispute opening | 100,557.4 | 1.108 | 1.375 |
| Dispute resolution | 56,846.4 | 1.023 | 1.169 |
| Revocation | 184,076.4 | 1.429 | 2.180 |

## Aggregate harness result

The serial benchmark processed 360 measured transactions in 634.826 ms, corresponding to a calculated serial harness rate of approximately 567.1 transactions per second.

This is **not a blockchain network throughput claim**. It describes the specific Hardhat in-process benchmark harness on the recorded GitHub Actions runner. Public testnet or production confirmation times will include network propagation, validator/block timing, congestion and infrastructure effects that are absent from this local baseline.

## Initial technical observations

The most gas-intensive measured state-transition operations were registration authorisation and transfer authorisation, followed by transfer submission, registration submission, revocation and correction. Verification operations required substantially less gas than new authoritative-version creation.

The low local latencies primarily show that the contract functions execute without an obvious computational bottleneck in the controlled development environment. They do not demonstrate acceptable national-scale operational latency.

Gas measurements were highly stable across repetitions because the experiment used deterministic workflows and equivalent state shapes. Small variation arises from calldata values and state conditions.

## Research interpretation

The Phase 2C baseline supports a limited empirical claim:

> Under a controlled local Hardhat environment, the implemented workflow completed 360 serial state-changing transactions across registration, transfer, correction, dispute and revocation operations without benchmark failure, while producing operation-specific gas and latency measurements.

It does not establish legal validity, production security, public-network scalability, real-world fraud reduction, institutional adoption or citizen-level performance.

## Next empirical layer

The next technical experiment should execute a selected subset of workflow operations on a public EVM testnet and report those measurements separately from this local baseline. A subsequent security-analysis stage should also add static analysis, fuzz/property testing and explicit adversarial scenarios before any claim of production suitability.
