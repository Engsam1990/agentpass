import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Reads the deployed registry and reports growth metrics for the hackathon
 * submission (the Innovation Award needs >= 30 interacting Agent ID addresses).
 *
 * Usage:
 *   npx hardhat run scripts/stats.ts --network bsc
 */
async function main() {
  const deployFile = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(deployFile)) {
    throw new Error(`No deployment file for ${network.name}. Run the deploy script first.`);
  }
  const deployment = JSON.parse(fs.readFileSync(deployFile, "utf8"));

  const provider = ethers.provider;
  const registry = new ethers.Contract(
    deployment.registry,
    [
      "function stats() view returns (uint256 agents, uint256 checkIns, uint256 volume, uint256 receiptCount)",
      "function totalAgents() view returns (uint256)",
      "function totalCheckIns() view returns (uint256)",
      "function totalVolume() view returns (uint256)",
      "function totalReceipts() view returns (uint256)",
      "function agentsCount() view returns (uint256)",
      "function slotPrice() view returns (uint256)",
      "event Registered(address indexed agent, uint256 indexed agentTokenId)",
      "event CheckedIn(address indexed agent, uint32 streak, uint256 reward, uint256 score)",
      "event SlotPurchased(address indexed agent, uint256 amount, uint64 premiumUntil)",
      "event ContentRedeemed(address indexed agent, uint256 indexed contentId, bytes32 contentHash)"
    ],
    provider
  );

  const stats = await registry.stats();
  const uniqueCheckInAgents = new Set<string>();
  const registeredAgents = new Set<string>();
  const buyers = new Set<string>();
  let checkInEvents = 0;
  let volume = 0n;

  const registeredFilter = registry.filters.Registered();
  const checkInFilter = registry.filters.CheckedIn();
  const slotFilter = registry.filters.SlotPurchased();

  const fromBlock = 0;
  const toBlock = await provider.getBlockNumber();

  const registeredLogs = await registry.queryFilter(registeredFilter, fromBlock, toBlock);
  registeredLogs.forEach((log) => registeredAgents.add(String(log.args.agent)));

  const checkInLogs = await registry.queryFilter(checkInFilter, fromBlock, toBlock);
  checkInEvents = checkInLogs.length;
  checkInLogs.forEach((log) => uniqueCheckInAgents.add(String(log.args.agent)));

  const slotLogs = await registry.queryFilter(slotFilter, fromBlock, toBlock);
  slotLogs.forEach((log) => {
    buyers.add(String(log.args.agent));
    volume += BigInt(log.args.amount);
  });

  const price = await registry.slotPrice();

  console.log(`=== AgentPass metrics on ${network.name} ===`);
  console.log(`Registry            : ${deployment.registry}`);
  console.log(`Registered passports: ${stats.agents}`);
  console.log(`Unique registrants  : ${registeredAgents.size}`);
  console.log(`Check-in events     : ${checkInEvents}`);
  console.log(`Unique check-inners : ${uniqueCheckInAgents.size}`);
  console.log(`Unique slot buyers  : ${buyers.size}`);
  console.log(`Volume (BNB)        : ${ethers.formatEther(stats.volume)}`);
  console.log(`Receipts minted     : ${stats.receiptCount}`);
  console.log(`Slot price (BNB)    : ${ethers.formatEther(price)}`);
  console.log(`Block height        : ${toBlock}`);
  console.log("");
  console.log(
    `Innovation Award threshold (30 interacting Agent ID addresses): ${
      uniqueCheckInAgents.size >= 30 ? "MET" : `NOT MET (${uniqueCheckInAgents.size}/30)`
    }`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
