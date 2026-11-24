# Compliance mapping

Every rule from the Binance Wallet × BNB Chain **Agent ID Hackathon** announcement, mapped to the
code and the product surface that satisfies it.

The announcement: <https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf>

---

## 1. Project Awards requirements

| Requirement | How AgentPass satisfies it | Where to look |
| --- | --- | --- |
| Contract deployed on BNB Chain | `AgentIdRegistry` is deployed on chain 56 (mainnet) and chain 97 (testnet) | `scripts/deploy.ts`, `deployments/<network>.json` |
| Source code **verified on BscScan** | All three contracts are published with flattened sources and explicit constructor arguments | `docs/VERIFICATION.md` |
| **Open-sourced** | MIT-licensed public repository containing contracts, tests, scripts, front end and docs | `README.md`, `LICENSE` |
| Genuinely uses **Agent ID** | The Agent ID ERC-721 collection is an immutable dependency of the registry; every action re-checks it | `contracts/AgentIdRegistry.sol` (`register`, `checkIn`, `purchaseSlot`) |
| Product is **live** | Static Vite build reads live chain state over public RPC; read-only mode needs no wallet | `web/` |
| ≥30 interacting Agent ID addresses *(Innovation Award)* | Tracked from contract events, not from a database | `scripts/stats.ts` |

---

## 2. Forbidden behaviours

| Rule | Implementation | Evidence |
| --- | --- | --- |
| No `name → wallet` lookup tool | The leaderboard renders Agent ID handles, token ids and points. Wallet addresses are never displayed in the UI. | `web/src/components/Leaderboard.tsx`, `web/src/lib/useAgentPass.ts` (`leaderboard` → `tokenURI` → `parseHandle`) |
| No QR-code login / no credential collection | The app never asks for a seed phrase, password, email or any off-chain identity. The only input is an EIP-1193 wallet the user already controls. | `web/src/lib/wallet.ts` |
| No automatic or scheduled transfers out of user wallets | The only payable path is `purchaseSlot()`, which the user initiates. The contract has no `transferFrom`, no scheduler, no sweep. | `contracts/AgentIdRegistry.sol` (`purchaseSlot`, `withdrawFees`) |
| No trading signals / price predictions / return promises | No pricing, market or forecast content anywhere. `PASS` is described as a reputation counter with no redemption value. | `web/src/components/About.tsx`, footer disclaimer |
| No impersonation of Binance or Binance Wallet | The project name and branding are original; the Binance collection is referenced only as the Agent ID source | `README.md` |

---

## 3. Privacy

| Principle | Implementation |
| --- | --- |
| Do not publish wallet addresses | The leaderboard resolves each registered wallet's Agent ID handle via `tokenURI` and displays only handle, token id and points. |
| Do not collect personal data | No accounts, no emails, no telemetry, no backend. The only storage is `localStorage` for the registry address per chain. |
| Do not require identity providers | No social login. Connecting a wallet is optional for read-only use. |
| On-chain data is user-controlled | A passport record is created by the user, for the user's own wallet, and only for wallets that hold an Agent ID. |

The registry contract does expose registered addresses through `leaderboard()` and `agentAt(index)`
— this is unavoidable for a contract that maintains a leaderboard and it is required for
on-chain verifiability. The product layer deliberately does not render those addresses. Users
control what they publish by not registering.

---

## 4. Token design

| Token | Standard | Controls |
| --- | --- | --- |
| `PASS` (`AgentPassToken`) | ERC-20 | Minting is restricted to the registry, which is fixed at construction. There is no burn, no pause, no blacklist, no rebase, no admin mint. Not transferable to a fee recipient, has no redemption value. |
| `APRC` (`AgentReceipt`) | ERC-721 | Minting is restricted to the registry. Transfers and burns are blocked in `_update`, so a receipt is permanent proof of activity. Metadata is a self-contained base64 data URI — no IPFS dependency, no external fetch. |

