const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

const iterations = Number(process.env.TESTNET_ITERATIONS || 3);
if (!Number.isInteger(iterations) || iterations <= 0 || iterations > 10) {
  throw new Error("TESTNET_ITERATIONS must be an integer between 1 and 10");
}

if (hre.network.name !== "sepolia") {
  throw new Error("This script must be run with --network sepolia");
}

const outDir = path.join(process.cwd(), "experiments", "results");
fs.mkdirSync(outDir, { recursive: true });

const id = (value) => ethers.id(value);
const nowNs = () => process.hrtime.bigint();
const elapsedMs = (start) => Number(process.hrtime.bigint() - start) / 1e6;

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
function median(values) {
  const s=[...values].sort((a,b)=>a-b);
  const m=Math.floor(s.length/2);
  return s.length%2 ? s[m] : (s[m-1]+s[m])/2;
}
function stddev(values) {
  const m=mean(values);
  return Math.sqrt(values.reduce((a,x)=>a+(x-m)**2,0)/values.length);
}
function p95(values) {
  const s=[...values].sort((a,b)=>a-b);
  return s[Math.max(0,Math.ceil(0.95*s.length)-1)];
}
function stat(values) {
  return {
    count: values.length,
    mean: mean(values),
    median: median(values),
    stddev: stddev(values),
    p95: p95(values),
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

async function main() {
  const [operator] = await ethers.getSigners();
  const provider = ethers.provider;
  const network = await provider.getNetwork();

  const startingBalance = await provider.getBalance(operator.address);
  if (startingBalance === 0n) {
    throw new Error("The Sepolia experiment wallet has no test ETH");
  }

  const Factory = await ethers.getContractFactory("LandRegistryPrototype", operator);

  const deployStart = nowNs();
  const contract = await Factory.deploy(operator.address);
  const deployTx = contract.deploymentTransaction();
  const deployReceipt = await deployTx.wait(1);
  const deployLatencyMs = elapsedMs(deployStart);
  const contractAddress = await contract.getAddress();

  const roles = [
    await contract.REGISTRY_OFFICER_ROLE(),
    await contract.SURVEYOR_ROLE(),
    await contract.AUTHORISER_ROLE(),
    await contract.DISPUTE_OFFICER_ROLE(),
    await contract.CORRECTION_OFFICER_ROLE()
  ];

  for (const role of roles) {
    const tx = await contract.grantRole(role, operator.address);
    await tx.wait(1);
  }

  const rows=[];

  async function record(operation, txPromise, context={}) {
    const start=nowNs();
    const tx=await txPromise;
    const receipt=await tx.wait(1);
    const latency=elapsedMs(start);
    const block=await provider.getBlock(receipt.blockNumber);
    const gasPrice = receipt.gasPrice ? BigInt(receipt.gasPrice) : 0n;
    const feeWei = receipt.gasUsed * gasPrice;

    rows.push({
      sequence: rows.length+1,
      operation,
      iteration: context.iteration ?? null,
      parcelId: context.parcelId ?? null,
      applicationId: context.applicationId ?? null,
      gasUsed: Number(receipt.gasUsed),
      gasPriceWei: gasPrice.toString(),
      transactionFeeWei: feeWei.toString(),
      latencyMs: latency,
      blockNumber: receipt.blockNumber,
      blockTimestamp: block?.timestamp ?? null,
      transactionHash: receipt.hash,
      status: receipt.status,
      logCount: receipt.logs.length
    });
  }

  const parcels=[];
  for (let i=1;i<=iterations;i+=1) {
    const suffix=String(i).padStart(3,"0");
    const applicationId=id(`SEPOLIA-REG-${suffix}`);
    const parcelId=id(`SEPOLIA-PARCEL-${suffix}`);
    await record(
      "registration.submit",
      contract.submitRegistrationApplication(
        applicationId,
        parcelId,
        id(`SEPOLIA-HOLDER-${suffix}`),
        id(`SEPOLIA-SOURCE-${suffix}`),
        id(`SEPOLIA-SPATIAL-${suffix}`)
      ),
      {iteration:i,parcelId,applicationId}
    );
    await record("registration.surveyVerify",contract.verifySurvey(applicationId),{iteration:i,parcelId,applicationId});
    await record("registration.adminVerify",contract.verifyAdministrative(applicationId),{iteration:i,parcelId,applicationId});
    await record("registration.authorise",contract.authoriseApplication(applicationId),{iteration:i,parcelId,applicationId});
    parcels.push({i,suffix,parcelId});
  }

  for (const p of parcels) {
    const applicationId=id(`SEPOLIA-TRANSFER-${p.suffix}`);
    await record(
      "transfer.submit",
      contract.submitTransferApplication(
        applicationId,
        p.parcelId,
        id(`SEPOLIA-NEW-HOLDER-${p.suffix}`),
        id(`SEPOLIA-TRANSFER-SOURCE-${p.suffix}`)
      ),
      {iteration:p.i,parcelId:p.parcelId,applicationId}
    );
    await record("transfer.surveyVerify",contract.verifySurvey(applicationId),{iteration:p.i,parcelId:p.parcelId,applicationId});
    await record("transfer.adminVerify",contract.verifyAdministrative(applicationId),{iteration:p.i,parcelId:p.parcelId,applicationId});
    await record("transfer.authorise",contract.authoriseApplication(applicationId),{iteration:p.i,parcelId:p.parcelId,applicationId});
  }

  for (const p of parcels) {
    await record(
      "correction.apply",
      contract.applyCorrection(
        p.parcelId,
        id(`SEPOLIA-CORRECTED-HOLDER-${p.suffix}`),
        id(`SEPOLIA-CORRECTED-SOURCE-${p.suffix}`),
        id(`SEPOLIA-CORRECTED-SPATIAL-${p.suffix}`),
        id(`SEPOLIA-CORRECTION-REASON-${p.suffix}`)
      ),
      {iteration:p.i,parcelId:p.parcelId}
    );
    await record(
      "dispute.open",
      contract.openDispute(p.parcelId,id(`SEPOLIA-DISPUTE-${p.suffix}`)),
      {iteration:p.i,parcelId:p.parcelId}
    );
    await record(
      "dispute.resolve",
      contract.resolveDispute(p.parcelId,id(`SEPOLIA-RESOLUTION-${p.suffix}`)),
      {iteration:p.i,parcelId:p.parcelId}
    );
    await record(
      "revocation.apply",
      contract.revokeParcel(
        p.parcelId,
        id(`SEPOLIA-REVOCATION-SOURCE-${p.suffix}`),
        id(`SEPOLIA-REVOCATION-REASON-${p.suffix}`)
      ),
      {iteration:p.i,parcelId:p.parcelId}
    );
  }

  const groups={};
  for (const r of rows) {
    (groups[r.operation] ||= []).push(r);
  }
  const summary=Object.entries(groups).map(([operation,g])=>({
    operation,
    gas: stat(g.map(x=>x.gasUsed)),
    latencyMs: stat(g.map(x=>x.latencyMs))
  }));

  const finalBalance=await provider.getBalance(operator.address);
  const result={
    metadata:{
      generatedAt:new Date().toISOString(),
      network:hre.network.name,
      chainId:Number(network.chainId),
      iterations,
      totalMeasuredTransactions:rows.length,
      operatorAddress:operator.address,
      contractAddress,
      gitSha:process.env.GITHUB_SHA||null,
      githubRunId:process.env.GITHUB_RUN_ID||null,
      software:{
        node:process.version,
        hardhat:require("hardhat/package.json").version,
        openZeppelinContracts:JSON.parse(
          fs.readFileSync(path.join(process.cwd(),"node_modules","@openzeppelin","contracts","package.json"),"utf8")
        ).version,
        solidityConfigured:"0.8.37"
      },
      deployment:{
        transactionHash:deployReceipt.hash,
        gasUsed:Number(deployReceipt.gasUsed),
        latencyMs:deployLatencyMs
      },
      wallet:{
        startingBalanceWei:startingBalance.toString(),
        finalBalanceWei:finalBalance.toString(),
        approximateSpendWei:(startingBalance-finalBalance).toString()
      },
      interpretation:{
        containsRealPersonalData:false,
        latencyScope:"end-to-end transaction submission to one-confirmation receipt on Sepolia",
        roleSeparationNote:"one testnet wallet is granted all prototype institutional roles for performance measurement only"
      }
    },
    summary,
    rows
  };

  fs.writeFileSync(path.join(outDir,"testnet-results.json"),JSON.stringify(result,null,2),"utf8");

  const csv=["sequence,operation,iteration,parcel_id,application_id,gas_used,gas_price_wei,transaction_fee_wei,latency_ms,block_number,block_timestamp,transaction_hash,status,log_count"];
  for (const r of rows) {
    csv.push([
      r.sequence,r.operation,r.iteration??"",r.parcelId??"",r.applicationId??"",
      r.gasUsed,r.gasPriceWei,r.transactionFeeWei,r.latencyMs.toFixed(3),
      r.blockNumber,r.blockTimestamp??"",r.transactionHash,r.status,r.logCount
    ].join(","));
  }
  fs.writeFileSync(path.join(outDir,"testnet-raw.csv"),csv.join("\n")+"\n","utf8");

  console.log(JSON.stringify({metadata:result.metadata,summary},null,2));
}

main().catch((error)=>{
  console.error(error);
  process.exitCode=1;
});
