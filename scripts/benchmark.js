const fs = require("fs");
const path = require("path");
const os = require("os");
const hre = require("hardhat");
const { ethers } = hre;

const iterations = Number(process.env.BENCH_ITERATIONS || 30);
if (!Number.isInteger(iterations) || iterations <= 0) {
  throw new Error("BENCH_ITERATIONS must be a positive integer");
}

const outDir = path.join(process.cwd(), "experiments", "results");
fs.mkdirSync(outDir, { recursive: true });

const nowNs = () => process.hrtime.bigint();
const elapsedMs = (start) => Number(nowNs() - start) / 1e6;
const id = (value) => ethers.id(value);

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stddev(values) {
  const m = mean(values);
  const variance = values.reduce((acc, x) => acc + ((x - m) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function stats(values) {
  return {
    count: values.length,
    mean: mean(values),
    median: median(values),
    stddev: stddev(values),
    p95: percentile(values, 95),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

async function main() {
  const [
    admin,
    registry,
    surveyor,
    authoriser,
    disputeOfficer,
    correctionOfficer,
  ] = await ethers.getSigners();

  const Factory = await ethers.getContractFactory("LandRegistryPrototype");

  const deployStart = nowNs();
  const contract = await Factory.deploy(admin.address);
  const deploymentTx = contract.deploymentTransaction();
  const deploymentReceipt = await deploymentTx.wait();
  const deploymentLatencyMs = elapsedMs(deployStart);
  const contractAddress = await contract.getAddress();

  const roles = [
    [await contract.REGISTRY_OFFICER_ROLE(), registry.address],
    [await contract.SURVEYOR_ROLE(), surveyor.address],
    [await contract.AUTHORISER_ROLE(), authoriser.address],
    [await contract.DISPUTE_OFFICER_ROLE(), disputeOfficer.address],
    [await contract.CORRECTION_OFFICER_ROLE(), correctionOfficer.address],
  ];

  for (const [role, account] of roles) {
    const tx = await contract.connect(admin).grantRole(role, account);
    await tx.wait();
  }

  const runtimeCode = await ethers.provider.getCode(contractAddress);
  const runtimeBytecodeBytes = (runtimeCode.length - 2) / 2;

  const rows = [];

  async function record(operation, txPromise, context = {}) {
    const start = nowNs();
    const tx = await txPromise;
    const receipt = await tx.wait();
    const latencyMs = elapsedMs(start);

    rows.push({
      sequence: rows.length + 1,
      operation,
      iteration: context.iteration ?? null,
      parcelId: context.parcelId ?? null,
      applicationId: context.applicationId ?? null,
      gasUsed: Number(receipt.gasUsed),
      latencyMs,
      blockNumber: receipt.blockNumber,
      status: receipt.status,
      transactionHash: receipt.hash,
      logCount: receipt.logs.length,
    });

    return receipt;
  }

  const experimentStart = nowNs();
  const parcels = [];

  for (let i = 1; i <= iterations; i += 1) {
    const suffix = String(i).padStart(4, "0");
    const applicationId = id(`BENCH-REG-${suffix}`);
    const parcelId = id(`BENCH-PARCEL-${suffix}`);
    const holderIdHash = id(`BENCH-HOLDER-${suffix}`);
    const sourceManifestHash = id(`BENCH-SOURCE-${suffix}`);
    const spatialRefHash = id(`BENCH-SPATIAL-${suffix}`);

    await record(
      "registration.submit",
      contract.connect(registry).submitRegistrationApplication(
        applicationId,
        parcelId,
        holderIdHash,
        sourceManifestHash,
        spatialRefHash
      ),
      { iteration: i, parcelId, applicationId }
    );

    await record(
      "registration.surveyVerify",
      contract.connect(surveyor).verifySurvey(applicationId),
      { iteration: i, parcelId, applicationId }
    );

    await record(
      "registration.adminVerify",
      contract.connect(registry).verifyAdministrative(applicationId),
      { iteration: i, parcelId, applicationId }
    );

    await record(
      "registration.authorise",
      contract.connect(authoriser).authoriseApplication(applicationId),
      { iteration: i, parcelId, applicationId }
    );

    parcels.push({ i, suffix, parcelId });
  }

  for (const item of parcels) {
    const applicationId = id(`BENCH-TRANSFER-${item.suffix}`);
    const newHolder = id(`BENCH-HOLDER-TRANSFERRED-${item.suffix}`);
    const sourceHash = id(`BENCH-TRANSFER-SOURCE-${item.suffix}`);

    await record(
      "transfer.submit",
      contract.connect(registry).submitTransferApplication(
        applicationId,
        item.parcelId,
        newHolder,
        sourceHash
      ),
      { iteration: item.i, parcelId: item.parcelId, applicationId }
    );

    await record(
      "transfer.surveyVerify",
      contract.connect(surveyor).verifySurvey(applicationId),
      { iteration: item.i, parcelId: item.parcelId, applicationId }
    );

    await record(
      "transfer.adminVerify",
      contract.connect(registry).verifyAdministrative(applicationId),
      { iteration: item.i, parcelId: item.parcelId, applicationId }
    );

    await record(
      "transfer.authorise",
      contract.connect(authoriser).authoriseApplication(applicationId),
      { iteration: item.i, parcelId: item.parcelId, applicationId }
    );
  }

  for (const item of parcels) {
    await record(
      "correction.apply",
      contract.connect(correctionOfficer).applyCorrection(
        item.parcelId,
        id(`BENCH-HOLDER-CORRECTED-${item.suffix}`),
        id(`BENCH-CORRECTION-SOURCE-${item.suffix}`),
        id(`BENCH-CORRECTION-SPATIAL-${item.suffix}`),
        id(`BENCH-CORRECTION-REASON-${item.suffix}`)
      ),
      { iteration: item.i, parcelId: item.parcelId }
    );
  }

  for (const item of parcels) {
    await record(
      "dispute.open",
      contract.connect(disputeOfficer).openDispute(
        item.parcelId,
        id(`BENCH-DISPUTE-${item.suffix}`)
      ),
      { iteration: item.i, parcelId: item.parcelId }
    );

    await record(
      "dispute.resolve",
      contract.connect(disputeOfficer).resolveDispute(
        item.parcelId,
        id(`BENCH-DISPUTE-RESOLUTION-${item.suffix}`)
      ),
      { iteration: item.i, parcelId: item.parcelId }
    );
  }

  for (const item of parcels) {
    await record(
      "revocation.apply",
      contract.connect(authoriser).revokeParcel(
        item.parcelId,
        id(`BENCH-REVOCATION-SOURCE-${item.suffix}`),
        id(`BENCH-REVOCATION-REASON-${item.suffix}`)
      ),
      { iteration: item.i, parcelId: item.parcelId }
    );
  }

  const totalExperimentMs = elapsedMs(experimentStart);

  const groups = {};
  for (const row of rows) {
    if (!groups[row.operation]) groups[row.operation] = [];
    groups[row.operation].push(row);
  }

  const summary = Object.entries(groups).map(([operation, group]) => {
    const gas = group.map((x) => x.gasUsed);
    const latency = group.map((x) => x.latencyMs);
    return {
      operation,
      gas: stats(gas),
      latencyMs: stats(latency),
      meanLogCount: mean(group.map((x) => x.logCount)),
    };
  });

  const metadata = {
    generatedAt: new Date().toISOString(),
    gitSha: process.env.GITHUB_SHA || null,
    githubRunId: process.env.GITHUB_RUN_ID || null,
    network: hre.network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    iterations,
    totalMeasuredTransactions: rows.length,
    totalExperimentMs,
    serialHarnessThroughputTxPerSecond: rows.length / (totalExperimentMs / 1000),
    deployment: {
      contractAddress,
      gasUsed: Number(deploymentReceipt.gasUsed),
      latencyMs: deploymentLatencyMs,
      runtimeBytecodeBytes,
      transactionHash: deploymentReceipt.hash,
    },
    software: {
      node: process.version,
      hardhat: require("hardhat/package.json").version,
      openZeppelinContracts: require("@openzeppelin/contracts/package.json").version,
      solidityConfigured: "0.8.37",
    },
    runner: {
      platform: process.platform,
      arch: process.arch,
      cpuModel: os.cpus()[0]?.model || null,
      cpuCount: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
      githubActions: process.env.GITHUB_ACTIONS === "true",
      runnerOs: process.env.RUNNER_OS || null,
    },
    interpretation: {
      latencyScope: "wall-clock time for a serial transaction send-and-wait cycle on the configured local Hardhat network",
      throughputScope: "serial harness throughput; not public-network capacity",
      containsRealPersonalData: false,
    },
  };

  const rawCsvHeader = [
    "sequence",
    "operation",
    "iteration",
    "parcel_id",
    "application_id",
    "gas_used",
    "latency_ms",
    "block_number",
    "status",
    "transaction_hash",
    "log_count",
  ];

  const rawCsv = [rawCsvHeader.join(",")];
  for (const r of rows) {
    rawCsv.push([
      r.sequence,
      r.operation,
      r.iteration ?? "",
      r.parcelId ?? "",
      r.applicationId ?? "",
      r.gasUsed,
      r.latencyMs.toFixed(6),
      r.blockNumber,
      r.status,
      r.transactionHash,
      r.logCount,
    ].join(","));
  }

  const summaryCsv = [
    [
      "operation",
      "count",
      "gas_mean",
      "gas_median",
      "gas_stddev",
      "gas_p95",
      "gas_min",
      "gas_max",
      "latency_mean_ms",
      "latency_median_ms",
      "latency_stddev_ms",
      "latency_p95_ms",
      "latency_min_ms",
      "latency_max_ms",
      "mean_log_count",
    ].join(",")
  ];

  for (const s of summary) {
    summaryCsv.push([
      s.operation,
      s.gas.count,
      s.gas.mean.toFixed(3),
      s.gas.median.toFixed(3),
      s.gas.stddev.toFixed(3),
      s.gas.p95.toFixed(3),
      s.gas.min,
      s.gas.max,
      s.latencyMs.mean.toFixed(6),
      s.latencyMs.median.toFixed(6),
      s.latencyMs.stddev.toFixed(6),
      s.latencyMs.p95.toFixed(6),
      s.latencyMs.min.toFixed(6),
      s.latencyMs.max.toFixed(6),
      s.meanLogCount.toFixed(3),
    ].join(","));
  }

  fs.writeFileSync(
    path.join(outDir, "benchmark-results.json"),
    JSON.stringify({ metadata, summary, rows }, null, 2),
    "utf8"
  );
  fs.writeFileSync(path.join(outDir, "benchmark-raw.csv"), rawCsv.join("\n") + "\n", "utf8");
  fs.writeFileSync(path.join(outDir, "benchmark-summary.csv"), summaryCsv.join("\n") + "\n", "utf8");

  console.log(JSON.stringify({ metadata, summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
