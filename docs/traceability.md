# Manuscript-to-Implementation Traceability

| Manuscript concept | Implementation artefact | Planned evidence |
|---|---|---|
| authoritative registry remains legally controlling | role-gated final authorisation | access-control tests |
| wallet != land title | `holderIdHash` separate from signer address | source inspection + negative tests |
| tamper-evident source evidence | `sourceManifestHash` | document mutation verification |
| cadastral reference integrity | `spatialRefHash` + survey role | survey verification tests |
| append-only historical state | `versions[parcelId][version]` | version-history tests |
| correction without deletion | `applyCorrection()` creates new version | correction tests |
| dispute freeze | `openDispute()` / `resolveDispute()` | dispute tests |
| revocation | revocation version | revocation tests |
| separation of duties | registry / survey / authoriser roles | role-negative tests |
| reproducible evaluation | tagged source + test logs | experiment archive |
