# AgentPass

**On-chain Agent ID passport & access registry for the Binance Wallet × BNB Chain Agent ID Hackathon.**

**Live app:** https://agentpass-9t35.zai-ai.site
**Source:** https://github.com/Engsam1990/agentpass

AgentPass turns the Binance **Agent ID** (the on-chain `name.ai` identity of an Agentic Wallet,
ERC-721 `SPACE ID Agent ID`, symbol `AI`, at
`0x60b9262456de011f7d15a54cdd8c48baaa8b022f` on BNB Chain) into a real, verifiable credential:

- **Identity gate.** A passport can only be created by a wallet that actually owns the Agent ID
  it submits. The contract calls `ownerOf(tokenId)` and `balanceOf(wallet)` on the Binance
  collection itself — there is no off-chain allowlist and no admin override.
- **Engagement loop.** Registered wallets check in on a 4-hour cooldown, building a 24-hour
  streak and earning `PASS` reputation points. Milestones mint a permanent, non-transferable
  `APRC` receipt.
- **Paid access.** A premium slot is a real on-chain BNB purchase that unlocks gated content for
  30 days; each redemption is anchored by a content hash stored in the registry.
- **Privacy by design.** The leaderboard publishes **Agent ID handles and points only** — never
  wallet addresses — so AgentPass cannot be used as a `name → wallet` directory.

Everything is verifiable from a public RPC endpoint: no account, no wallet, and no trust in the
operator is required to read the state of the product.

---

## Why Agent ID matters here

An Agent ID is not a cosmetic badge in this product. It is the credential:

| Action | On-chain check performed by `AgentIdRegistry` |
| --- | --- |
| `register(agentTokenId)` | `agentId.ownerOf(agentTokenId) == msg.sender` — reverts otherwise |
| `checkIn()` | `agentId.balanceOf(msg.sender) > 0` — reverts otherwise |
| `purchaseSlot()` | `agentId.balanceOf(msg.sender) > 0` — reverts otherwise |
| `redeemGatedContent(id)` | requires an active premium slot, which itself required Agent ID |

If the Agent ID leaves the wallet, the passport stops working. Access follows the identity, not
an email, not a social login, and not a database row.

---

## Architecture

```
contracts/
  AgentIdRegistry.sol        core registry: passports, check-ins, premium slots, gated content
  AgentPassToken.sol         PASS (ERC-20) — reputation points, mintable only by the registry
  AgentReceipt.sol           APRC (ERC-721) — non-transferable proof-of-activity receipts
  interfaces/IAgentId.sol    minimal interface for the Binance Agent ID collection
  mocks/MockAgentId.sol      test-only mock of the Agent ID collection

web/                         Vite + React + TypeScript + viem front end
  src/components/            Overview, Passport, Premium, Leaderboard, Deploy, About
  src/lib/useAgentPass.ts    all on-chain reads (stats, leaderboard, activity, passport)
  src/lib/wallet.ts          EIP-1193 wallet client + transaction confirmation helper

scripts/
  deploy.ts                  CLI deployment (BNB Chain / testnet)
  dev-local.ts               deploys a mock Agent ID + registry to a local chain and seeds it
  export-abi.ts              exports the registry ABI + bytecode for the front end
  stats.ts                   reads registry events to report hackathon growth metrics

test/AgentIdRegistry.test.ts 23 unit tests covering every contract path
docs/                        DEPLOYMENT, VERIFICATION, SUBMISSION, MARKETING, COMPLIANCE
```

### Contract model

`AgentIdRegistry` deploys `AgentPassToken` and `AgentReceipt` in its constructor and is their
only minter. It stores a `Passport` struct per address:

```solidity
struct Passport {
    uint256 agentTokenId;
    string  agentTokenURI;   // resolves to the Agent ID handle
    uint64  joinedAt;
    uint64  lastCheckIn;
    uint32  streak;
    uint32  checkIns;
    uint256 score;           // PASS points
    bool    registered;
    bool    premium;
    uint64  premiumUntil;
}
```

Key parameters:

| Constant | Value | Meaning |
| --- | --- | --- |
| `CHECK_IN_COOLDOWN` | 4 hours | minimum delay between check-ins |
| `STREAK_WINDOW` | 24 hours | a check-in inside this window continues the streak |
| `SLOT_DURATION` | 30 days | premium slot length |
| `POINTS_PER_CHECK_IN` | 10 PASS | base reward |
| `STREAK_BONUS` | 2 PASS | extra reward per streak level |
| `slotPrice` | 0.005 BNB | owner-adjustable premium price |

