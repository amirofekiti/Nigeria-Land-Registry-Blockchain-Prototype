# Phase 2D Security Evaluation Results

## Status

Phase 2D security evaluation completed successfully on commit:

`72278f63df1a4b281cbf0cfffe73763f3ecc56b7`

GitHub Actions security run:

`35313424932`

## Security methods

Phase 2D combined:

1. deterministic property-based/invariant testing with `fast-check`;
2. Slither static analysis;
3. remediation and re-analysis of findings.

## Property/invariant testing

Configuration:

- fast-check: 4.10.1
- seed: 20260918
- principal generated runs per property: 100
- generated dispute-freeze runs: 60
- execution environment: Hardhat local network

All three property groups passed:

| Property | Result |
|---|---|
| generated valid state-transition sequences preserve append-only monotonic history | PASS |
| stale transfer authorisation is rejected after generated intervening state changes | PASS |
| active dispute prevents generated transfer/correction/revocation operations without changing parcel version | PASS |

Execution summary:

- **3 property tests passing**
- deterministic seed recorded for reproducibility
- no counterexample was found in the configured generated cases

### What the properties exercised

The generated state-machine sequences combined:

- registration;
- transfer;
- correction;
- dispute opening;
- dispute resolution;
- optional revocation.

The suite repeatedly checked:

- current-version monotonicity;
- preservation and readability of every historical parcel version;
- agreement between the current pointer and latest historical version;
- no version change during dispute open/resolve cycles;
- exactly one version increment for valid transfer/correction transitions;
- inability to transfer or correct a revoked record;
- rejection of stale transfer applications after any generated intervening correction/transfer;
- dispute freeze persistence during prohibited operations.

## Static analysis

Tool:

- Slither 0.11.6
- 102 detectors evaluated by Slither across the compiled project/dependency graph
- dependency detector output excluded from project findings

### Initial analysis

The first security run identified:

- **1 Medium** finding: `incorrect-equality`
- **1 Low** finding associated with the same application-status comparison

The Medium finding concerned using:

`application.status == ApplicationStatus.None`

as the existence test for an application.

Rather than suppressing the detector, the contract was refactored.

### Remediation

Application existence is now represented independently:

`mapping(bytes32 => bool) private _applicationExists;`

The application status enum remains responsible only for lifecycle state.

This separates two concepts:

- whether an application exists; and
- what state an existing application is in.

The refactor also makes application-ID reuse checks explicit.

### Final Slither result

After remediation, Slither reported:

> `. analyzed (7 contracts with 102 detectors), 0 result(s) found`

The configured High/Medium security gate passed.

Final Slither artifact:

- Artifact ID: `10533772489`
- Artifact SHA-256: `2261ea0a716bc16ed369ab7aafe2cd004325e3c678930d23be75ad86346d0b52`

## Security interpretation

The Phase 2D evidence supports the bounded statement that:

> The implemented prototype passed deterministic model/property tests for core registry-state invariants and produced no Slither detector findings in the final static-analysis run after remediation of the initial application-existence finding.

This must **not** be restated as:

> "The smart contract is secure" or "the contract has no vulnerabilities."

Static analysis and generated tests cover only the behaviours and detector classes exercised by those methods.

## Residual security limitations

The evaluation does not replace:

- independent professional smart-contract audit;
- formal verification;
- endpoint/API penetration testing;
- validator/node security assessment;
- HSM and key-custody review;
- compromise of identity/KYC systems;
- cross-role insider collusion;
- off-chain storage security;
- organisational access-control review;
- denial-of-service and infrastructure-resilience evaluation;
- legal or institutional review.

## Manuscript-safe wording

The manuscript may state:

> Security-oriented evaluation combined deterministic property-based state-machine testing with Slither static analysis. One initial Medium-severity static-analysis finding concerning the use of an enum value as an application-existence check was remediated by separating existence state from lifecycle status. Re-analysis produced no Slither detector findings. Property tests using a fixed reproducible seed exercised generated sequences of transfers, corrections, disputes and revocation, with no counterexample observed for the tested version-history, stale-transaction and dispute-freeze invariants.

The manuscript should additionally disclose the tool versions, seed, number of generated runs and limitations.
