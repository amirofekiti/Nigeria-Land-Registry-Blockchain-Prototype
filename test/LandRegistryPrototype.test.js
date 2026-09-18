const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LandRegistryPrototype — Phase 2B", function () {
  const id = (value) => ethers.id(value);
  const ZERO = ethers.ZeroHash;

  async function deployFixture() {
    const [
      admin,
      registry,
      surveyor,
      authoriser,
      disputeOfficer,
      correctionOfficer,
      outsider,
    ] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("LandRegistryPrototype");
    const contract = await Factory.deploy(admin.address);
    await contract.waitForDeployment();

    const roles = {
      registry: await contract.REGISTRY_OFFICER_ROLE(),
      surveyor: await contract.SURVEYOR_ROLE(),
      authoriser: await contract.AUTHORISER_ROLE(),
      dispute: await contract.DISPUTE_OFFICER_ROLE(),
      correction: await contract.CORRECTION_OFFICER_ROLE(),
    };

    await contract.connect(admin).grantRole(roles.registry, registry.address);
    await contract.connect(admin).grantRole(roles.surveyor, surveyor.address);
    await contract.connect(admin).grantRole(roles.authoriser, authoriser.address);
    await contract.connect(admin).grantRole(roles.dispute, disputeOfficer.address);
    await contract.connect(admin).grantRole(roles.correction, correctionOfficer.address);

    return {
      contract,
      roles,
      admin,
      registry,
      surveyor,
      authoriser,
      disputeOfficer,
      correctionOfficer,
      outsider,
    };
  }

  function registrationData(suffix = "A") {
    return {
      applicationId: id("REG-" + suffix),
      parcelId: id("PARCEL-" + suffix),
      holderIdHash: id("HOLDER-" + suffix),
      sourceManifestHash: id("SOURCE-" + suffix),
      spatialRefHash: id("SPATIAL-" + suffix),
    };
  }

  async function submitRegistration(ctx, suffix = "A") {
    const data = registrationData(suffix);
    await ctx.contract.connect(ctx.registry).submitRegistrationApplication(
      data.applicationId,
      data.parcelId,
      data.holderIdHash,
      data.sourceManifestHash,
      data.spatialRefHash
    );
    return data;
  }

  async function registerParcel(ctx, suffix = "A") {
    const data = await submitRegistration(ctx, suffix);
    await ctx.contract.connect(ctx.surveyor).verifySurvey(data.applicationId);
    await ctx.contract.connect(ctx.registry).verifyAdministrative(data.applicationId);
    await ctx.contract.connect(ctx.authoriser).authoriseApplication(data.applicationId);
    return data;
  }

  async function submitVerifiedTransfer(ctx, base, suffix = "T") {
    const transferId = id("TRANSFER-" + suffix);
    const newHolder = id("HOLDER-" + suffix + "-NEW");
    const newSource = id("TRANSFER-SOURCE-" + suffix);

    await ctx.contract.connect(ctx.registry).submitTransferApplication(
      transferId,
      base.parcelId,
      newHolder,
      newSource
    );
    await ctx.contract.connect(ctx.surveyor).verifySurvey(transferId);
    await ctx.contract.connect(ctx.registry).verifyAdministrative(transferId);

    return { transferId, newHolder, newSource };
  }

  describe("registration workflow", function () {
    it("creates version 1 only after survey and administrative verification", async function () {
      const ctx = await deployFixture();
      const data = await submitRegistration(ctx, "001");

      await expect(
        ctx.contract.connect(ctx.authoriser).authoriseApplication(data.applicationId)
      ).to.be.revertedWithCustomError(ctx.contract, "VerificationIncomplete");

      await ctx.contract.connect(ctx.surveyor).verifySurvey(data.applicationId);
      await ctx.contract.connect(ctx.registry).verifyAdministrative(data.applicationId);

      await expect(
        ctx.contract.connect(ctx.authoriser).authoriseApplication(data.applicationId)
      ).to.emit(ctx.contract, "ParcelVersionCreated");

      expect(await ctx.contract.getCurrentVersion(data.parcelId)).to.equal(1n);
      const current = await ctx.contract.getCurrentParcel(data.parcelId);
      expect(current.version).to.equal(1n);
      expect(current.recordState).to.equal(0n);
      expect(current.holderIdHash).to.equal(data.holderIdHash);
    });

    it("rejects registration submission by an unauthorised actor", async function () {
      const ctx = await deployFixture();
      const data = registrationData("UNAUTH");

      await expect(
        ctx.contract.connect(ctx.outsider).submitRegistrationApplication(
          data.applicationId,
          data.parcelId,
          data.holderIdHash,
          data.sourceManifestHash,
          data.spatialRefHash
        )
      ).to.be.reverted;
    });

    it("rejects reuse of an application identifier", async function () {
      const ctx = await deployFixture();
      const data = await submitRegistration(ctx, "DUPAPP");

      await expect(
        ctx.contract.connect(ctx.registry).submitRegistrationApplication(
          data.applicationId,
          id("PARCEL-OTHER"),
          id("HOLDER-OTHER"),
          id("SOURCE-OTHER"),
          id("SPATIAL-OTHER")
        )
      ).to.be.revertedWithCustomError(ctx.contract, "ApplicationAlreadyExists");
    });

    it("rejects a new registration application for an already registered parcel", async function () {
      const ctx = await deployFixture();
      const base = await registerParcel(ctx, "DUPPARCEL");

      await expect(
        ctx.contract.connect(ctx.registry).submitRegistrationApplication(
          id("REG-DUPPARCEL-2"),
          base.parcelId,
          id("HOLDER-DUPPARCEL-2"),
          id("SOURCE-DUPPARCEL-2"),
          id("SPATIAL-DUPPARCEL-2")
        )
      ).to.be.revertedWithCustomError(ctx.contract, "ParcelAlreadyRegistered");
    });

    it("allows competing pending registration applications but only one can become authoritative", async function () {
      const ctx = await deployFixture();
      const parcelId = id("PARCEL-COMPETE");

      await ctx.contract.connect(ctx.registry).submitRegistrationApplication(
        id("REG-COMPETE-1"),
        parcelId,
        id("HOLDER-COMPETE-1"),
        id("SOURCE-COMPETE-1"),
        id("SPATIAL-COMPETE-1")
      );
      await ctx.contract.connect(ctx.registry).submitRegistrationApplication(
        id("REG-COMPETE-2"),
        parcelId,
        id("HOLDER-COMPETE-2"),
        id("SOURCE-COMPETE-2"),
        id("SPATIAL-COMPETE-2")
      );

      for (const app of [id("REG-COMPETE-1"), id("REG-COMPETE-2")]) {
        await ctx.contract.connect(ctx.surveyor).verifySurvey(app);
        await ctx.contract.connect(ctx.registry).verifyAdministrative(app);
      }

      await ctx.contract.connect(ctx.authoriser).authoriseApplication(id("REG-COMPETE-1"));

      await expect(
        ctx.contract.connect(ctx.authoriser).authoriseApplication(id("REG-COMPETE-2"))
      ).to.be.revertedWithCustomError(ctx.contract, "ParcelAlreadyRegistered");

      expect(await ctx.contract.getCurrentVersion(parcelId)).to.equal(1n);
    });

    it("rejects mandatory zero-value identifiers and evidence hashes", async function () {
      const ctx = await deployFixture();

      await expect(
        ctx.contract.connect(ctx.registry).submitRegistrationApplication(
          ZERO,
          id("PARCEL-Z"),
          id("HOLDER-Z"),
          id("SOURCE-Z"),
          id("SPATIAL-Z")
        )
      ).to.be.revertedWithCustomError(ctx.contract, "ZeroValue");

      await expect(
        ctx.contract.connect(ctx.registry).submitRegistrationApplication(
          id("REG-Z2"),
          id("PARCEL-Z2"),
          ZERO,
          id("SOURCE-Z2"),
          id("SPATIAL-Z2")
        )
      ).to.be.revertedWithCustomError(ctx.contract, "ZeroValue");

      await expect(
        ctx.contract.connect(ctx.registry).submitRegistrationApplication(
          id("REG-Z3"),
          id("PARCEL-Z3"),
          id("HOLDER-Z3"),
          ZERO,
          id("SPATIAL-Z3")
        )
      ).to.be.revertedWithCustomError(ctx.contract, "ZeroValue");
    });

    it("rejects verification by actors without the required roles", async function () {
      const ctx = await deployFixture();
      const data = await submitRegistration(ctx, "ROLECHECK");

      await expect(
        ctx.contract.connect(ctx.outsider).verifySurvey(data.applicationId)
      ).to.be.reverted;

      await expect(
        ctx.contract.connect(ctx.outsider).verifyAdministrative(data.applicationId)
      ).to.be.reverted;

      await expect(
        ctx.contract.connect(ctx.outsider).authoriseApplication(data.applicationId)
      ).to.be.reverted;
    });

    it("prevents an approved application from being authorised twice", async function () {
      const ctx = await deployFixture();
      const data = await registerParcel(ctx, "REPEAT");

      await expect(
        ctx.contract.connect(ctx.authoriser).authoriseApplication(data.applicationId)
      ).to.be.revertedWithCustomError(ctx.contract, "ApplicationNotPending");

      expect(await ctx.contract.getCurrentVersion(data.parcelId)).to.equal(1n);
    });

    it("prevents authorisation of a rejected application", async function () {
      const ctx = await deployFixture();
      const data = await submitRegistration(ctx, "REJECTED");
      await ctx.contract.connect(ctx.surveyor).verifySurvey(data.applicationId);
      await ctx.contract.connect(ctx.registry).verifyAdministrative(data.applicationId);
      await expect(
        ctx.contract.connect(ctx.authoriser).rejectApplication(data.applicationId)
      ).to.emit(ctx.contract, "ApplicationRejected");

      const application = await ctx.contract.getApplication(data.applicationId);
      expect(application.status).to.equal(3n);

      await expect(
        ctx.contract.connect(ctx.authoriser).authoriseApplication(data.applicationId)
      ).to.be.revertedWithCustomError(ctx.contract, "ApplicationNotPending");
    });
  });

  describe("transfer and versioning", function () {
    it("rejects transfer for an unknown parcel", async function () {
      const ctx = await deployFixture();

      await expect(
        ctx.contract.connect(ctx.registry).submitTransferApplication(
          id("TRANSFER-UNKNOWN"),
          id("PARCEL-UNKNOWN"),
          id("HOLDER-UNKNOWN"),
          id("SOURCE-UNKNOWN")
        )
      ).to.be.revertedWithCustomError(ctx.contract, "ParcelNotRegistered");
    });

    it("creates a transfer as a new version while preserving historical state", async function () {
      const ctx = await deployFixture();
      const base = await registerParcel(ctx, "T");
      const transfer = await submitVerifiedTransfer(ctx, base, "T");

      await expect(
        ctx.contract.connect(ctx.authoriser).authoriseApplication(transfer.transferId)
      )
        .to.emit(ctx.contract, "ApplicationAuthorised")
        .withArgs(transfer.transferId, base.parcelId, 2n, ctx.authoriser.address);

      expect(await ctx.contract.getCurrentVersion(base.parcelId)).to.equal(2n);

      const v1 = await ctx.contract.getParcelVersion(base.parcelId, 1);
      const v2 = await ctx.contract.getParcelVersion(base.parcelId, 2);
      expect(v1.holderIdHash).to.equal(base.holderIdHash);
      expect(v2.holderIdHash).to.equal(transfer.newHolder);
      expect(v2.versionType).to.equal(1n);
      expect(v2.originatingApplicationId).to.equal(transfer.transferId);
    });

    it("rejects a stale transfer application after a newer authoritative version exists", async function () {
      const ctx = await deployFixture();
      const base = await registerParcel(ctx, "S");
      const transfer = await submitVerifiedTransfer(ctx, base, "S");

      await ctx.contract.connect(ctx.correctionOfficer).applyCorrection(
        base.parcelId,
        id("HOLDER-S-CORRECTED"),
        id("SOURCE-S-CORRECTED"),
        id("SPATIAL-S-CORRECTED"),
        id("REASON-S")
      );

      await expect(
        ctx.contract.connect(ctx.authoriser).authoriseApplication(transfer.transferId)
      ).to.be.revertedWithCustomError(ctx.contract, "StaleApplication");
    });

    it("keeps parcel versions strictly monotonic across transfer and correction", async function () {
      const ctx = await deployFixture();
      const base = await registerParcel(ctx, "MONO");

      const transfer = await submitVerifiedTransfer(ctx, base, "MONO");
      await ctx.contract.connect(ctx.authoriser).authoriseApplication(transfer.transferId);
      expect(await ctx.contract.getCurrentVersion(base.parcelId)).to.equal(2n);

      await ctx.contract.connect(ctx.correctionOfficer).applyCorrection(
        base.parcelId,
        transfer.newHolder,
        id("SOURCE-MONO-CORR"),
        id("SPATIAL-MONO-CORR"),
        id("REASON-MONO")
      );
      expect(await ctx.contract.getCurrentVersion(base.parcelId)).to.equal(3n);

      const versions = [];
      for (let v = 1; v <= 3; v++) {
        const item = await ctx.contract.getParcelVersion(base.parcelId, v);
        versions.push(item.version);
      }
      expect(versions).to.deep.equal([1n, 2n, 3n]);
    });

    it("rejects zero-value mandatory fields in transfer applications", async function () {
      const ctx = await deployFixture();
      const base = await registerParcel(ctx, "TZ");

      await expect(
        ctx.contract.connect(ctx.registry).submitTransferApplication(
          ZERO,
          base.parcelId,
          id("HOLDER-TZ-2"),
          id("SOURCE-TZ-2")
        )
      ).to.be.revertedWithCustomError(ctx.contract, "ZeroValue");

      await expect(
        ctx.contract.connect(ctx.registry).submitTransferApplication(
          id("TRANSFER-TZ"),
          base.parcelId,
          ZERO,
          id("SOURCE-TZ-2")
        )
      ).to.be.revertedWithCustomError(ctx.contract, "ZeroValue");
    });
  });

  describe("disputes, corrections and revocation", function () {
    it("freezes ordinary transfer workflow during an active dispute", async function () {
      const ctx = await deployFixture();
      const base = await registerParcel(ctx, "D");

      await ctx.contract.connect(ctx.disputeOfficer).openDispute(
        base.parcelId,
        id("CASE-D")
      );

      const dispute = await ctx.contract.getDispute(base.parcelId);
      expect(dispute.active).to.equal(true);

      await expect(
        ctx.contract.connect(ctx.registry).submitTransferApplication(
          id("TRANSFER-D"),
          base.parcelId,
          id("HOLDER-D-2"),
          id("SOURCE-D-2")
        )
      ).to.be.revertedWithCustomError(ctx.contract, "ParcelInDispute");

      await ctx.contract.connect(ctx.disputeOfficer).resolveDispute(
        base.parcelId,
        id("RESOLUTION-D")
      );

      await expect(
        ctx.contract.connect(ctx.registry).submitTransferApplication(
          id("TRANSFER-D-2"),
          base.parcelId,
          id("HOLDER-D-2"),
          id("SOURCE-D-2")
        )
      ).not.to.be.reverted;
    });

    it("rejects duplicate dispute opening and resolution without an active dispute", async function () {
      const ctx = await deployFixture();
      const base = await registerParcel(ctx, "DUPD");

      await expect(
        ctx.contract.connect(ctx.disputeOfficer).resolveDispute(
          base.parcelId,
          id("RESOLUTION-NONE")
        )
      ).to.be.revertedWithCustomError(ctx.contract, "ParcelNotInDispute");

      await ctx.contract.connect(ctx.disputeOfficer).openDispute(
        base.parcelId,
        id("CASE-DUPD")
      );

      await expect(
        ctx.contract.connect(ctx.disputeOfficer).openDispute(
          base.parcelId,
          id("CASE-DUPD-2")
        )
      ).to.be.revertedWithCustomError(ctx.contract, "ParcelInDispute");
    });

    it("blocks correction and revocation while a dispute is active", async function () {
      const ctx = await deployFixture();
      const base = await registerParcel(ctx, "BLOCKD");
      await ctx.contract.connect(ctx.disputeOfficer).openDispute(
        base.parcelId,
        id("CASE-BLOCKD")
      );

      await expect(
        ctx.contract.connect(ctx.correctionOfficer).applyCorrection(
          base.parcelId,
          id("HOLDER-BLOCKD-C"),
          id("SOURCE-BLOCKD-C"),
          id("SPATIAL-BLOCKD-C"),
          id("REASON-BLOCKD-C")
        )
      ).to.be.revertedWithCustomError(ctx.contract, "ParcelInDispute");

      await expect(
        ctx.contract.connect(ctx.authoriser).revokeParcel(
          base.parcelId,
          id("SOURCE-BLOCKD-R"),
          id("REASON-BLOCKD-R")
        )
      ).to.be.revertedWithCustomError(ctx.contract, "ParcelInDispute");
    });

    it("records corrections as superseding versions rather than mutating history", async function () {
      const ctx = await deployFixture();
      const base = await registerParcel(ctx, "C");
      const correctedHolder = id("HOLDER-C-CORRECTED");
      const reasonHash = id("REASON-C");

      await expect(
        ctx.contract.connect(ctx.correctionOfficer).applyCorrection(
          base.parcelId,
          correctedHolder,
          id("SOURCE-C-CORRECTED"),
          id("SPATIAL-C-CORRECTED"),
          reasonHash
        )
      )
        .to.emit(ctx.contract, "CorrectionApplied")
        .withArgs(base.parcelId, 2n, reasonHash, ctx.correctionOfficer.address);

      const v1 = await ctx.contract.getParcelVersion(base.parcelId, 1);
      const v2 = await ctx.contract.getParcelVersion(base.parcelId, 2);
      expect(v1.holderIdHash).to.equal(base.holderIdHash);
      expect(v2.holderIdHash).to.equal(correctedHolder);
      expect(v2.versionType).to.equal(2n);
      expect(v2.changeReasonHash).to.equal(reasonHash);
    });

    it("rejects correction by an unauthorised actor", async function () {
      const ctx = await deployFixture();
      const base = await registerParcel(ctx, "CU");

      await expect(
        ctx.contract.connect(ctx.outsider).applyCorrection(
          base.parcelId,
          id("HOLDER-CU-C"),
          id("SOURCE-CU-C"),
          id("SPATIAL-CU-C"),
          id("REASON-CU-C")
        )
      ).to.be.reverted;
    });

    it("records revocation as a new version and blocks further transfer", async function () {
      const ctx = await deployFixture();
      const base = await registerParcel(ctx, "R");

      await ctx.contract.connect(ctx.authoriser).revokeParcel(
        base.parcelId,
        id("REVOCATION-SOURCE-R"),
        id("REVOCATION-REASON-R")
      );

      expect(await ctx.contract.getCurrentVersion(base.parcelId)).to.equal(2n);
      const current = await ctx.contract.getCurrentParcel(base.parcelId);
      expect(current.recordState).to.equal(1n);
      expect(current.versionType).to.equal(3n);

      await expect(
        ctx.contract.connect(ctx.registry).submitTransferApplication(
          id("TRANSFER-R"),
          base.parcelId,
          id("HOLDER-R-2"),
          id("SOURCE-R-2")
        )
      ).to.be.revertedWithCustomError(ctx.contract, "ParcelRevokedState");
    });

    it("blocks correction and repeated revocation after revocation", async function () {
      const ctx = await deployFixture();
      const base = await registerParcel(ctx, "RR");

      await ctx.contract.connect(ctx.authoriser).revokeParcel(
        base.parcelId,
        id("REVOCATION-SOURCE-RR"),
        id("REVOCATION-REASON-RR")
      );

      await expect(
        ctx.contract.connect(ctx.correctionOfficer).applyCorrection(
          base.parcelId,
          id("HOLDER-RR-C"),
          id("SOURCE-RR-C"),
          id("SPATIAL-RR-C"),
          id("REASON-RR-C")
        )
      ).to.be.revertedWithCustomError(ctx.contract, "ParcelRevokedState");

      await expect(
        ctx.contract.connect(ctx.authoriser).revokeParcel(
          base.parcelId,
          id("REVOCATION-SOURCE-RR-2"),
          id("REVOCATION-REASON-RR-2")
        )
      ).to.be.revertedWithCustomError(ctx.contract, "ParcelRevokedState");
    });

    it("rejects zero-value dispute and correction evidence hashes", async function () {
      const ctx = await deployFixture();
      const base = await registerParcel(ctx, "ZERO2");

      await expect(
        ctx.contract.connect(ctx.disputeOfficer).openDispute(base.parcelId, ZERO)
      ).to.be.revertedWithCustomError(ctx.contract, "ZeroValue");

      await expect(
        ctx.contract.connect(ctx.correctionOfficer).applyCorrection(
          base.parcelId,
          id("HOLDER-ZERO2-C"),
          id("SOURCE-ZERO2-C"),
          id("SPATIAL-ZERO2-C"),
          ZERO
        )
      ).to.be.revertedWithCustomError(ctx.contract, "ZeroValue");
    });
  });

  describe("role lifecycle, pause controls and audit consistency", function () {
    it("enforces role revocation immediately", async function () {
      const ctx = await deployFixture();
      const data = registrationData("REVOKEROLE");

      await ctx.contract.connect(ctx.admin).revokeRole(
        ctx.roles.registry,
        ctx.registry.address
      );

      await expect(
        ctx.contract.connect(ctx.registry).submitRegistrationApplication(
          data.applicationId,
          data.parcelId,
          data.holderIdHash,
          data.sourceManifestHash,
          data.spatialRefHash
        )
      ).to.be.reverted;
    });

    it("blocks state-changing application submission while paused and restores it after unpause", async function () {
      const ctx = await deployFixture();
      const data = registrationData("P");

      await ctx.contract.connect(ctx.admin).pause();

      await expect(
        ctx.contract.connect(ctx.registry).submitRegistrationApplication(
          data.applicationId,
          data.parcelId,
          data.holderIdHash,
          data.sourceManifestHash,
          data.spatialRefHash
        )
      ).to.be.reverted;

      await ctx.contract.connect(ctx.admin).unpause();

      await expect(
        ctx.contract.connect(ctx.registry).submitRegistrationApplication(
          data.applicationId,
          data.parcelId,
          data.holderIdHash,
          data.sourceManifestHash,
          data.spatialRefHash
        )
      ).not.to.be.reverted;
    });

    it("keeps emitted authorisation data consistent with stored authoritative state", async function () {
      const ctx = await deployFixture();
      const data = await submitRegistration(ctx, "AUDIT");
      await ctx.contract.connect(ctx.surveyor).verifySurvey(data.applicationId);
      await ctx.contract.connect(ctx.registry).verifyAdministrative(data.applicationId);

      await expect(
        ctx.contract.connect(ctx.authoriser).authoriseApplication(data.applicationId)
      )
        .to.emit(ctx.contract, "ApplicationAuthorised")
        .withArgs(data.applicationId, data.parcelId, 1n, ctx.authoriser.address);

      const stored = await ctx.contract.getParcelVersion(data.parcelId, 1);
      expect(stored.originatingApplicationId).to.equal(data.applicationId);
      expect(stored.holderIdHash).to.equal(data.holderIdHash);
      expect(stored.sourceManifestHash).to.equal(data.sourceManifestHash);
      expect(stored.spatialRefHash).to.equal(data.spatialRefHash);
    });

    it("rejects reads for non-existent parcel versions and applications", async function () {
      const ctx = await deployFixture();

      await expect(
        ctx.contract.getApplication(id("NO-APPLICATION"))
      ).to.be.revertedWithCustomError(ctx.contract, "ApplicationNotFound");

      await expect(
        ctx.contract.getCurrentParcel(id("NO-PARCEL"))
      ).to.be.revertedWithCustomError(ctx.contract, "ParcelNotRegistered");

      const base = await registerParcel(ctx, "READ");
      await expect(
        ctx.contract.getParcelVersion(base.parcelId, 2)
      ).to.be.revertedWithCustomError(ctx.contract, "ParcelNotRegistered");
    });
  });
});
