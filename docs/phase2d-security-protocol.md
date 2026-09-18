# Phase 2D Security Evaluation Protocol

## Purpose

Phase 2D adds security-oriented evidence before the prototype is described as an evaluated research artefact.

The phase combines:

1. deterministic property-based and invariant testing; and
2. Slither static analysis.

These methods complement, but do not replace, professional smart-contract audit, formal verification, penetration testing, operational key-management assessment or institutional security review.

## Property-based testing

The JavaScript property suite uses `fast-check` with a fixed seed and 100 generated runs for the two principal state-machine properties.

Default reproducibility parameters:

- `FC_SEED=20260918`
- `FC_NUM_RUNS=100`

### P1 — append-only monotonic history

Generated sequences contain transfers, corrections and dispute open/resolve cycles.

The property checks that:

- `currentVersion` never decreases;
- every historical version from 1 to the current version remains queryable;
- stored version numbers match their history index;
- dispute cycles do not change the authoritative version;
- valid transfer/correction transitions increment version exactly once;
- current parcel state equals the latest version;
- optional revocation creates one additional version;
- revoked records reject ordinary transfer and correction.

### P2 — stale-authorisation rejection

A transfer application is prepared against an existing parcel version. One or more generated intervening transfers/corrections then change the authoritative version.

The property requires the original transfer to fail with `StaleApplication`.

This checks the optimistic-concurrency control represented by `basedOnVersion`.

### P3 — dispute freeze invariant

Generated attempts to transfer, correct or revoke a disputed parcel must fail while:

- the dispute remains active; and
- the authoritative parcel version remains unchanged.

## Static analysis

Slither 0.11.6 is run against the Hardhat project with dependencies excluded from detector output.

The CI gate:

- fails if Slither itself cannot produce a valid report;
- fails on any **High** or **Medium** detector finding;
- records Low/Informational/Optimization findings for manual triage.

A passing gate must not be interpreted as proof that the contract is vulnerability-free.

## Threat classes covered

Phase 2D principally tests:

- unauthorised state transition;
- state-history corruption;
- stale transaction authorisation;
- dispute-lock bypass;
- invalid post-revocation transition;
- unexpected generated transition ordering;
- static-analysis patterns associated with common Solidity weaknesses.

## Threat classes outside this phase

Not fully covered:

- compromised government identity systems;
- compromised validator infrastructure;
- endpoint/API security;
- malicious RPC providers;
- HSM/key custody;
- social engineering;
- insider collusion across authorised roles;
- business-process fraud before data enters the contract;
- vulnerabilities in off-chain document storage;
- legal validity of administrative actions.

These limitations must remain explicit in the manuscript.
