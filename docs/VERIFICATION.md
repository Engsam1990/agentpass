# BscScan source verification

The hackathon requires the contract source to be **verified on BscScan**. AgentPass is deployed
from the same source that is published in this repository, so verification is a straight
"paste the flattened source + constructor arguments" job.

---

## Build settings (must match exactly)

| Setting | Value |
| --- | --- |
| Solidity compiler | `0.8.24` |
| Optimizer | enabled |
| Optimizer runs | `200` |
| Metadata | `bytecodeHash: "none"` |
| EVM version | default (paris) for the BNB Chain deployment |
| Libraries | none |
| Imports | `@openzeppelin/contracts` **5.1.0** |

These come from `hardhat.config.ts`. A mismatch in the optimizer settings or the metadata hash
produces a bytecode mismatch even when the source is identical.

---

## Flattened sources (ready to paste)

The repository includes pre-flattened sources for the BscScan UI:

- `verification/AgentIdRegistry.flattened.sol`
- `verification/AgentPassToken.flattened.sol`
- `verification/AgentReceipt.flattened.sol`

They were generated with Hardhat 2 from the exact sources used for deployment.

---

## Addresses to verify

The registry deploys two helper contracts in its constructor. Each one must be verified
separately on BscScan.

### 1. `AgentIdRegistry`

- **Constructor arguments:** exactly one — the Agent ID collection address:
  ```
  0x60b9262456de011f7d15a54cdd8c48baaa8b022f
  ```
- **Flattened source:** `contracts/AgentIdRegistry.sol` plus its imports
  (`AgentPassToken.sol`, `AgentReceipt.sol`, `interfaces/IAgentId.sol`) — or paste the flattened
  output from:
  ```bash
  npx hardhat flatten contracts/AgentIdRegistry.sol
  ```

### 2. `AgentPassToken` (PASS, ERC-20)

- **Constructor arguments:** exactly one — the **registry address** (not the Agent ID address):
  ```
  <AGENT_ID_REGISTRY_ADDRESS>
  ```
- **Flattened source:** `contracts/AgentPassToken.sol` plus the OpenZeppelin ERC-20 imports.

### 3. `AgentReceipt` (APRC, ERC-721)

- **Constructor arguments:** exactly one — the **registry address**:
  ```
  <AGENT_ID_REGISTRY_ADDRESS>
  ```
- **Flattened source:** `contracts/AgentReceipt.sol` plus the OpenZeppelin ERC-721 / Strings /
  Base64 imports.

The registry address is printed by the deploy script and stored in
`deployments/<network>.json`:

```bash
npm run stats -- --network bsc     # prints Registry
cat deployments/bsc.json
```

> The two helper contracts are deployed by the registry itself, so their `owner`/minter is the
> registry address and not the EOA. That is why the constructor argument is the registry.

---

## Automated verification (CLI)

```bash
# mainnet
npx hardhat verify --network bsc <REGISTRY> 0x60b9262456de011f7d15a54cdd8c48baaa8b022f

# testnet
npx hardhat verify --network bscTestnet <REGISTRY> 0x60b9262456de011f7d15a54cdd8c48baaa8b022f
```

Set `BSCSCAN_API_KEY` in `.env` first. The `etherscan.customChains` entry for chain 97 is
already configured in `hardhat.config.ts`.

For the helper contracts, verify them through the BscScan UI (their constructors take the
registry address and they were deployed by a contract, which the CLI path does not cover
directly).

---

## Manual verification (BscScan UI)

1. Open `https://bscscan.com/address/<address>` (or `https://testnet.bscscan.com/address/<address>`).
2. Click **Contract** → **Code** tab → **Verify & Publish**.
3. Choose the **Solidity** tab and **Flattened** input style.
4. Paste the flattened source (see the "Addresses to verify" section above).
5. Fill in the compiler settings to match the table at the top of this document.
6. Leave **Contract Name** as `AgentIdRegistry` (or `AgentPassToken` / `AgentReceipt`).
7. Paste the constructor arguments from the table above, comma-separated, no quotes.
8. Click **Verify and Publish**.

The page then shows **"Contract Source Code Verified"**.

### If verification reports a bytecode mismatch

- Confirm the compiler version is exactly `0.8.24` (not `0.8.24+commit.xxx` with different
  settings).
- Confirm the optimizer is enabled with **200 runs**.
- Confirm the constructor argument list is exactly one address, lowercase, no quotes, no brackets.
- Confirm you are verifying the right network — mainnet and testnet addresses are not
  interchangeable.

---

## What to capture for the submission

Once all three contracts are verified, save:

- the `AgentIdRegistry` address (mainnet),
- the `AgentPassToken` address,
- the `AgentReceipt` address,
- the BscScan link for each,
- a screenshot or the "Contract Source Code Verified" line for the registry.

These go into the project submission form — see [SUBMISSION.md](SUBMISSION.md).

---

## Verifying the Agent ID usage on-chain

Independently of source verification, reviewers can confirm that Agent ID really gates the
product. In BscScan open the registry and call these read functions:

- `agentId()` → should return `0x60b9262456de011f7d15a54cdd8c48baaa8b022f`
- `hasAgentId(<wallet>)` → `true` for Agent ID holders
- `passportOf(<wallet>)` → shows the registered token id, token URI (the handle), streak, score
- `agentTokenIdOf(<wallet>)` → the Agent ID token id bound to that passport
- `stats()` → agents, check-ins, volume, receipt count

And on the **Read Contract** tab, the `register(uint256)` transaction will revert with
`NotAgentIdOwner()` if the caller does not own the submitted Agent ID — the gate is in the
contract, not in the front end.
