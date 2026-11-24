# Submission guide

Two separate forms, two separate tracks. Both require a Binance login.

| Form | Track | Deadline | When to submit |
| --- | --- | --- | --- |
| **Community Promotion** | 2,000 USDC pool, 20 winners | 2026-12-09 08:00 UTC | as soon as the first X post is live |
| **Project** (Pioneer / Innovation) | 58,000 USDC pool | 2026-12-09 08:00 UTC | no later than **2026-12-08**, one day of buffer |

`SUBMISSION_DEADLINE = 2026-12-09 08:00 UTC`

---

## Step 0 — prerequisites checklist

- [ ] BNB for gas in the reward-receiving wallet on BNB Chain (mainnet)
- [ ] `AgentIdRegistry` deployed on **BNB Chain mainnet** and source **verified on BscScan**
- [ ] `AgentPassToken` and `AgentReceipt` addresses noted
- [ ] The dApp is **live and publicly reachable** (not only on localhost)
- [ ] The public GitHub repository is up and public
- [ ] At least one X post with `#BinanceWalletHackathon` and `#AgenticWallet` is live
- [ ] You are logged into Binance in the submission tabs
- [ ] Reward wallet address confirmed (BNB, chain 56)

---

## Form A — Community Promotion

### Fields

| Field | Value |
| --- | --- |
| Project name | `AgentPass` |
| X (Twitter) post link | *(the link to your published post)* |
| Social / X handle | *(your handle)* |
| Description | see below |

### Description

```
AgentPass is an on-chain passport and access registry for Binance Agent ID holders on BNB Chain.

Every action in AgentPass is gated by real Agent ID ownership: the registry contract calls ownerOf(tokenId) and balanceOf(wallet) directly on the Binance Agent ID ERC-721 collection, so a passport can only be created by a wallet that actually owns the Agent ID it submits — no off-chain allowlist, no admin override.

Agent ID holders register once, then check in daily to build a streak and earn PASS reputation points; milestones mint a non-transferable APRC receipt. A premium slot is a real on-chain BNB purchase that unlocks gated content for 30 days, anchored by content hashes stored on-chain. The leaderboard publishes Agent ID handles and points only — wallet addresses are never exposed.

Built for the Binance Wallet × BNB Chain Agent ID Hackathon. Contract source verified on BscScan, repository open-sourced, live on-chain product.
```

### Checklist

- [ ] Post contains **both** `#BinanceWalletHackathon` and `#AgenticWallet`
- [ ] Post is public, not a deleted-draft
- [ ] Post links to the live dApp and/or the repository
- [ ] Post was made from the account whose handle you entered above
- [ ] Submit the form **before** the deadline — do not wait until the last day

Post drafts are in [MARKETING.md](MARKETING.md).

---

## Form B — Project Awards

Submit **once** and choose the award category you are entering. Enter the live URL, verified
contract addresses, Agent ID usage description and repository link.

### Fields

| Field | Value |
| --- | --- |
| Project name | `AgentPass` |
| Category | *Pioneer Award* and/or *Innovation Award* (see the note below) |
| Live product URL | *(the published dApp URL)* |
| GitHub repository | *(the public repo URL)* |
| Agent ID collection used | `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` (SPACE ID Agent ID, symbol `AI`) |
| AgentIdRegistry (verified) | `<REGISTRY>` — BscScan link `<https://bscscan.com/address/...>` |
| AgentPassToken (PASS, verified) | `<PASS_TOKEN>` — BscScan link |
| AgentReceipt (APRC, verified) | `<RECEIPT>` — BscScan link |
| Contract source verified | `Yes` |
| Open-sourced | `Yes` |
| Reward / payout address | *(your BNB address on chain 56)* |
| Team | *(your team name / size)* |

### Category guidance

- **Pioneer Award** — judged on real on-chain data (top 10 by on-chain metrics). No minimum
  number of interacting wallets. **Always eligible.**
- **Innovation Award** — judged by the jury and **requires a live product plus ≥30 interacting
  Agent ID addresses** during the submission period.

Track the interacting-address count with:

```bash
npm run stats -- --network bsc
```

It reads `Registered`, `CheckedIn` and `SlotPurchased` events and prints:

```
Innovation Award threshold (30 interacting Agent ID addresses): MET / NOT MET (n/30)
```

> If you cannot reach 30 unique interacting Agent ID addresses by the deadline, submit for the
> **Pioneer Award** only. Submitting a category you do not meet risks the whole submission.
> Note the Innovation requirement explicitly either way — transparency is better than a
> disqualification.

