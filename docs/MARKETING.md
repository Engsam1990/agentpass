# Marketing & community playbook

Track: **Community Promotion** — 2,000 USDC pool, 20 winners. Winners are picked from public X
posts that use the required hashtags.

**Required hashtags on every qualifying post:**

```
#BinanceWalletHackathon  #AgenticWallet
```

Both are required. A post missing either one does not qualify.

Post from your own account. Never auto-post from a bot, and never use anyone else's account.

---

## Post 1 — launch (post this first, then submit the promotion form)

```
Built AgentPass for the Binance Wallet × BNB Chain Agent ID Hackathon 🚀

Agent ID shouldn't be a profile picture — it should be a credential.

AgentPass is an on-chain passport & access registry where every action is gated by real Agent ID ownership. The contract calls ownerOf(tokenId) and balanceOf(wallet) directly on the Binance Agent ID collection. No allowlist. No admin override. If you don't own the Agent ID, it reverts.

What you can do:
• Register a passport bound to your Agent ID
• Check in daily to build a streak and earn PASS reputation points
• Mint a non-transferable APRC receipt at every milestone
• Buy a 30-day premium slot with BNB and redeem on-chain gated content

One design choice worth calling out: the leaderboard shows Agent ID handles and points only. We never publish wallet addresses, so AgentPass can't be used as a name → wallet lookup.

Source verified on BscScan. Repo is open. Try it:
<LIVE_URL>
<REPO_URL>

#BinanceWalletHackathon #AgenticWallet
```

---

## Post 2 — the technical deep dive

```
How AgentPass verifies Agent ID on-chain 🧵

The whole product rests on four checks, all performed by the contract:

1️⃣ register(agentTokenId)
   → agentId.ownerOf(agentTokenId) == msg.sender
   → reverts with NotAgentIdOwner() otherwise
   The token id AND its tokenURI (your name.ai handle) get stored in the passport, so the passport is bound to the Agent ID, not to an email.

2️⃣ checkIn()
   → agentId.balanceOf(msg.sender) > 0, re-checked on every single call
   → so if the Agent ID leaves the wallet, the streak dies with it

3️⃣ purchaseSlot()
   → the payment path is Agent ID gated too
   → real BNB, 30-day entitlement, fees stay in the contract until the owner withdraws them. No automatic transfers.

4️⃣ leaderboard()
   → resolves each handle via tokenURI and publishes handles + points only. Wallet addresses are never exposed.

Nothing here trusts our backend, because there is no backend. Read-only mode works from public RPC with no wallet connected. Anyone can verify eligibility in BscScan's Read Contract tab.

Solidity 0.8.24 · OpenZeppelin 5.1.0 · 23 passing unit tests

#BinanceWalletHackathon #AgenticWallet
```

---

## Post 3 — the privacy angle

```
The one feature we almost didn't ship 🧵

A leaderboard is easy money and a privacy problem. We had Agent ID handles and the wallets behind them, and joining them is trivial.

So we didn't.

AgentPass publishes Agent ID handles, token ids and PASS points. Wallet addresses are never rendered anywhere in the product. The contract exposes them (it has to, for the leaderboard view) but the front end never shows them.

Why: an Agent ID → wallet directory is exactly the kind of mapping this hackathon's rules warn about, and it would turn a participation tool into a targeting list.

Same reasoning drove the rest of the design:
• No credentials, no seed phrases, no personal data collected
• No automatic or scheduled transfers out of your wallet
• No price predictions, no return promises
• PASS points are a reputation counter with no redemption value
• Owner powers disclosed and narrow: fees, content hashes, slot price, ownership transfer

Everything else about AgentPass:
<LIVE_URL>

#BinanceWalletHackathon #AgenticWallet
```

---

## Post 4 — on-chain receipt

