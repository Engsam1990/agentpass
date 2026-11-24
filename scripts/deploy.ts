import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

/**
 * Deploys the AgentPass system on BNB Chain.
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/deploy.ts --network bsc
 *   DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/deploy.ts --network bscTestnet
 *
 * The Agent ID collection address can be overridden with AGENT_ID_ADDRESS
 * (useful for local mock deployments).
 */
const AGENT_ID_ADDRESS =
  process.env.AGENT_ID_ADDRESS || "0x60b9262456de011f7d15a54cdd8c48baaa8b022f";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Network: ${network.name} (chainId ${network.config.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} BNB`);
  console.log(`Agent ID collection: ${AGENT_ID_ADDRESS}`);

  if (balance === 0n) {
    throw new Error("Deployer has no BNB for gas on this network.");
  }

  const Registry = await ethers.getContractFactory("AgentIdRegistry");
  const registry = await Registry.deploy(AGENT_ID_ADDRESS);
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const points = await registry.points();
  const receipts = await registry.receipts();

  console.log("");
  console.log("=== AgentPass deployed ===");
  console.log(`AgentIdRegistry: ${address}`);
  console.log(`AgentPassToken : ${points}`);
  console.log(`AgentReceipt   : ${receipts}`);
  console.log(`Owner          : ${deployer.address}`);
  console.log("");
  console.log(`BscScan: https://bscscan.com/address/${address}`);
  console.log(
    `Verify: npx hardhat verify --network ${network.name} ${address} ${AGENT_ID_ADDRESS}`
  );

  // Persist the deployment so the frontend and docs can pick it up.
  const outDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        network: network.name,
        chainId: network.config.chainId,
        registry: address,
        points,
        receipts,
        agentId: AGENT_ID_ADDRESS,
        owner: deployer.address,
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`Deployment recorded in ${file}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