Both tokens explicitly disclaim redemption value in their NatSpec and in the UI footer.

---

## 5. Owner permissions (full disclosure)

The owner of `AgentIdRegistry` — the deploying EOA — has exactly four powers:

| Function | Effect | Mitigation |
| --- | --- | --- |
| `withdrawFees(address payable to)` | Sends the contract's BNB balance to a chosen address | Only withdraws fees already paid in by users; never touches a user's wallet. Emits `FeesWithdrawn`. |
| `setGatedContent(uint256, bytes32)` | Publishes the hash of a gated content item | Cannot alter existing redemptions; `contentRedeemed` is immutable once set. Emits `GatedContentSet`. |
| `setSlotPrice(uint256)` | Changes the premium price | Cannot change existing entitlements; `premiumUntil` is unaffected. Emits `SlotPriceUpdated`. |
| `transferOwnership(address)` | Hands over administration | Single-step, intentional, emits `OwnershipTransferred`. |

The owner **cannot**:

- mint `PASS` outside a genuine Agent ID check-in,
- mint `APRC` receipts outside a genuine check-in milestone,
- create a passport for another wallet, or bypass the Agent ID check,
- pause, freeze, blacklist or reconfigure the registry,
- move user funds automatically, or schedule any transfer,
- change a user's score, streak, premium expiry or joined date,
- mint, burn or transfer `APRC` receipts.

There is no upgradeability. The contract has no proxy and no admin proxy.

---

## 6. Financial and consumer warnings

- `PASS` points have **no redemption value**, are not an investment and are not tradeable for
  anything. Stated in the front-end footer, in the About screen, and in the token NatSpec.
- The premium slot price is a real BNB payment to the contract, disclosed in the UI before the
  purchase, and enforced exactly on-chain (`msg.value != slotPrice` reverts).
- No automatic or recurring charges exist.
- No returns, yields, rewards or appreciation are promised anywhere.
- Fees remain in the contract and are only moved by an explicit owner call that is visible on-chain.

---

## 7. Engineering quality evidence

| Evidence | Command |
| --- | --- |
| 23 passing unit tests covering every contract path | `npx hardhat test` |
| TypeScript type check clean | `cd web && npx tsc -b` |
| Production build succeeds | `cd web && npm run build` |
| On-chain metrics script | `npm run stats -- --network bsc` |

Tests cover: Agent ID ownership rejection, wrong-token-id rejection, double registration,
check-in cooldown, streak window and bonus accounting, receipt milestones, slot price
enforcement, premium expiry, gated-content access control, owner-only administration, PASS mint
restriction, and aggregate metrics.

---

## 8. Open-source and reproducibility

- The exact bytecode deployed on-chain is exported from this repository
  (`web/src/generated/AgentIdRegistry.json`) and can be deployed from the wallet through the
  in-app **Deploy** tab.
- Anyone can reproduce the deployment from the source and verify the resulting bytecode matches
  the verified contract on BscScan.
- `scripts/dev-local.ts` deploys a full local environment with a mock Agent ID collection so the
  entire product can be exercised without spending BNB.

---

## 9. Subprocess rules

- **One project per team.** AgentPass is a single project entry.
- **Community Promotion** requires a public X post containing `#BinanceWalletHackathon` and
  `#AgenticWallet`, posted from the participant's own account. No automated posting, no purchased
  engagement.
- **Reward address** must be a BNB Chain address controlled by the team — the agent never
  handles funds, keys or credentials on the user's behalf.

---

## 10. Known limitations (disclosed)

- The Innovation Award's ≥30 interacting Agent ID addresses depends on community participation and
  cannot be guaranteed by the project alone; the count is tracked honestly from chain events.
- `PASS` points have no use outside the AgentPass front end by design — there is no redemption.
- The premium slot is a paid feature; Agent ID holders can still register and check in with gas
  only, so participation never requires buying anything.
- The front end stores the configured registry address in `localStorage` for convenience; the
  authoritative source remains the chain.
