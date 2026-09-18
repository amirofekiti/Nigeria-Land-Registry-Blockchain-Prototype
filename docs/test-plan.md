# Evaluation and Test Plan

## 1. Research rule

The manuscript must report measured results, not estimates. Every empirical result should be reproducible from a tagged code version, configuration and dataset.

## 2. Functional tests

| ID | Test | Expected result |
|---|---|---|
| F01 | submit valid registration application | accepted |
| F02 | duplicate application ID | revert |
| F03 | registration for existing parcel | revert |
| F04 | survey verification by wrong role | revert |
| F05 | administrative verification by wrong role | revert |
| F06 | authorise without both verifications | revert |
| F07 | authorise valid registration | version 1 created |
| F08 | submit transfer for unknown parcel | revert |
| F09 | submit transfer for active parcel | accepted |
| F10 | authorise valid transfer | version n+1 created |
| F11 | historical version remains queryable | true |
| F12 | open dispute | parcel frozen operationally |
| F13 | transfer while disputed | revert |
| F14 | resolve dispute | transfer eligibility restored |
| F15 | apply authorised correction | new version created |
| F16 | correction by unauthorised actor | revert |
| F17 | revoke active parcel | revocation version created |
| F18 | transfer revoked parcel | revert |
| F19 | pause system | state-changing operations blocked |
| F20 | unpause system | operations restored |

## 3. Security tests
- role escalation attempt
- role revocation then action attempt
- zero-value identifier/hash injection
- repeated authorisation
- replay of application ID
- stale transfer application after a newer parcel version
- dispute race-condition scenario
- correction after transfer
- revocation after dispute resolution
- event-to-state consistency

## 4. State invariants

### I1
`currentVersion(parcelId)` never decreases.

### I2
For every `currentVersion = n`, all versions `1..n` remain queryable.

### I3
A current revoked state cannot transition via ordinary transfer.

### I4
An active dispute blocks ordinary transfer finalisation.

### I5
Only authorised roles create authoritative versions.

## 5. Performance experiments

Run each operation repeatedly in a controlled environment and report:
- transaction latency
- gas used
- contract bytecode size
- event count/payload
- throughput under controlled load
- storage growth per parcel version

Report mean, median, standard deviation, p95, minimum and maximum together with compiler version, optimizer settings, exact git commit and network configuration.

## 6. Synthetic evaluation dataset

Use no real citizen data.

Initial workload target:
- 1,000 synthetic parties
- 10,000 synthetic parcels
- 5,000 registrations
- 3,000 transfers
- 500 corrections
- 200 disputes
- 100 revocations

These are workload parameters, not claims about Nigerian land transactions.
