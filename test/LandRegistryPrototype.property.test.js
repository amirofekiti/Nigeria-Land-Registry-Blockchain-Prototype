const { expect } = require("chai");
const { ethers } = require("hardhat");
const fc = require("fast-check");

describe("LandRegistryPrototype — Phase 2D property and invariant testing", function () {
  const id = (value) => ethers.id(value);
  const seed = Number(process.env.FC_SEED || 20260918);
  const numRuns = Number(process.env.FC_NUM_RUNS || 100);

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

  async function registerParcel(ctx, suffix = "MODEL") {
    const applicationId = id("REG-" + suffix);
    const parcelId = id("PARCEL-" + suffix);
    const holderIdHash = id("HOLDER-" + suffix);

    await ctx.contract.connect(ctx.registry).submitRegistrationApplication(
      applicationId,
      parcelId,
      holderIdHash,
      id("SOURCE-" + suffix),
      id("SPATIAL-" + suffix)
    );
    await ctx.contract.connect(ctx.surveyor).verifySurvey(applicationId);
    await ctx.contract.connect(ctx.registry).verifyAdministrative(applicationId);
    await ctx.contract.connect(ctx.authoriser).authoriseApplication(applicationId);

    return { applicationId, parcelId, holderIdHash };
  }

  async function transferParcel(ctx, parcelId, suffix) {
    const applicationId = id("TRANSFER-" + suffix);
    const holderIdHash = id("HOLDER-" + suffix);

    await ctx.contract.connect(ctx.registry).submitTransferApplication(
      applicationId,
      parcelId,
      holderIdHash,
      id("TRANSFER-SOURCE-" + suffix)
    );
    await ctx.contract.connect(ctx.surveyor).verifySurvey(applicationId);
    await ctx.contract.connect(ctx.registry).verifyAdministrative(applicationId);
    await ctx.contract.connect(ctx.authoriser).authoriseApplication(applicationId);

    return { applicationId, holderIdHash };
  }

  async function assertHistoryInvariant(contract, parcelId, expectedVersion) {
    expect(await contract.getCurrentVersion(parcelId)).to.equal(BigInt(expectedVersion));

    for (let version = 1; version <= expectedVersion; version += 1) {
      const record = await contract.getParcelVersion(parcelId, version);
      expect(record.version).to.equal(BigInt(version));
      expect(record.effectiveAt).to.be.greaterThan(0n);
    }

    const current = await contract.getCurrentParcel(parcelId);
    expect(current.version).to.equal(BigInt(expectedVersion));
  }

  it("preserves monotonic append-only history across generated valid state-transition sequences", async function () {
    this.timeout(300000);

    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom("transfer", "correction", "dispute-cycle"), {
          minLength: 1,
          maxLength: 10,
        }),
        fc.boolean(),
        async (actions, revokeAtEnd) => {
          const ctx = await deployFixture();
          const base = await registerParcel(ctx, "MODEL");

          let expectedVersion = 1;
          let currentHolder = base.holderIdHash;
          await assertHistoryInvariant(ctx.contract, base.parcelId, expectedVersion);

          for (let index = 0; index < actions.length; index += 1) {
            const suffix = `MODEL-${index}-${actions[index]}`;

            if (actions[index] === "transfer") {
              const transfer = await transferParcel(ctx, base.parcelId, suffix);
              expectedVersion += 1;
              currentHolder = transfer.holderIdHash;
            } else if (actions[index] === "correction") {
              currentHolder = id("CORRECTED-HOLDER-" + suffix);
              await ctx.contract.connect(ctx.correctionOfficer).applyCorrection(
                base.parcelId,
                currentHolder,
                id("CORRECTED-SOURCE-" + suffix),
                id("CORRECTED-SPATIAL-" + suffix),
                id("CORRECTION-REASON-" + suffix)
              );
              expectedVersion += 1;
            } else {
              const before = await ctx.contract.getCurrentVersion(base.parcelId);

              await ctx.contract.connect(ctx.disputeOfficer).openDispute(
                base.parcelId,
                id("DISPUTE-" + suffix)
              );

              expect((await ctx.contract.getDispute(base.parcelId)).active).to.equal(true);

              await ctx.contract.connect(ctx.disputeOfficer).resolveDispute(
                base.parcelId,
                id("RESOLUTION-" + suffix)
              );

              expect((await ctx.contract.getDispute(base.parcelId)).active).to.equal(false);
              expect(await ctx.contract.getCurrentVersion(base.parcelId)).to.equal(before);
            }

            await assertHistoryInvariant(ctx.contract, base.parcelId, expectedVersion);
            const current = await ctx.contract.getCurrentParcel(base.parcelId);
            expect(current.holderIdHash).to.equal(currentHolder);
            expect(current.recordState).to.equal(0n);
          }

          if (revokeAtEnd) {
            await ctx.contract.connect(ctx.authoriser).revokeParcel(
              base.parcelId,
              id("FINAL-REVOCATION-SOURCE"),
              id("FINAL-REVOCATION-REASON")
            );

            expectedVersion += 1;
            await assertHistoryInvariant(ctx.contract, base.parcelId, expectedVersion);

            const current = await ctx.contract.getCurrentParcel(base.parcelId);
            expect(current.recordState).to.equal(1n);
            expect(current.versionType).to.equal(3n);

            await expect(
              ctx.contract.connect(ctx.registry).submitTransferApplication(
                id("POST-REVOCATION-TRANSFER"),
                base.parcelId,
                id("POST-REVOCATION-HOLDER"),
                id("POST-REVOCATION-SOURCE")
              )
            ).to.be.revertedWithCustomError(ctx.contract, "ParcelRevokedState");

            await expect(
              ctx.contract.connect(ctx.correctionOfficer).applyCorrection(
                base.parcelId,
                id("POST-REVOCATION-CORRECTED-HOLDER"),
                id("POST-REVOCATION-CORRECTED-SOURCE"),
                id("POST-REVOCATION-CORRECTED-SPATIAL"),
                id("POST-REVOCATION-REASON")
              )
            ).to.be.revertedWithCustomError(ctx.contract, "ParcelRevokedState");
          }
        }
      ),
      {
        seed,
        numRuns,
        endOnFailure: true,
        verbose: true,
      }
    );
  });

  it("always rejects a transfer whose based-on version becomes stale after generated intervening changes", async function () {
    this.timeout(300000);

    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom("transfer", "correction"), {
          minLength: 1,
          maxLength: 5,
        }),
        async (interveningActions) => {
          const ctx = await deployFixture();
          const base = await registerParcel(ctx, "STALE");

          const staleApplicationId = id("STALE-TRANSFER");
          await ctx.contract.connect(ctx.registry).submitTransferApplication(
            staleApplicationId,
            base.parcelId,
            id("STALE-PROPOSED-HOLDER"),
            id("STALE-SOURCE")
          );
          await ctx.contract.connect(ctx.surveyor).verifySurvey(staleApplicationId);
          await ctx.contract.connect(ctx.registry).verifyAdministrative(staleApplicationId);

          let expectedVersion = 1;

          for (let index = 0; index < interveningActions.length; index += 1) {
            const suffix = `INTERVENING-${index}-${interveningActions[index]}`;

            if (interveningActions[index] === "transfer") {
              await transferParcel(ctx, base.parcelId, suffix);
            } else {
              await ctx.contract.connect(ctx.correctionOfficer).applyCorrection(
                base.parcelId,
                id("INTERVENING-HOLDER-" + suffix),
                id("INTERVENING-SOURCE-" + suffix),
                id("INTERVENING-SPATIAL-" + suffix),
                id("INTERVENING-REASON-" + suffix)
              );
            }

            expectedVersion += 1;
            await assertHistoryInvariant(ctx.contract, base.parcelId, expectedVersion);
          }

          await expect(
            ctx.contract.connect(ctx.authoriser).authoriseApplication(staleApplicationId)
          ).to.be.revertedWithCustomError(ctx.contract, "StaleApplication");

          expect(await ctx.contract.getCurrentVersion(base.parcelId)).to.equal(
            BigInt(expectedVersion)
          );
        }
      ),
      {
        seed: seed + 1,
        numRuns,
        endOnFailure: true,
        verbose: true,
      }
    );
  });

  it("preserves dispute freeze invariants for generated prohibited operations", async function () {
    this.timeout(180000);

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("transfer", "correction", "revocation"),
        async (operation) => {
          const ctx = await deployFixture();
          const base = await registerParcel(ctx, "FREEZE");

          await ctx.contract.connect(ctx.disputeOfficer).openDispute(
            base.parcelId,
            id("FREEZE-CASE")
          );

          const versionBefore = await ctx.contract.getCurrentVersion(base.parcelId);

          if (operation === "transfer") {
            await expect(
              ctx.contract.connect(ctx.registry).submitTransferApplication(
                id("FREEZE-TRANSFER"),
                base.parcelId,
                id("FREEZE-NEW-HOLDER"),
                id("FREEZE-TRANSFER-SOURCE")
              )
            ).to.be.revertedWithCustomError(ctx.contract, "ParcelInDispute");
          } else if (operation === "correction") {
            await expect(
              ctx.contract.connect(ctx.correctionOfficer).applyCorrection(
                base.parcelId,
                id("FREEZE-CORRECTED-HOLDER"),
                id("FREEZE-CORRECTED-SOURCE"),
                id("FREEZE-CORRECTED-SPATIAL"),
                id("FREEZE-CORRECTION-REASON")
              )
            ).to.be.revertedWithCustomError(ctx.contract, "ParcelInDispute");
          } else {
            await expect(
              ctx.contract.connect(ctx.authoriser).revokeParcel(
                base.parcelId,
                id("FREEZE-REVOCATION-SOURCE"),
                id("FREEZE-REVOCATION-REASON")
              )
            ).to.be.revertedWithCustomError(ctx.contract, "ParcelInDispute");
          }

          expect(await ctx.contract.getCurrentVersion(base.parcelId)).to.equal(versionBefore);
          expect((await ctx.contract.getDispute(base.parcelId)).active).to.equal(true);
        }
      ),
      {
        seed: seed + 2,
        numRuns: Math.min(numRuns, 60),
        endOnFailure: true,
        verbose: true,
      }
    );
  });
});
