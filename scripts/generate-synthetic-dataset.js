const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

const parties = Number(process.env.SYNTHETIC_PARTIES || 1000);
const parcels = Number(process.env.SYNTHETIC_PARCELS || 10000);
const outDir = path.join(process.cwd(), "experiments", "data");
const outFile = path.join(outDir, "synthetic-parcels.csv");

if (!Number.isInteger(parties) || parties <= 0) {
  throw new Error("SYNTHETIC_PARTIES must be a positive integer");
}
if (!Number.isInteger(parcels) || parcels <= 0) {
  throw new Error("SYNTHETIC_PARCELS must be a positive integer");
}

fs.mkdirSync(outDir, { recursive: true });

const rows = [
  "parcel_index,parcel_id,party_index,holder_id_hash,source_manifest_hash,spatial_ref_hash"
];

for (let i = 1; i <= parcels; i += 1) {
  const partyIndex = ((i - 1) % parties) + 1;
  const parcelLabel = String(i).padStart(6, "0");
  const partyLabel = String(partyIndex).padStart(6, "0");

  rows.push([
    i,
    ethers.id(`SYNTH-PARCEL-${parcelLabel}`),
    partyIndex,
    ethers.id(`SYNTH-PARTY-${partyLabel}`),
    ethers.id(`SYNTH-SOURCE-${parcelLabel}`),
    ethers.id(`SYNTH-SPATIAL-${parcelLabel}`)
  ].join(","));
}

fs.writeFileSync(outFile, rows.join("\n") + "\n", "utf8");

console.log(JSON.stringify({
  generated: true,
  parties,
  parcels,
  deterministic: true,
  containsRealPersonalData: false,
  file: path.relative(process.cwd(), outFile)
}, null, 2));
