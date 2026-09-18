# Phase 2C Public-Testnet Protocol

## Purpose

The public-testnet experiment is a second empirical layer and must remain analytically separate from the controlled local Hardhat baseline.

The local benchmark measures contract execution in an in-process development network. The Sepolia experiment measures end-to-end transaction submission and one-confirmation receipt time under real public-testnet conditions.

## Security requirement

Use a **fresh testnet-only wallet**. Never use a production wallet, mainnet private key, exchange key or wallet containing real assets.

The private key must not be committed to this repository or pasted into source files.

Configure these GitHub Actions repository secrets:

- `SEPOLIA_RPC_URL`
- `SEPOLIA_PRIVATE_KEY`

The experiment wallet requires enough Sepolia test ETH for deployment, five role-grant transactions and the selected workflow transactions.

## Default scope

The default testnet run performs three repetitions. Each repetition executes:

1. registration submission;
2. survey verification;
3. administrative verification;
4. registration authorisation;
5. transfer submission;
6. transfer survey verification;
7. transfer administrative verification;
8. transfer authorisation;
9. correction;
10. dispute opening;
11. dispute resolution;
12. revocation.

This produces 36 measured workflow transactions for three repetitions, in addition to deployment and role setup.

## Role-separation limitation

For cost and secret-management simplicity, the public-testnet benchmark uses one experiment wallet that is granted all institutional roles.

This does **not** test organisational separation of duties. Role separation is already tested in the local automated suite. The Sepolia run is intended to measure public-network transaction characteristics.

## Measurements

For every measured transaction the experiment records:

- transaction hash;
- gas used;
- gas price;
- calculated transaction fee in wei;
- send-to-one-confirmation latency;
- block number;
- block timestamp;
- receipt status;
- event/log count.

The result metadata records the contract address, deployment transaction, wallet balance before and after the experiment, commit SHA and workflow run ID.

## Interpretation

Sepolia is a public test network, not a production land-registry environment. Results may vary materially with RPC provider performance, block timing, network demand and testnet conditions.

No Sepolia result should be represented as guaranteed Ethereum mainnet performance or as national land-registry service performance.
