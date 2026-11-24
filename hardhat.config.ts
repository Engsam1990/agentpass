import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-verify";
import dotenv from "dotenv";

dotenv.config();

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
const accounts = deployerKey ? [deployerKey] : [];

export default {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      metadata: { bytecodeHash: "none" },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC_URL ?? "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
      chainId: 97,
      accounts,
    },
    bsc: {
      url: process.env.BSC_RPC_URL ?? "https://bsc-rpc.publicnode.com",
      chainId: 56,
      accounts,
    },
  },
  etherscan: {
    apiKey: process.env.BSCSCAN_API_KEY ?? "",
    customChains: [
      {
        network: "bscTestnet",
        chainId: 97,
        url: "https://api.bscscan.com",
        explorer: "https://testnet.bscscan.com",
      },
    ],
  },
  mocha: {
    timeout: 120000,
  },
};