### Project description

```
AgentPass is an on-chain Agent ID passport and access registry that makes the Binance Agent ID a
functional credential rather than a profile picture.

1. On-chain identity gate. register(agentTokenId) requires agentId.ownerOf(agentTokenId) ==
   msg.sender and agentId.balanceOf(msg.sender) > 0, checked by the contract against the Binance
   Agent ID collection itself. checkIn() and purchaseSlot() re-verify Agent ID ownership on every
   call, so access follows the Agent ID and dies with it. There is no off-chain account list and no
   admin override.

2. Engagement loop. Registered wallets check in on a 4-hour cooldown inside a 24-hour streak
   window. Each check-in mints PASS (ERC-20) reputation points — 10 base plus a 2-point streak
   bonus — and the first check-in and every 7th streak mint a permanent, non-transferable APRC
   receipt (ERC-721) that records the Agent ID token id and the milestone on-chain.

3. Paid access. purchaseSlot() is a real BNB payment that grants a 30-day premium entitlement and
   unlocks gated content; each redemption emits ContentRedeemed with the content hash stored in
   the registry, so the unlocked version is provable independently of our front end. Fees stay in
   the contract until the owner withdraws them — there are no automatic transfers.

4. Privacy by design. The leaderboard publishes Agent ID handles and PASS points only, never
   wallet addresses, so AgentPass cannot be used as a name → wallet lookup. The front end reads
   live state directly from public RPC endpoints; no account, wallet or trust in the operator is
   required to use the read-only product.

Product: a live Vite + React + viem dApp with Overview, Passport, Premium, Leaderboard, Deploy and
About screens, deployable from a wallet signature. Contracts: Solidity 0.8.24, OpenZeppelin 5.1.0,
23 passing unit tests. Source verified on BscScan. Repository open-sourced.
```

### "How does your project use Agent ID?"

```
Agent ID is the identity primitive and the access credential of the whole product.

The AgentIdRegistry contract holds the Binance Agent ID ERC-721 collection
(0x60b9262456de011f7d15a54cdd8c48baaa8b022f) as an immutable address and calls it directly:

- register(agentTokenId): requires ownerOf(agentTokenId) == msg.sender; reverts with
  NotAgentIdOwner otherwise. The token id and its tokenURI (the name.ai handle) are stored in the
  passport, binding the passport to the Agent ID itself.
- checkIn(): requires balanceOf(msg.sender) > 0 on every call, so only real Agent ID holders can
  build streaks or earn points.
- purchaseSlot(): the payment path is Agent ID gated as well, so paid premium access can only be
  bought by an Agent ID holder.
- The leaderboard resolves each registered wallet's Agent ID handle via tokenURI and publishes
  handles + points only, never wallet addresses.

Because all checks are performed by the contract against the canonical collection, eligibility is
verifiable by anyone on BscScan without trusting our UI or our backend — there is no backend.
```

### "Is the product live and usable?"

```
Yes. The dApp is deployed at https://agentpass-9t35.zai-ai.site and reads live data from BNB Chain (chain 56) over public
RPC endpoints. Read-only mode works with no wallet connected. Connected mode supports any EIP-1193
wallet including Binance Wallet Web and MetaMask. All write actions (register, check in, buy
premium slot, redeem gated content) are real on-chain transactions on BNB Chain mainnet.
```

---

## Final pre-submission audit

Run through this before pressing submit.

- [ ] The live URL loads over plain HTTPS from a fresh browser, no wallet connected.
- [ ] The live URL shows non-zero stats and a leaderboard with real entries.
- [ ] The registry link in the form opens BscScan and shows **"Contract Source Code Verified"**.
- [ ] The `PASS` and `APRC` links open BscScan and show **"Contract Source Code Verified"**.
- [ ] The repository URL is public (not private, not "request access") and contains the contract
      source, the tests and this documentation.
- [ ] The repository README shows the same contract addresses as the form.
- [ ] Every action in the product works with a real wallet on a real network (testnet evidence is
      acceptable for the pre-submission check; the form asks for mainnet addresses).
- [ ] The X post is public and contains both required hashtags.
- [ ] The reward address is a BNB address you control on chain 56 — re-check it character by
      character.
- [ ] One project per team, as required by the rules.

---

## Where the forms live

The announcement page is:
`https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf`

The two submission forms are linked from that page. Both require a Binance login, which **you**
must complete — no agent handles credentials.
