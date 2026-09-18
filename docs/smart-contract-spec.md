# Smart Contract Specification

## 1. Objective

The contract records authorised land-administration state transitions while preventing direct cryptocurrency-style transfer of land rights.

## 2. Roles

```text
DEFAULT_ADMIN_ROLE
REGISTRY_OFFICER_ROLE
SURVEYOR_ROLE
AUTHORISER_ROLE
DISPUTE_OFFICER_ROLE
CORRECTION_OFFICER_ROLE
```

### DEFAULT_ADMIN_ROLE
Manages roles and emergency pause.

### REGISTRY_OFFICER_ROLE
Creates sanitised registration/transfer applications and records administrative verification.

### SURVEYOR_ROLE
Records cadastral/spatial verification.

### AUTHORISER_ROLE
Creates final authoritative registration/transfer versions and can revoke a record.

### DISPUTE_OFFICER_ROLE
Opens and resolves dispute freezes.

### CORRECTION_OFFICER_ROLE
Creates superseding corrected versions after legal/administrative authority is established.

## 3. Core invariants

1. A parcel can only be registered once as an initial version.
2. A transfer cannot be finalised unless a current active parcel record exists.
3. A transfer cannot be finalised while the parcel is disputed.
4. A transfer cannot be finalised unless required verification flags are complete.
5. Only an `AUTHORISER_ROLE` account can create an initial or transfer authoritative version.
6. Only a `CORRECTION_OFFICER_ROLE` account can create a correction version.
7. Only a `DISPUTE_OFFICER_ROLE` account can freeze/unfreeze a parcel through dispute workflow.
8. A revoked record cannot be transferred.
9. Historical versions are never deleted.
10. No function permits arbitrary user-to-user legal-title transfer.
11. No personally identifiable information is intentionally stored in plaintext.
12. Zero identifiers/hashes are rejected where they represent mandatory evidence.

## 4. Deliberately excluded features

The prototype does **not** include:
- ERC-721 transfer functions
- token marketplace functions
- automatic tax seizure
- automatic court enforcement
- plaintext KYC data storage

These exclusions are deliberate design decisions.
