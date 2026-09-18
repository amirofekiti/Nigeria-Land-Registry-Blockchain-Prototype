# Data Model

## 1. Objective

The prototype separates legal identity, blockchain authentication, parcel identity, evidential source data and authoritative registry state.

## 2. Core entities

### Application
Represents a pending registration or transfer workflow.

Fields:
- `applicationType`
- `status`
- `parcelId`
- `proposedHolderIdHash`
- `sourceManifestHash`
- `spatialRefHash`
- `basedOnVersion`
- `submittedAt`
- `submittedBy`
- `surveyVerified`
- `administrativeVerified`

### ParcelVersion
Represents one immutable historical registry state.

Fields:
- `version`
- `holderIdHash`
- `sourceManifestHash`
- `spatialRefHash`
- `changeReasonHash`
- `effectiveAt`
- `versionType`
- `recordState`
- `originatingApplicationId`

### Dispute
Represents an operational freeze and its resolution evidence.

## 3. Identity separation

The blockchain signer authenticates an institutional actor. It is not treated as the legal holder.

```text
wallet address != legal ownership
holderIdHash  -> pseudonymous reference to authoritative identity record
```

## 4. LADM-informed mapping

The prototype is LADM-informed rather than a complete Nigerian LADM country profile.

| Prototype concept | LADM-related concept |
|---|---|
| holderIdHash | Party reference |
| parcelId | Spatial Unit / BAUnit reference |
| sourceManifestHash | Source |
| active/revoked state | RRR / administrative state |
| version history | Versioned object behaviour |

## 5. Version model

If parcel P has current version n, a lawful change produces n+1. Prior versions remain queryable.

```text
P:v1 -> P:v2 -> P:v3
```

No historical version is silently overwritten.
