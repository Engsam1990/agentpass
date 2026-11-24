import { useState } from "react";
import { REGISTRY_ABI } from "../abis";
import { GATED_CONTENT, GATED_CONTENT_IDS, chainConfig } from "../config";
import { formatBnb, formatDate } from "../lib/format";
import type { AgentPassState } from "../lib/useAgentPass";
import { walletClientFor, waitForTx } from "../lib/wallet";

export function Premium({
  state,
  registry,
  chainId,
  address,
}: {
  state: AgentPassState;
  registry?: string;
  chainId: number;
  address?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string }>();
  const [redeemed, setRedeemed] = useState<number[]>([]);

  const passport = state.passport;
  const active = passport?.registered && passport.premium;

  async function purchase() {
    if (!registry || !address) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const wallet = walletClientFor(chainId);
      if (!wallet) throw new Error("No browser wallet detected");
      const hash = await wallet.writeContract({
        address: registry as `0x${string}`,
        abi: REGISTRY_ABI,
        functionName: "purchaseSlot",
        value: state.slotPrice ?? 0n,
        account: address as `0x${string}`,
        chain: chainConfig(chainId).chain,
      });
      setMessage({
        kind: "ok",
        text: `Premium slot submitted — tx ${hash.slice(0, 12)}…`,
      });
      await waitForTx(chainId, hash as `0x${string}`);
      setMessage({ kind: "ok", text: "Premium slot active for 30 days." });
      await state.refresh();
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Purchase failed",
      });
    } finally {
      setBusy(false);
    }
  }

  async function redeem(contentId: number) {
    if (!registry || !address) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const wallet = walletClientFor(chainId);
      if (!wallet) throw new Error("No browser wallet detected");
      const hash = await wallet.writeContract({
        address: registry as `0x${string}`,
        abi: REGISTRY_ABI,
        functionName: "redeemGatedContent",
        args: [BigInt(contentId)],
        account: address as `0x${string}`,
        chain: chainConfig(chainId).chain,
      });
      setRedeemed((current) => [...current, contentId]);
      setMessage({ kind: "ok", text: `Redemption submitted — tx ${hash.slice(0, 12)}…` });
      await waitForTx(chainId, hash as `0x${string}`);
      setMessage({ kind: "ok", text: "Content unlocked on-chain." });
      await state.refresh();
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Redemption failed",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid">
      <div className="card">
        <h2>Premium slot</h2>
        <p className="muted">
          A premium slot is a real on-chain purchase (BNB) that unlocks gated content for
          30 days. Fees stay in the contract until the owner withdraws them — there are no
          automatic transfers.
        </p>
        <div className="row">
          <span className="label">Price</span>
          <strong>{formatBnb(state.slotPrice)} BNB</strong>
        </div>
        <div className="row">
          <span className="label">Duration</span>
          <span>30 days</span>
        </div>
        {passport?.registered ? (
          <>
            <div className="row">
              <span className="label">Status</span>
              <span className={active ? "success" : "muted"}>
                {active ? `active until ${formatDate(passport.premiumUntil)}` : "not active"}
              </span>
            </div>
            <button className="primary" disabled={!registry || busy} onClick={purchase}>
              {busy ? "Working…" : "Buy premium slot"}
            </button>
          </>
        ) : (
          <p className="notice">Register your Agent ID passport first.</p>
        )}
        {message && (
          <p className={message.kind === "ok" ? "success" : "error"}>{message.text}</p>
        )}
      </div>

      <div className="card">
        <h2>Gated content</h2>
        <p className="muted">
          Each item is anchored on-chain: the registry stores a content hash that proves
          which version was unlocked.
        </p>
        {GATED_CONTENT_IDS.map((id) => {
          const item = GATED_CONTENT[id];
          const unlocked = redeemed.includes(id) || Boolean(active);
          return (
            <div key={id} className="content-item">
              <div>
                <h3>{item.title}</h3>
                {unlocked ? (
                  <p className="muted">{item.body}</p>
                ) : (
                  <p className="muted">Locked — requires an active premium slot.</p>
                )}
              </div>
              <button
                className="secondary"
                disabled={!registry || busy || !unlocked || !address}
                onClick={() => redeem(id)}
              >
                {redeemed.includes(id) ? "Redeemed" : "Redeem on-chain"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
