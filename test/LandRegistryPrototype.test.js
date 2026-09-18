const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LandRegistryPrototype", function () {
  const id = (value) => ethers.id(value);

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

    await contract.connect(admin).grantRole(
      await contract.REGISTRY_OFFICER_ROLE(),
      registry.address
    );
    await contract.connect(admin).grantRole(
      await contract.SURVEYOR_ROLE(),
      surveyor.address
    );
    await contract.connect(admin).grantRole(
      await contract.AUTHORISER_ROLE(),
      authoriser.address
    );
    await contract.connect(admin).grantRole(
      await contract.DISPUTE_OFFICER_ROLE(),
      disputeOfficer.address
    );
    await contract.connect(admin).grantRole(
      await contract.CORRECTION_OFFICER_ROLE(),
      correctionOfficer.address
    );

    return {
      contract,
      admin,
      registry,
      surveyor,
      authoriser,
      disputeOfficer,
      correctionOfficer,
      outsider,
    };
  }

  async function registerParcel(ctx, suffix = "A") {
    const applicationId = id("REG-" + suffix);
    const parcelId = id("PARCEL-" + suffix);
    const holderIdHash = id("HOLDER-" + suffix);
    const sourceManifestHash = id("SOURCE-" + suffix);
    const spatialRefHash = id("SPATIAL-" + suffix);

    await ctx.contract.connect(ctx.registry).submitRegistrationApplication(
      applicationId,
      parcelId,
      holderIdHash,
      sourceManifestHash,
      spatialRefHash
    );
    await ctx.contract.connect(ctx.surveyor).verifySurvey(applicationId);
    await ctx.contract.connect(ctx.registry).verifyAdministrative(applicationId);
    await ctx.contract.connect(ctx.authoriser).authoriseApplication(applicationId);

    return { applicationId, parcelId, holderIdHash, sourceManifestHash, spatialRefHash };
  }

  it("creates version 1 only after survey and administrative verification", async function () {
    const ctx = await deployFixture();
    const applicationId = id("REG-001");
    const parcelId = id("PARCEL-001");

    await ctx.contract.connect(ctx.registry).submitRegistrationApplication(
      applicationId,
      parcelId,
      id("HOLDER-001"),
      id("SOURCE-001"),
      id("SPATIAL-001")
    );

    await expect(
      ctx.contract.connect(ctx.authoriser).authoriseApplication(applicationId)
    ).to.be.revertedWithCustomError(ctx.contract, "VerificationIncomplete");

    await ctx.contract.connect(ctx.surveyor).verifySurvey(applicationId);
    await ctx.contract.connect(ctx.registry).verifyAdministrative(applicationId);

    await expect(
      ctx.contract.connect(ctx.authoriser).authoriseApplication(applicationId)
    ).to.emit(ctx.contract, "ParcelVersionCreated");

    expect(await ctx.contract.getCurrentVersion(parcelId)).to.equal(1n);
    const current = await ctx.contract.getCurrentParcel(parcelId);
    expect(current.version).to.equal(1n);
    expect(current.recordState).to.equal(0n);
  });

  it("rejects registration submission by an unauthorised actor", async function () {
    const ctx = await deployFixture();

    await expect(
      ctx.contract.connect(ctx.outsider).submitRegistrationApplication(
        id("REG-X"),
        id("PARCEL-X"),
        id("HOLDER-X"),
        id("SOURCE-X"),
        id("SPATIAL-X")
      )
    ).to.be.reverted;
  });

  it("creates a transfer as a new version while preserving historical state", async function () {
    const ctx = await deployFixture();
    const base = await registerParcel(ctx, "T");
    const transferId = id("TRANSFER-T");
    const newHolder = id("HOLDER-T-2");

    await ctx.contract.connect(ctx.registry).submitTransferApplication(
      transferId,
      base.parcelId,
      newHolder,
      id("TRANSFER-SOURCE-T")
    );
    await ctx.contract.connect(ctx.surveyor).verifySurvey(transferId);
    await ctx.contract.connect(ctx.registry).verifyAdministrative(transferId);
    await ctx.contract.connect(ctx.authoriser).authoriseApplication(transferId);

    expect(await ctx.contract.getCurrentVersion(base.parcelId)).to.equal(2n);

    const v1 = await ctx.contract.getParcelVersion(base.parcelId, 1);
    const v2 = await ctx.contract.getParcelVersion(base.parcelId, 2);
    expect(v1.holderIdHash).to.equal(base.holderIdHash);
    expect(v2.holderIdHash).to.equal(newHolder);
    expect(v2.versionType).to.equal(1n);
  });

  it("freezes ordinary transfer workflow during an active dispute", async function () {
    const ctx = await deployFixture();
    const base = await registerParcel(ctx, "D");

    await ctx.contract.connect(ctx.disputeOfficer).openDispute(
      base.parcelId,
      id("CASE-D")
    );

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

  it("records corrections as superseding versions rather than mutating history", async function () {
    const ctx = await deployFixture();
    const base = await registerParcel(ctx, "C");

    await ctx.contract.connect(ctx.correctionOfficer).applyCorrection(
      base.parcelId,
      id("HOLDER-C-CORRECTED"),
      id("SOURCE-C-CORRECTED"),
      id("SPATIAL-C-CORRECTED"),
      id("REASON-C")
    );

    expect(await ctx.contract.getCurrentVersion(base.parcelId)).to.equal(2n);

    const v1 = await ctx.contract.getParcelVersion(base.parcelId, 1);
    const v2 = await ctx.contract.getParcelVersion(base.parcelId, 2);

    expect(v1.holderIdHash).to.equal(base.holderIdHash);
    expect(v2.holderIdHash).to.equal(id("HOLDER-C-CORRECTED"));
    expect(v2.versionType).to.equal(2n);
  });

  it("rejects a stale transfer application after a newer authoritative version exists", async function () {
    const ctx = await deployFixture();
    const base = await registerParcel(ctx, "S");
    const transferId = id("TRANSFER-S");

    await ctx.contract.connect(ctx.registry).submitTransferApplication(
      transferId,
      base.parcelId,
      id("HOLDER-S-2"),
      id("SOURCE-S-2")
    );
    await ctx.contract.connect(ctx.surveyor).verifySurvey(transferId);
    await ctx.contract.connect(ctx.registry).verifyAdministrative(transferId);

    await ctx.contract.connect(ctx.correctionOfficer).applyCorrection(
      base.parcelId,
      id("HOLDER-S-CORRECTED"),
      id("SOURCE-S-CORRECTED"),
      id("SPATIAL-S-CORRECTED"),
      id("REASON-S")
    );

    await expect(
      ctx.contract.connect(ctx.authoriser).authoriseApplication(transferId)
    ).to.be.revertedWithCustomError(ctx.contract, "StaleApplication");
  });

  it("records revocation as a new version and blocks further transfer", async function () {
    const ctx = await deployFixture();
    const base = await registerParcel(ctx, "R");

    await ctx.contract.connect(ctx.authoriser).revokeParcel(
      base.parcelId,
      id("REVOCATION-SOURCE-R"),
      id("REVOCATION-REASON-R")
    );

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

  it("blocks state-changing application submission while paused", async function () {
    const ctx = await deployFixture();
    await ctx.contract.connect(ctx.admin).pause();

    await expect(
      ctx.contract.connect(ctx.registry).submitRegistrationApplication(
        id("REG-P"),
        id("PARCEL-P"),
        id("HOLDER-P"),
        id("SOURCE-P"),
        id("SPATIAL-P")
      )
    ).to.be.reverted;

    await ctx.contract.connect(ctx.admin).unpause();

    await expect(
      ctx.contract.connect(ctx.registry).submitRegistrationApplication(
        id("REG-P"),
        id("PARCEL-P"),
        id("HOLDER-P"),
        id("SOURCE-P"),
        id("SPATIAL-P")
      )
    ).not.to.be.reverted;
  });
});
