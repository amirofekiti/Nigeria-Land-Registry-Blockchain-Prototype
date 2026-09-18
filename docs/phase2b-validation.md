# Phase 2B Validation Report

## Scope

Phase 2B expands the initial prototype validation from basic happy-path checks to functional, negative, role-based, state-transition and audit-consistency tests.

Validated branch: `phase2-implementation`

## CI environment

- GitHub Actions workflow: `Phase 2 CI`
- Solidity compiler: `0.8.37`
- Hardhat: `2.28.0`
- OpenZeppelin Contracts: `5.6.1`
- Node.js used by project workflow: `20.20.2` in the validated run
- Optimizer: enabled, 200 runs

An earlier CI attempt exposed a peer-dependency conflict because Hardhat 2.22.19 was below the version required by the installed Hardhat ethers plugin. The project dependency was corrected to Hardhat 2.28.0 before Phase 2B validation.

## Final Phase 2B result

Final tested code includes an explicit `ApplicationRejected` event so rejected applications are represented in the audit event stream.

GitHub Actions results for the final Phase 2B head:

- push workflow run `35302830944`: **PASS**
- pull-request workflow run `35302833715`: **PASS**
- Solidity compilation: **PASS**
- automated test suite: **26 passing, 0 failing**

## Validated behaviours

The suite verifies:

- registration requires both cadastral and administrative verification;
- unauthorised actors cannot submit, verify, authorise or correct records;
- duplicate application IDs are rejected;
- an already registered parcel cannot receive a second initial registration;
- competing pending claims cannot both become authoritative;
- mandatory zero identifiers and evidence hashes are rejected;
- approved and rejected applications cannot be re-authorised;
- unknown parcels cannot be transferred;
- transfers create new versions without deleting prior versions;
- stale transfer applications are rejected after an intervening authoritative change;
- parcel version numbers remain monotonic;
- active disputes freeze transfer, correction and revocation workflows;
- duplicate dispute opening and invalid resolution are rejected;
- corrections create superseding versions and preserve historical records;
- revocation creates a new version and prevents ordinary transfer/correction afterwards;
- role revocation takes effect immediately;
- emergency pause blocks state-changing application submission;
- authorisation event data is consistent with stored authoritative state;
- invalid application and parcel-version reads revert;
- application rejection creates an auditable event.

## Research interpretation

These tests demonstrate implementation consistency with the defined prototype rules. They do **not** establish legal validity, production security, real-world fraud reduction, operational scalability or institutional fitness. Those claims require later experimental and field evaluation.

## Next validation stage

Phase 2C should introduce reproducible experimental instrumentation for gas usage, latency, storage growth and controlled synthetic workload testing, followed by a tagged research release.
