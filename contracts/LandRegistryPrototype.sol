// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LandRegistryPrototype
 * @notice Research prototype for a hybrid blockchain-assisted land-administration workflow.
 *
 * This contract does not create legal title. Wallet possession does not represent
 * property ownership. The competent off-chain registry remains the source of legal
 * authority. Sensitive documents and personal information must remain off-chain.
 */
contract LandRegistryPrototype is AccessControl, Pausable {
    bytes32 public constant REGISTRY_OFFICER_ROLE = keccak256("REGISTRY_OFFICER_ROLE");
    bytes32 public constant SURVEYOR_ROLE = keccak256("SURVEYOR_ROLE");
    bytes32 public constant AUTHORISER_ROLE = keccak256("AUTHORISER_ROLE");
    bytes32 public constant DISPUTE_OFFICER_ROLE = keccak256("DISPUTE_OFFICER_ROLE");
    bytes32 public constant CORRECTION_OFFICER_ROLE = keccak256("CORRECTION_OFFICER_ROLE");

    enum ApplicationType { Registration, Transfer }
    enum ApplicationStatus { None, Submitted, Approved, Rejected }
    enum VersionType { Registration, Transfer, Correction, Revocation }
    enum RecordState { Active, Revoked }

    struct Application {
        ApplicationType applicationType;
        ApplicationStatus status;
        bytes32 parcelId;
        bytes32 proposedHolderIdHash;
        bytes32 sourceManifestHash;
        bytes32 spatialRefHash;
        uint64 basedOnVersion;
        uint64 submittedAt;
        address submittedBy;
        bool surveyVerified;
        bool administrativeVerified;
    }

    struct ParcelVersion {
        uint64 version;
        bytes32 holderIdHash;
        bytes32 sourceManifestHash;
        bytes32 spatialRefHash;
        bytes32 changeReasonHash;
        uint64 effectiveAt;
        VersionType versionType;
        RecordState recordState;
        bytes32 originatingApplicationId;
    }

    struct Dispute {
        bool active;
        bytes32 caseHash;
        bytes32 resolutionHash;
        uint64 openedAt;
        uint64 resolvedAt;
    }

    mapping(bytes32 => Application) private _applications;
    mapping(bytes32 => bool) private _applicationExists;
    mapping(bytes32 => uint64) private _currentVersion;
    mapping(bytes32 => mapping(uint64 => ParcelVersion)) private _versions;
    mapping(bytes32 => Dispute) private _disputes;

    event ApplicationSubmitted(
        bytes32 indexed applicationId,
        bytes32 indexed parcelId,
        ApplicationType applicationType,
        uint64 basedOnVersion,
        address indexed submittedBy
    );
    event SurveyVerified(bytes32 indexed applicationId, address indexed verifiedBy, uint64 verifiedAt);
    event AdministrativeVerified(bytes32 indexed applicationId, address indexed verifiedBy, uint64 verifiedAt);
    event ApplicationAuthorised(
        bytes32 indexed applicationId,
        bytes32 indexed parcelId,
        uint64 newVersion,
        address indexed authorisedBy
    );
    event ApplicationRejected(
        bytes32 indexed applicationId,
        bytes32 indexed parcelId,
        address indexed rejectedBy,
        uint64 rejectedAt
    );
    event ParcelVersionCreated(
        bytes32 indexed parcelId,
        uint64 indexed version,
        VersionType versionType,
        RecordState recordState,
        bytes32 holderIdHash,
        bytes32 sourceManifestHash,
        bytes32 spatialRefHash,
        bytes32 changeReasonHash,
        bytes32 originatingApplicationId,
        uint64 effectiveAt
    );
    event CorrectionApplied(bytes32 indexed parcelId, uint64 indexed newVersion, bytes32 indexed reasonHash, address correctedBy);
    event ParcelRevoked(bytes32 indexed parcelId, uint64 indexed newVersion, bytes32 indexed reasonHash, address revokedBy);
    event DisputeOpened(bytes32 indexed parcelId, bytes32 indexed caseHash, address indexed openedBy, uint64 openedAt);
    event DisputeResolved(bytes32 indexed parcelId, bytes32 indexed resolutionHash, address indexed resolvedBy, uint64 resolvedAt);

    error ZeroAddress();
    error ZeroValue();
    error ApplicationAlreadyExists();
    error ApplicationNotFound();
    error ApplicationNotPending();
    error ParcelAlreadyRegistered();
    error ParcelNotRegistered();
    error ParcelRevokedState();
    error ParcelInDispute();
    error ParcelNotInDispute();
    error VerificationIncomplete();
    error StaleApplication();

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    function submitRegistrationApplication(
        bytes32 applicationId,
        bytes32 parcelId,
        bytes32 proposedHolderIdHash,
        bytes32 sourceManifestHash,
        bytes32 spatialRefHash
    ) external onlyRole(REGISTRY_OFFICER_ROLE) whenNotPaused {
        _requireNonZero(applicationId);
        _requireNonZero(parcelId);
        _requireNonZero(proposedHolderIdHash);
        _requireNonZero(sourceManifestHash);
        _requireNonZero(spatialRefHash);

        if (_applicationExists[applicationId]) revert ApplicationAlreadyExists();
        if (_currentVersion[parcelId] != 0) revert ParcelAlreadyRegistered();

        _applications[applicationId] = Application({
            applicationType: ApplicationType.Registration,
            status: ApplicationStatus.Submitted,
            parcelId: parcelId,
            proposedHolderIdHash: proposedHolderIdHash,
            sourceManifestHash: sourceManifestHash,
            spatialRefHash: spatialRefHash,
            basedOnVersion: 0,
            submittedAt: uint64(block.timestamp),
            submittedBy: msg.sender,
            surveyVerified: false,
            administrativeVerified: false
        });

        _applicationExists[applicationId] = true;
        emit ApplicationSubmitted(applicationId, parcelId, ApplicationType.Registration, 0, msg.sender);
    }

    function submitTransferApplication(
        bytes32 applicationId,
        bytes32 parcelId,
        bytes32 proposedHolderIdHash,
        bytes32 sourceManifestHash
    ) external onlyRole(REGISTRY_OFFICER_ROLE) whenNotPaused {
        _requireNonZero(applicationId);
        _requireNonZero(parcelId);
        _requireNonZero(proposedHolderIdHash);
        _requireNonZero(sourceManifestHash);

        if (_applicationExists[applicationId]) revert ApplicationAlreadyExists();

        uint64 version = _currentVersion[parcelId];
        if (version == 0) revert ParcelNotRegistered();
        if (_disputes[parcelId].active) revert ParcelInDispute();

        ParcelVersion storage current = _versions[parcelId][version];
        if (current.recordState == RecordState.Revoked) revert ParcelRevokedState();

        _applications[applicationId] = Application({
            applicationType: ApplicationType.Transfer,
            status: ApplicationStatus.Submitted,
            parcelId: parcelId,
            proposedHolderIdHash: proposedHolderIdHash,
            sourceManifestHash: sourceManifestHash,
            spatialRefHash: current.spatialRefHash,
            basedOnVersion: version,
            submittedAt: uint64(block.timestamp),
            submittedBy: msg.sender,
            surveyVerified: false,
            administrativeVerified: false
        });

        _applicationExists[applicationId] = true;
        emit ApplicationSubmitted(applicationId, parcelId, ApplicationType.Transfer, version, msg.sender);
    }

    function verifySurvey(bytes32 applicationId) external onlyRole(SURVEYOR_ROLE) whenNotPaused {
        Application storage application = _getPendingApplication(applicationId);
        application.surveyVerified = true;
        emit SurveyVerified(applicationId, msg.sender, uint64(block.timestamp));
    }

    function verifyAdministrative(bytes32 applicationId) external onlyRole(REGISTRY_OFFICER_ROLE) whenNotPaused {
        Application storage application = _getPendingApplication(applicationId);
        application.administrativeVerified = true;
        emit AdministrativeVerified(applicationId, msg.sender, uint64(block.timestamp));
    }

    function rejectApplication(bytes32 applicationId) external onlyRole(AUTHORISER_ROLE) whenNotPaused {
        Application storage application = _getPendingApplication(applicationId);
        application.status = ApplicationStatus.Rejected;
        emit ApplicationRejected(
            applicationId,
            application.parcelId,
            msg.sender,
            uint64(block.timestamp)
        );
    }

    function authoriseApplication(bytes32 applicationId) external onlyRole(AUTHORISER_ROLE) whenNotPaused {
        Application storage application = _getPendingApplication(applicationId);

        if (!application.surveyVerified || !application.administrativeVerified) revert VerificationIncomplete();
        if (_disputes[application.parcelId].active) revert ParcelInDispute();

        uint64 current = _currentVersion[application.parcelId];

        if (application.applicationType == ApplicationType.Registration) {
            if (current != 0) revert ParcelAlreadyRegistered();
        } else {
            if (current == 0) revert ParcelNotRegistered();
            if (current != application.basedOnVersion) revert StaleApplication();
            if (_versions[application.parcelId][current].recordState == RecordState.Revoked) revert ParcelRevokedState();
        }

        uint64 newVersion = current + 1;
        VersionType versionType = application.applicationType == ApplicationType.Registration
            ? VersionType.Registration
            : VersionType.Transfer;

        _createVersion(
            application.parcelId,
            newVersion,
            application.proposedHolderIdHash,
            application.sourceManifestHash,
            application.spatialRefHash,
            bytes32(0),
            versionType,
            RecordState.Active,
            applicationId
        );

        application.status = ApplicationStatus.Approved;
        emit ApplicationAuthorised(applicationId, application.parcelId, newVersion, msg.sender);
    }

    function applyCorrection(
        bytes32 parcelId,
        bytes32 correctedHolderIdHash,
        bytes32 correctedSourceManifestHash,
        bytes32 correctedSpatialRefHash,
        bytes32 reasonHash
    ) external onlyRole(CORRECTION_OFFICER_ROLE) whenNotPaused {
        _requireNonZero(parcelId);
        _requireNonZero(correctedHolderIdHash);
        _requireNonZero(correctedSourceManifestHash);
        _requireNonZero(correctedSpatialRefHash);
        _requireNonZero(reasonHash);

        uint64 current = _currentVersion[parcelId];
        if (current == 0) revert ParcelNotRegistered();
        if (_disputes[parcelId].active) revert ParcelInDispute();

        ParcelVersion storage currentRecord = _versions[parcelId][current];
        if (currentRecord.recordState == RecordState.Revoked) revert ParcelRevokedState();

        uint64 newVersion = current + 1;

        _createVersion(
            parcelId,
            newVersion,
            correctedHolderIdHash,
            correctedSourceManifestHash,
            correctedSpatialRefHash,
            reasonHash,
            VersionType.Correction,
            RecordState.Active,
            bytes32(0)
        );

        emit CorrectionApplied(parcelId, newVersion, reasonHash, msg.sender);
    }

    function revokeParcel(
        bytes32 parcelId,
        bytes32 sourceManifestHash,
        bytes32 reasonHash
    ) external onlyRole(AUTHORISER_ROLE) whenNotPaused {
        _requireNonZero(parcelId);
        _requireNonZero(sourceManifestHash);
        _requireNonZero(reasonHash);

        uint64 current = _currentVersion[parcelId];
        if (current == 0) revert ParcelNotRegistered();
        if (_disputes[parcelId].active) revert ParcelInDispute();

        ParcelVersion storage currentRecord = _versions[parcelId][current];
        if (currentRecord.recordState == RecordState.Revoked) revert ParcelRevokedState();

        uint64 newVersion = current + 1;

        _createVersion(
            parcelId,
            newVersion,
            currentRecord.holderIdHash,
            sourceManifestHash,
            currentRecord.spatialRefHash,
            reasonHash,
            VersionType.Revocation,
            RecordState.Revoked,
            bytes32(0)
        );

        emit ParcelRevoked(parcelId, newVersion, reasonHash, msg.sender);
    }

    function openDispute(bytes32 parcelId, bytes32 caseHash) external onlyRole(DISPUTE_OFFICER_ROLE) whenNotPaused {
        _requireNonZero(parcelId);
        _requireNonZero(caseHash);

        if (_currentVersion[parcelId] == 0) revert ParcelNotRegistered();
        if (_disputes[parcelId].active) revert ParcelInDispute();

        _disputes[parcelId] = Dispute({
            active: true,
            caseHash: caseHash,
            resolutionHash: bytes32(0),
            openedAt: uint64(block.timestamp),
            resolvedAt: 0
        });

        emit DisputeOpened(parcelId, caseHash, msg.sender, uint64(block.timestamp));
    }

    function resolveDispute(bytes32 parcelId, bytes32 resolutionHash) external onlyRole(DISPUTE_OFFICER_ROLE) whenNotPaused {
        _requireNonZero(parcelId);
        _requireNonZero(resolutionHash);

        Dispute storage dispute = _disputes[parcelId];
        if (!dispute.active) revert ParcelNotInDispute();

        dispute.active = false;
        dispute.resolutionHash = resolutionHash;
        dispute.resolvedAt = uint64(block.timestamp);

        emit DisputeResolved(parcelId, resolutionHash, msg.sender, uint64(block.timestamp));
    }

    function getApplication(bytes32 applicationId) external view returns (Application memory) {
        if (!_applicationExists[applicationId]) revert ApplicationNotFound();
        return _applications[applicationId];
    }

    function getCurrentVersion(bytes32 parcelId) external view returns (uint64) {
        return _currentVersion[parcelId];
    }

    function getParcelVersion(bytes32 parcelId, uint64 version) external view returns (ParcelVersion memory) {
        if (version == 0 || version > _currentVersion[parcelId]) revert ParcelNotRegistered();
        return _versions[parcelId][version];
    }

    function getCurrentParcel(bytes32 parcelId) external view returns (ParcelVersion memory) {
        uint64 version = _currentVersion[parcelId];
        if (version == 0) revert ParcelNotRegistered();
        return _versions[parcelId][version];
    }

    function getDispute(bytes32 parcelId) external view returns (Dispute memory) {
        if (_currentVersion[parcelId] == 0) revert ParcelNotRegistered();
        return _disputes[parcelId];
    }

    function _getPendingApplication(bytes32 applicationId) internal view returns (Application storage application) {
        if (!_applicationExists[applicationId]) revert ApplicationNotFound();
        application = _applications[applicationId];
        if (application.status != ApplicationStatus.Submitted) revert ApplicationNotPending();
    }

    function _createVersion(
        bytes32 parcelId,
        uint64 version,
        bytes32 holderIdHash,
        bytes32 sourceManifestHash,
        bytes32 spatialRefHash,
        bytes32 changeReasonHash,
        VersionType versionType,
        RecordState recordState,
        bytes32 originatingApplicationId
    ) internal {
        _versions[parcelId][version] = ParcelVersion({
            version: version,
            holderIdHash: holderIdHash,
            sourceManifestHash: sourceManifestHash,
            spatialRefHash: spatialRefHash,
            changeReasonHash: changeReasonHash,
            effectiveAt: uint64(block.timestamp),
            versionType: versionType,
            recordState: recordState,
            originatingApplicationId: originatingApplicationId
        });

        _currentVersion[parcelId] = version;

        emit ParcelVersionCreated(
            parcelId,
            version,
            versionType,
            recordState,
            holderIdHash,
            sourceManifestHash,
            spatialRefHash,
            changeReasonHash,
            originatingApplicationId,
            uint64(block.timestamp)
        );
    }

    function _requireNonZero(bytes32 value) internal pure {
        if (value == bytes32(0)) revert ZeroValue();
    }
}