**Owner powers are minimal and fully disclosed:** withdraw collected fees, publish gated-content
hashes, change the slot price, transfer ownership. The owner **cannot** mint `PASS`, mint
receipts, forge a passport, bypass the Agent ID requirement, pause the registry, or move user
funds automatically. See [docs/COMPLIANCE.md](docs/COMPLIANCE.md).

---

## Quick start

### Prerequisites

- Node.js 20+ (developed on Node 26)
- npm 10+
- A BNB Chain wallet for deployment (testnet BNB for `bscTestnet`, BNB for mainnet)

### Contracts

```bash
npm install
npx hardhat compile
npx hardhat test
```

### Local end-to-end run (no deployment to a public network needed)

```bash
# terminal 1 — local chain
npx hardhat node

# terminal 2 — deploy the mock Agent ID + registry, mint Agent IDs, seed activity
npx hardhat run scripts/dev-local.ts --network localhost

# terminal 3 — front end
cd web
npm install
npm run dev        # http://127.0.0.1:5173
```

`dev-local.ts` writes `deployments/localhost.json` and `web/.env.local`, so the front end points
at the freshly deployed registry automatically. Restart Vite after the script finishes so it picks
up the new `.env.local`.

### Deploy to BNB Chain

```bash
cp .env.example .env       # fill in DEPLOYER_PRIVATE_KEY and (optionally) BSCSCAN_API_KEY
npm run deploy:bscTestnet  # chainId 97
npm run deploy:bsc         # chainId 56
```

The script prints the registry, `PASS` token and receipt addresses and records them in
`deployments/<network>.json`.

**Prefer not to put a private key on this machine?** Use the **Deploy** tab inside the dApp: it
deploys the same audited bytecode through your wallet signature, so the key never touches a file,
an env var, or a chat log.

### Verify the source on BscScan

```bash
npx hardhat verify --network bsc <REGISTRY_ADDRESS> 0x60b9262456de011f7d15a54cdd8c48baaa8b022f
```

See [docs/VERIFICATION.md](docs/VERIFICATION.md) for the manual UI path and for the
`AgentPassToken` / `AgentReceipt` constructor arguments.

### Point the front end at a deployment

```bash
# web/.env.local (or .env.production)
VITE_REGISTRY_BSC=0x...            # mainnet
VITE_REGISTRY_BSC_TESTNET=0x...    # testnet
```

```bash
cd web && npm run build
```

The deployed site can also be pointed at a registry at runtime via the **Deploy** tab, which
stores the address in `localStorage` for the current browser.

---

## Front-end screens

| Screen | What it shows |
| --- | --- |
| **Overview** | live aggregate metrics (passports, check-ins, BNB volume, receipts) and the recent event feed, rendered from contract logs |
| **My passport** | wallet's Agent ID balance, the passport (handle, streak, check-ins, PASS points, receipts), registration and check-in actions |
| **Premium** | premium slot price and status, purchase button, gated content with on-chain redemption |
| **Leaderboard** | rank, Agent ID handle, token id and PASS points — **no wallet addresses** |
| **Deploy** | wallet-signature deployment of the registry and runtime address configuration |
| **About** | exactly how Agent ID is used, contract addresses, safety and compliance summary |

Read-only mode works with no wallet connected. Connected mode supports any EIP-1193 wallet
(Binance Wallet Web, MetaMask, …) and reads the chain with viem.

---

## Testing

```bash
npx hardhat test     # 23 passing
cd web && npx tsc -b # type check, clean
cd web && npm run build
```

The unit tests cover: Agent ID ownership rejection, wrong-token-id rejection, double
registration, check-in cooldown and streak accounting, receipt milestones, slot price
enforcement, premium expiry, gated-content access control, owner-only administration, PASS
mint restrictions, and aggregate metrics.

---

## Tracking the hackathon metrics

```bash
npm run stats -- --network bsc
```

Reads `Registered`, `CheckedIn` and `SlotPurchased` events straight from the chain and reports
unique interacting Agent ID addresses against the Innovation Award threshold of 30.

---

## Safety and compliance

- No wallet addresses are published anywhere in the product.
- No credentials, seed phrases or personal data are collected.
- No automatic or scheduled transfers out of user wallets.
- No trading signals, price predictions or return promises.
- `PASS` points are a reputation counter with **no redemption value** and are not an investment.

Full mapping of rules to implementation: [docs/COMPLIANCE.md](docs/COMPLIANCE.md).

---

## License

MIT
