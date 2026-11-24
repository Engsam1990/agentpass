import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Exports the registry ABI + creation bytecode to `web/src/generated/`.
 *
 * This lets the dApp deploy the very same audited bytecode straight from a
 * wallet signature, so no private key ever touches this machine.
 */
async function main() {
  const artifacts = await ethers.getContractFactory("AgentIdRegistry");
  const outDir = path.join(__dirname, "..", "web", "src", "generated");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "AgentIdRegistry.sol",
    "AgentIdRegistry.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const payload = {
    abi: artifact.abi,
    bytecode: artifacts.bytecode,
  };
  const file = path.join(outDir, "AgentIdRegistry.json");
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${file} (${payload.bytecode.length / 2 - 1} bytes of bytecode)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
