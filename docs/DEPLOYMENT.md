# Deployment guide

Two deployment paths are supported. Pick one.

| Path | Private key location | Best for |
| --- | --- | --- |
| **A — dApp wallet signature** | never leaves the wallet | mainnet production deploy; nothing sensitive on disk |
| **B — Hardhat CLI** | `.env` on your machine, gitignored | testnet, scripted redeploys, CI |

Both deploy the **exact same bytecode** — the registry is compiled from
`contracts/AgentIdRegistry.sol` and the ABI/bytecode in `web/src/generated/AgentIdRegistry.json`
is exported from that same build (`npm run export-abi` equivalent via `scripts/export-abi.ts`).

---

## Prerequisites

- Node.js 20+ and npm 10+
- A wallet on **BNB Smart Chain Testnet** (chainId 97) for the testnet deploy
- A wallet on **BNB Smart Chain** (chainId 56) for the mainnet deploy
- BNB for gas:
  - testnet: free BNB from the [BSC faucet](https://www.bnbchain.org/en/testnet-faucet)
  - mainnet: ~0.05 BNB is enough to deploy the registry (it deploys two helper contracts in the
    constructor)
- Optionally a free [BscScan API key](https://bscscan.com/myapikey) for automated verification

Never put a mainnet private key in a file that gets committed, shared, or pasted into a chat.
`.env` is already listed in `.gitignore`.

---

## Path A — deploy from the dApp (recommended for mainnet)

1. Serve the front end:
   ```bash
   cd web
   npm install
   npm run dev        # http://127.0.0.1:5173
   ```
2. Open the app, pick **BNB Smart Chain** in the network selector, and click **Connect wallet**.
3. Open the **Deploy** tab. It shows the network, the Agent ID collection address, and the
   bytecode size that will be deployed.
4. Click **Deploy with wallet signature** and approve the transaction in your wallet.
5. Copy the new contract address from BscScan (or from the explorer link) and paste it into
   **Point the app at a deployment** → **Use this address**. It is stored in `localStorage` for
   that browser only.
6. For the public site, bake the address in at build time instead:
   ```bash
   # web/.env.production
   VITE_REGISTRY_BSC=0x...
   ```
7. Verify the source on BscScan — see [VERIFICATION.md](VERIFICATION.md).

The deploy panel uses `wallet.deployContract` through viem's `custom(provider)` transport, so the
wallet signs and broadcasts. No key, keystore file, or password is requested by the dApp.

---

## Path B — deploy from the CLI

```bash
cp .env.example .env
```

`.env`:

```
DEPLOYER_PRIVATE_KEY=0x...
BSC_RPC_URL=https://bsc-rpc.publicnode.com
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.bnbchain.org:8545
BSCSCAN_API_KEY=...            # optional
```

Then:

```bash
npm install
npx hardhat compile

# testnet
npm run deploy:bscTestnet

# mainnet
npm run deploy:bsc
```

The script prints:

```
=== AgentPass deployed ===
AgentIdRegistry: 0x...
AgentPassToken : 0x...
AgentReceipt   : 0x...
Owner          : 0x...
```

and writes `deployments/bsc.json` (or `deployments/bscTestnet.json`) with the network, chain id,
all three addresses, the Agent ID collection address, the owner and a timestamp.

`AGENT_ID_ADDRESS` can be set in `.env` to override the Agent ID collection — only useful for the
local mock.

---

## Configuration reference

### `.env` (contracts / scripts)

| Variable | Purpose |
| --- | --- |
| `DEPLOYER_PRIVATE_KEY` | deployer key for the CLI path only; leave blank if you use Path A |
| `BSC_RPC_URL` | mainnet JSON-RPC endpoint (default `https://bsc-rpc.publicnode.com`) |
| `BSC_TESTNET_RPC_URL` | testnet JSON-RPC endpoint (default `https://data-seed-prebsc-1-s1.bnbchain.org:8545`) |
| `BSCSCAN_API_KEY` | BscScan key for `hardhat verify` |
| `AGENT_ID_ADDRESS` | override the Agent ID collection address (mock deployments only) |

### `web/.env.local` / `web/.env.production` (front end)

| Variable | Purpose |
| --- | --- |
| `VITE_REGISTRY_BSC` | mainnet `AgentIdRegistry` address |
| `VITE_REGISTRY_BSC_TESTNET` | testnet `AgentIdRegistry` address |
| `VITE_REGISTRY_LOCAL` | local chain registry (written by `scripts/dev-local.ts`) |
| `VITE_AGENT_ID_LOCAL` | local mock Agent ID address (written by `scripts/dev-local.ts`) |
| `VITE_BSC_RPC` | mainnet RPC override |
| `VITE_BSC_TESTNET_RPC` | testnet RPC override |

Anything not set falls back to a sensible default, and a registry address can always be supplied
at runtime through the **Deploy** tab (stored in `localStorage`).

---

## Post-deploy smoke test (testnet)

```bash
# 1. metrics + event log
npm run stats -- --network bscTestnet

# 2. read the registry directly
npx hardhat console --network bscTestnet
```

```js
const reg = await ethers.getContractAt("AgentIdRegistry", "0x...");
await reg.stats();
await reg.slotPrice();
await reg.hasAgentId("0xYourWallet");
```

Then open the site with the network selector on **BNB Smart Chain Testnet** and connect a wallet
that holds an Agent ID, and run through: register → check in → buy premium slot → redeem content.

---

## Publishing the front end

```bash
cd web
npm run build        # emits web/dist
```

`web/dist` is a static bundle — host it on any static host (Cloudflare Pages, Vercel, Netlify,
GitHub Pages, or ZCode Sites). Remember to set the `VITE_REGISTRY_*` variable **before** building,
because Vite inlines env vars at build time.

---

## Troubleshooting

**`Deployer has no BNB for gas on this network`** — fund the deployer address on that network.

**`registry.filters.Registered is not a function`** — the ABI fragment list is malformed; event
fragments must be declared as `"event Registered(...)"`, not `"function event Registered(...)"`.

**The app shows "Registry not deployed on … yet"** — the registry address is not configured for
that chain id. Set `VITE_REGISTRY_BSC` / `VITE_REGISTRY_BSC_TESTNET` and rebuild, or paste the
address in the **Deploy** tab.

**BscScan verification fails with "already verified" or a bytecode mismatch** — confirm the
compiler version (0.8.24), optimizer settings (enabled, 200 runs), `metadata.bytecodeHash = "none"`
and the exact constructor argument. The full constructor argument list is in
[VERIFICATION.md](VERIFICATION.md).
