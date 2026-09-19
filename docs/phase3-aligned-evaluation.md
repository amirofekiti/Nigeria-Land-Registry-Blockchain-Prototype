# Phase 3 Aligned Final-Code Evaluation

## Purpose

This record aligns the manuscript's reported performance results with the **post-Phase-2D remediated contract**.

The earlier Sepolia runs were executed before the application-existence refactor. They remain useful as development/pilot evidence, but the manuscript's primary public-testnet results use the final-code run below.

## Final-code local benchmark

- Main contract commit: `01c892a407b99f9d077c1f1537f58c162d4792a2`
- GitHub Actions run: `35313632744`
- Artifact ID: `10534522145`
- Artifact SHA-256: `b28f3b880599992bdb2044f3be77a6240e3bfa97516b5b49b2eb3745dc459d2e`
- 30 repetitions per 12 operation classes
- 360 measured state-changing transactions
- Deployment gas: **2,030,859**
- Runtime bytecode: **9,014 bytes**
- Local deployment latency: **9.182 ms**
- Serial harness rate: **483.96 tx/s**

The serial harness rate is a development-environment measurement and is not blockchain-network throughput.

## Final-code Sepolia benchmark

- Experiment commit: `ed468bd57807587da8a13d9d253f908a32e07588`
- GitHub Actions run: `35318140441`
- Artifact ID: `10537205807`
- Artifact SHA-256: `7808bda60d7235b450b48dcc04258c5507bd12c39e87a63e9fb5d9e0c7863f8d`
- Network: Ethereum Sepolia
- Chain ID: 11155111
- Contract: `0x60e23D1912B500d852B162B875a10d17aF829D41`
- Deployment transaction: `0x860ec0e2ea757fabd41935001fd4acadd59b8a052010bcd7d3f27fe3fe988cca`
- 10 repetitions per 12 operation classes
- 120 measured state-changing transactions
- Successful measured transactions: **120/120**
- Deployment gas: **2,030,859**
- Deployment one-confirmation latency: **12.532 s**
- Total measured workflow gas: **15,152,746**
- Mean gas per measured transaction: **126,272.9**
- Aggregate mean confirmation latency: **12.877 s**
- Aggregate median confirmation latency: **12.050 s**
- Aggregate p95 confirmation latency: **23.770 s**
- Minimum observed latency: **9.363 s**
- Maximum observed latency: **49.060 s**

## Operation-level Sepolia results

| Operation | Mean gas | Mean latency (s) | Median (s) | p95 (s) |
|---|---:|---:|---:|---:|
| registration.submit | 211,837.0 | 12.338 | 12.229 | 13.630 |
| registration.surveyVerify | 37,750.8 | 15.538 | 11.838 | 49.060 |
| registration.adminVerify | 37,814.8 | 11.597 | 11.266 | 13.123 |
| registration.authorise | 212,286.8 | 12.102 | 12.190 | 13.225 |
| transfer.submit | 217,854.2 | 11.920 | 11.716 | 13.179 |
| transfer.surveyVerify | 37,748.4 | 12.957 | 11.664 | 24.262 |
| transfer.adminVerify | 37,812.4 | 11.996 | 11.915 | 13.550 |
| transfer.authorise | 199,788.4 | 15.724 | 12.522 | 24.945 |
| correction.apply | 180,913.4 | 11.454 | 11.565 | 12.243 |
| dispute.open | 100,558.6 | 13.710 | 12.729 | 23.770 |
| dispute.resolve | 56,846.4 | 11.424 | 11.498 | 13.387 |
| revocation.apply | 184,063.4 | 13.768 | 12.856 | 24.039 |

## Interpretation

The aligned final-code measurements show that operation-level gas consumption is highly consistent between the controlled Hardhat and Sepolia environments. Public-testnet confirmation latency is instead dominated by network-inclusive effects and shows a longer tail.

These results support descriptive technical claims about the implemented artefact. They do not establish legal title validity, production security, national-scale throughput, field effectiveness, fraud reduction or institutional adoption.
