# Phase 2C Experimental Methodology

## Objective

Phase 2C converts the validated smart-contract prototype into a reproducible experimental system. The purpose is to generate measured evidence for the manuscript without conflating local execution, public-network behaviour or real-world institutional performance.

## Experimental layers

### Layer A — controlled local baseline

The primary benchmark runs on the Hardhat local network with deterministic synthetic identifiers. Transactions are submitted serially so that each measured latency corresponds to one transaction send-and-confirm cycle.

Measured operations:

- registration submission;
- cadastral/survey verification;
- administrative verification;
- registration authorisation;
- transfer submission;
- transfer cadastral verification;
- transfer administrative verification;
- transfer authorisation;
- correction;
- dispute opening;
- dispute resolution;
- revocation.

For each measured transaction the harness records:

- gas used;
- wall-clock latency;
- block number;
- receipt status;
- transaction hash;
- emitted-log count;
- operation type;
- synthetic parcel/application identifiers.

### Layer B — public testnet experiment

A later phase will repeat a carefully selected subset of operations on an EVM public testnet. Those observations must be reported separately because public-testnet confirmation latency reflects network conditions as well as contract execution.

Local and public-testnet latency values must not be pooled.

## Repetitions

The default full local benchmark uses **30 repetitions per workflow item**. CI may use a smaller number for smoke validation.

The number of repetitions is recorded in every generated result file.

## Synthetic data

The dataset generator creates deterministic SHA-3/Keccak-based identifiers from fixed labels such as:

`SYNTH-PARCEL-000001`

and

`SYNTH-PARTY-000001`.

No name, address, government identifier or other real personal information is included.

Default dataset parameters:

- 1,000 synthetic parties;
- 10,000 synthetic parcels.

These figures are experimental workload parameters only and must not be reported as Nigerian land-registration statistics.

## Gas measurement

Gas consumption is taken from the transaction receipt:

`receipt.gasUsed`.

Gas is reported as execution consumption, not fiat or ETH cost. Any later monetary conversion must identify the gas price and token/fiat conversion source and timestamp.

## Latency measurement

For a transaction (i):

[
L_i = t_{confirmed,i} - t_{submitted,i}
]

The harness uses a monotonic high-resolution process clock around transaction submission and receipt confirmation.

Local Hardhat latency is a software/runner baseline. It is **not** evidence of public-chain confirmation speed or national-scale registry performance.

## Summary statistics

For each operation, Phase 2C reports:

- count;
- mean;
- median;
- population standard deviation;
- 95th percentile;
- minimum;
- maximum.

The same statistics are produced independently for gas and latency.

## Throughput

The harness reports:

[
T = \frac{N}{\Delta t}
]

where (N) is the number of measured serial transactions and (Delta t) is total harness runtime.

This value is labelled **serial harness throughput**. It must not be interpreted as maximum blockchain throughput.

## Deployment measurements

The experiment also records:

- deployment gas;
- deployment latency;
- runtime bytecode size;
- contract address;
- deployment transaction hash.

## Reproducibility metadata

Every result includes:

- Git commit SHA when available;
- GitHub Actions run ID when available;
- Node.js version;
- Hardhat version;
- OpenZeppelin Contracts version;
- configured Solidity compiler version;
- chain ID;
- operating platform;
- CPU model/count;
- memory;
- iteration count.

## Files produced

The benchmark writes:

- `experiments/results/benchmark-results.json`
- `experiments/results/benchmark-raw.csv`
- `experiments/results/benchmark-summary.csv`

The synthetic generator writes:

- `experiments/data/synthetic-parcels.csv`

Generated experiment data are uploaded as CI artifacts rather than committed as research claims.

## Research boundaries

Phase 2C can support claims about reproducible software behaviour in the specified environment.

It cannot by itself establish:

- legal validity;
- institutional adoption;
- national scalability;
- reduction in real-world fraud;
- user acceptance;
- production security;
- actual government processing time;
- financial or tax revenue outcomes.

Those require separate legal, institutional, field and security evaluation.
