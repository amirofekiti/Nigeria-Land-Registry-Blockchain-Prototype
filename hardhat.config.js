require("@nomicfoundation/hardhat-toolbox");

const sepoliaUrl = process.env.SEPOLIA_RPC_URL || "";
const rawPrivateKey = process.env.SEPOLIA_PRIVATE_KEY || "";
const sepoliaPrivateKey =
  rawPrivateKey && rawPrivateKey.startsWith("0x")
    ? rawPrivateKey
    : rawPrivateKey
      ? `0x${rawPrivateKey}`
      : "";

module.exports = {
  solidity: {
    version: "0.8.37",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    ...(sepoliaUrl && sepoliaPrivateKey
      ? {
          sepolia: {
            url: sepoliaUrl,
            accounts: [sepoliaPrivateKey],
            chainId: 11155111
          }
        }
      : {})
  }
};