```
We just minted our first APRC receipt on BNB Chain 🪙

AgentPass gives Agent ID holders a permanent, non-transferable proof-of-activity receipt (APRC, ERC-721).

Why non-transferable? Because the receipt's whole value is the claim "this Agent ID did this thing". The moment it becomes tradeable it stops being a receipt and starts being an asset — and we don't want it to be one.

On-chain it records:
• the Agent ID token id behind it
• the milestone (first-check-in, streak-7, ...)
• the minting transaction

And the minting path is narrow on purpose: only the registry can mint, and the registry only mints on a genuine Agent ID check-in.

Try it yourself — connect a wallet that holds an Agent ID:
<LIVE_URL>

#BinanceWalletHackathon #AgenticWallet
```

---

## Post 5 — the paid-access / business model angle

```
AgentPass has a real payment path, and it stays boring on purpose 💳

Premium slot = 0.005 BNB → 30 days of gated access.

What's actually happening on-chain:
• purchaseSlot() requires an active passport AND live Agent ID ownership
• the exact price is enforced (msg.value != slotPrice reverts)
• the slot expiry is stored on-chain, and it extends if you buy again
• each redemption emits ContentRedeemed with the content hash stored in the registry

So the unlocked version is provable independently of our front end. Screenshot it, the chain still says the same thing.

And the fees just sit in the contract until the owner withdraws them. No auto-withdraw, no scheduled payouts, no treasury sweep — you can see every single BNB in the contract balance at all times.

Agent ID holders can register and check in for gas only. No BNB required to join.

<LIVE_URL>

#BinanceWalletHackathon #AgenticWallet
```

---

## Post 6 — asking for the one thing we need

```
We need 30 Agent ID holders to actually use AgentPass before the deadline ⏳

The Innovation Award needs ≥30 interacting Agent ID addresses — real on-chain activity, not signups.

If you hold an Agent ID, this takes about a minute and costs gas only:
1. Open <LIVE_URL>
2. Connect a wallet that holds an Agent ID
3. Register your passport
4. Check in once

That's it. No BNB required, no wallet address published, nothing to sign up for.

We track the count honestly from contract events:
npm run stats -- --network bsc

If it says NOT MET (n/30), we're not there yet, and we'll say so.

#BinanceWalletHackathon #AgenticWallet
```

---

## Short variants (for reposts / quote posts)

```
AgentPass: an on-chain passport where your Binance Agent ID is the credential, not the wallpaper. The contract checks ownerOf() itself. No allowlist, no admin override. #BinanceWalletHackathon #AgenticWallet
```

```
If your Agent ID leaves your wallet, your AgentPass streak should die with it. Ours does. Contract-level check, every call. #BinanceWalletHackathon #AgenticWallet
```

```
Built a leaderboard that publishes handles + points and no wallet addresses. It was the right call. #BinanceWalletHackathon #AgenticWallet
```

---

## Community outreach checklist

- [ ] Post in the **Binance Wallet** X account's replies if it asks for participants
- [ ] Post in the **BNB Chain** X account's replies
- [ ] Binance Square post (same content, adapted)
- [ ] Ask Agent ID holders directly in the relevant community chats — the 30-address target is
      the hardest constraint in the whole submission
- [ ] Reply to every post that mentions AgentPass with the live URL
- [ ] Post the honest progress number in Post 6 rather than hiding it — transparency reads better
      than a vanity metric

Do not buy engagement, use engagement pods, or ask for retweets instead of real usage. The
Innovation Award threshold is measured in **interacting addresses**, so the goal is genuine
on-chain activity.

---

## Weekly metrics check

```bash
npm run stats -- --network bsc
```

Track these numbers week by week and put them in your weekly update post:

- unique registered passports
- unique check-in addresses (this is the number that counts for the 30-address threshold)
- unique premium slot buyers
- BNB volume
- receipts minted

---

## Cadence

| When | What |
| --- | --- |
| Day 0 (after deploy + verify) | Post 1 (launch), then submit the Community Promotion form |
| Day 1 | Post 2 (technical) |
| Day 2 | Post 3 (privacy) |
| Day 3 | Post 4 (receipt) |
| Day 4 | Post 5 (payments) |
| Day 5 | Post 6 (the ask for 30 addresses) |
| Weekly | Metrics update + a short variant + outreach to Agent ID holders |
| **2026-12-08** | **Project submission form submitted** |
| 2026-12-09 08:00 UTC | Deadline |

Every post must contain both hashtags. Every post should contain the live URL.
