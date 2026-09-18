# Phase 2C Sepolia Public-Testnet Results

## Experiment provenance

The public-testnet experiment was executed successfully on Ethereum Sepolia using the Phase 2C benchmark harness.

- Network: **Sepolia**
- Chain ID: **11155111**
- Git commit: `4d608b3734979cdd896912513c384b1802390634`
- GitHub Actions run: `35309511559`
- Repetitions per workflow: **3**
- Measured workflow transactions: **36**
- Local validation suite before deployment: **PASS**
- Real personal data used: **none**
- Contract address: `0x656D17Eb5e0B01ECE07544DE576e7eFd47C4ee00`
- Deployment transaction: `0x459ebe9d8dd48de9637ac7b018f7136ebc7a6d4d8157d6cdd2dded5ad8b0fb44`
- Experiment artifact: `phase2c-sepolia-35309511559`
- Artifact ID: `10533311349`
- Artifact SHA-256: `7f94a14e4130c299d5f247b42f84b868d11049e559b6e269e35724cabd2781c6`

Explorer links:

- https://sepolia.etherscan.io/address/0x656D17Eb5e0B01ECE07544DE576e7eFd47C4ee00
- https://sepolia.etherscan.io/tx/0x459ebe9d8dd48de9637ac7b018f7136ebc7a6d4d8157d6cdd2dded5ad8b0fb44

## Software environment

- Node.js: **20.20.2**
- Hardhat: **2.28.0**
- OpenZeppelin Contracts: **5.6.1**
- Solidity configuration: **0.8.37**

## Deployment result

| Measure | Result |
|---|---:|
| Deployment gas | 2,031,507 |
| Time to one-confirmation receipt | 6,354.583 ms |
| Testnet experiment wallet starting balance | 9.547096269240456871 ETH |
| Testnet experiment wallet final balance | 9.539829564968707368 ETH |
| Approximate total experiment spend | 0.007266704271749503 Sepolia ETH |

The reported wallet spend covers the experiment session, including deployment and role setup as well as measured workflow transactions. Sepolia ETH has no production monetary value and must not be treated as a real-world operating-cost estimate.

## Measured workflow results

Each workflow operation below was executed three times. Latency is end-to-end transaction submission to a one-confirmation receipt on Sepolia.

| Operation | Mean gas | Mean latency (s) | Median latency (s) | p95 latency (s) |
|---|---:|---:|---:|---:|
| Registration submission | 189,657 | 12.001 | 11.927 | 12.372 |
| Registration survey verification | 35,727 | 11.359 | 11.350 | 12.126 |
| Registration administrative verification | 35,791 | 16.486 | 13.297 | 23.785 |
| Registration authorisation | 210,278 | 11.971 | 12.165 | 12.198 |
| Transfer submission | 195,687 | 11.614 | 11.206 | 12.815 |
| Transfer survey verification | 35,723 | 11.228 | 11.530 | 11.796 |
| Transfer administrative verification | 35,787 | 12.414 | 12.005 | 13.323 |
| Transfer authorisation | 197,778 | 12.215 | 13.052 | 13.393 |
| Correction | 180,922 | 12.311 | 12.403 | 12.629 |
| Dispute opening | 100,561 | 11.924 | 11.962 | 12.022 |
| Dispute resolution | 56,846 | 11.821 | 11.963 | 11.984 |
| Revocation | 184,078 | 12.152 | 12.185 | 12.378 |

Across the twelve operation classes, the arithmetic mean of the operation-level mean confirmation latencies was approximately **12.29 seconds**. This is a descriptive summary of this small testnet run, not a general Sepolia service-level claim.

## Comparison with the controlled local baseline

The local Hardhat experiment and the Sepolia experiment answer different questions.

The local baseline measures contract execution and harness overhead in an in-process development environment. The Sepolia run measures network-inclusive time from transaction submission to one confirmation. Gas consumption remained close to the local measurements because the contract logic and state transitions were the same, while latency increased from approximately millisecond-scale local execution to roughly twelve-second public-testnet confirmation intervals.

This difference should not be interpreted as the contract becoming computationally slower by the same factor. Most of the Sepolia latency is attributable to public-network transaction inclusion and confirmation behaviour, RPC interaction and block timing rather than Solidity execution time.

## Observed variation

Most transaction types completed near the prevailing Sepolia block interval during this experiment. The largest latency observation occurred in administrative registration verification, with a maximum of approximately **23.785 seconds**. With only three repetitions per operation, this observation demonstrates network variability but is insufficient for strong distributional inference.

For that reason, the reported mean, median and p95 values should be described as pilot measurements. A larger public-testnet repetition count would be needed before making stronger statistical claims about confirmation-latency distributions.

## Gas consistency

Measured Sepolia gas usage was highly consistent with the controlled local benchmark. Examples include:

- registration authorisation: approximately **210,278 gas**;
- transfer authorisation: approximately **197,778 gas**;
- correction: approximately **180,922 gas**;
- revocation: approximately **184,078 gas**;
- dispute resolution: approximately **56,846 gas**.

This supports the narrower claim that the implemented state-transition logic produces reproducible gas-consumption characteristics across the tested EVM environments.

## Research interpretation

The experiment supports the following bounded statement:

> The prototype was successfully deployed to Ethereum Sepolia and completed 36 measured state-changing workflow transactions covering registration, verification, authorisation, transfer, correction, dispute and revocation operations. All measured transactions completed successfully. Operation-specific gas consumption remained consistent with the controlled local baseline, while end-to-end one-confirmation latency on Sepolia was predominantly on the order of seconds rather than milliseconds.

The experiment does **not** establish:

- legal validity of blockchain records as Nigerian land title;
- production-system security;
- national-scale throughput;
- guaranteed Ethereum mainnet performance;
- real-world land-registry processing time;
- fraud reduction;
- citizen adoption;
- institutional acceptance;
- tax or government-revenue improvement.

## Methodological limitation

For this public-testnet performance experiment, one dedicated testnet wallet was granted all prototype institutional roles. This reduced testnet funding and secret-management complexity but does not simulate organisational separation of duties. Role separation and unauthorised-action resistance are instead validated by the automated local test suite.

## Data retention

The GitHub Actions artifact contains:

- `testnet-results.json`
- `testnet-raw.csv`

The recorded SHA-256 digest permits later integrity checking of the archived experiment artifact. The manuscript should cite the exact commit, workflow run, contract address and artifact digest used for the reported results.
