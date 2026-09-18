# Security Model

## 1. Objective

The security model distinguishes between integrity threats, identity threats, insider abuse, workflow bypass and privacy leakage.

## 2. Threats and controls

### T1 — forged source document
Control: authoritative off-chain verification plus on-chain hash commitment.

### T2 — bad data entered by authorised staff
Control: separation of duties and multi-stage approval. Blockchain cannot determine truth automatically.

### T3 — wallet/private-key compromise
Control: wallet is not the land right; high-risk state changes still require institutional roles and workflow approval.

### T4 — unauthorised administrative action
Control: OpenZeppelin AccessControl roles.

### T5 — silent historical record alteration
Control: append-only version history and event trail.

### T6 — duplicate registration
Control: parcel can only receive one initial authoritative version.

### T7 — stale transfer
Control: transfer application stores `basedOnVersion`; authorisation rejects if the authoritative parcel version has changed.

### T8 — transfer during litigation/dispute
Control: active dispute freeze.

### T9 — key loss
Control: legal right is referenced by `holderIdHash`, not held by a transferable token. Institutional identity recovery can re-bind application access without changing the legal record.

### T10 — smart contract defect
Control: unit tests, negative tests, fuzzing, static analysis, external review before any non-research deployment.

### T11 — validator collusion
Control: institutional governance, independent validator operators, external public anchoring as optional additional control.

### T12 — privacy leakage
Control: no direct PII on-chain, pseudonymous identifiers, encrypted off-chain storage, data minimisation.

## 3. Security properties to test
- access-control correctness
- state-machine correctness
- rejection of duplicate IDs
- inability to bypass verification
- inability to transfer frozen/revoked parcel
- event completeness
- version monotonicity
- hash persistence
- pause effectiveness
- role revocation effectiveness

## 4. Production controls outside Solidity
- HSM or enterprise key management
- MFA for institutional operators
- API-layer audit logging
- database access controls
- backup and recovery
- DPIA and privacy governance
- penetration testing
- legal change-management
- incident response
