import { useState } from "react";
import { AGENT_ID_ABI, REGISTRY_ABI } from "../abis";
import { agentIdAddress, chainConfig } from "../config";
import { formatDate, formatPoints, parseHandle, relativeTime } from "../lib/format";
import type { AgentPassState } from "../lib/useAgentPass";
import { publicClientFor, walletClientFor, waitForTx } from "../lib/wallet";

export function Passport({
  state,
  registry,
  chainId,
  address,
  connectedChainId,
  onSwitchChain,
}: {
  state: AgentPassState;
  registry?: string;
  chainId: number;
  address?: string;
  connectedChainId?: number;
  onSwitchChain: (chainId: number) => void;
}) {
  const [tokenId, setTokenId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string }>();
  const [txHash, setTxHash] = useState<string>();

  const passport = state.passport;
  const handle = passport?.agentTokenURI
    ? parseHandle(passport.agentTokenURI, passport.agentTokenId)
    : undefined;

  const wrongNetwork = connectedChainId !== undefined && connectedChainId !== chainId;

  async function send(
    label: string,
    fn: (wallet: NonNullable<ReturnType<typeof walletClientFor>>) => Promise<string>
  ) {
    setBusy(true);
    setMessage(undefined);
    setTxHash(undefined);
    try {
      const wallet = walletClientFor(chainId);
      if (!wallet) throw new Error("No browser wallet detected");
      const hash = await fn(wallet);
      setTxHash(hash);
      setMessage({ kind: "ok", text: `${label} submitted — waiting for confirmation…` });
      await waitForTx(chainId, hash as `0x${string}`);
      setMessage({ kind: "ok", text: `${label} confirmed` });
      await state.refresh();
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : `${label} failed`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function register() {
    if (!registry) return;
    const id = BigInt(tokenId || "0");
    await send("Registration", async (wallet) => {
      const hash = await wallet.writeContract({
        address: registry as `0x${string}`,
        abi: REGISTRY_ABI,
        functionName: "register",
        args: [id],
        account: address as `0x${string}`,
        chain: chainConfig(chainId).chain,
      });
      return hash;
    });
  }

  async function checkIn() {
    if (!registry) return;
    await send("Check-in", async (wallet) => {
      const hash = await wallet.writeContract({
        address: registry as `0x${string}`,
        abi: REGISTRY_ABI,
        functionName: "checkIn",
        account: address as `0x${string}`,
        chain: chainConfig(chainId).chain,
      });
      return hash;
    });
  }

  async function loadOwnedTokenIds() {
    if (!address) return;
    const client = publicClientFor(chainId);
    const balance = await client.readContract({
      address: agentIdAddress(chainId) as `0x${string}`,
      abi: AGENT_ID_ABI,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    });
    setMessage({ kind: "ok", text: `You hold ${balance.toString()} Agent ID(s)` });
  }

  return (
    <div className="grid">
      <div className="card">
        <h2>Your Agent ID passport</h2>
        {!address ? (
          <p className="muted">
            Connect a wallet that holds a Binance Agent ID to create your passport.
          </p>
        ) : (
          <>
            <div className="row">
              <span className="label">Wallet</span>
              <code>{address}</code>
            </div>
            <div className="row">
              <span className="label">Agent IDs held</span>
              <strong>{state.agentIdBalance?.toString() ?? "—"}</strong>
              <button className="link-button" onClick={loadOwnedTokenIds}>
                refresh
              </button>
            </div>
            {wrongNetwork && (
              <div className="notice">
                Your wallet is on another chain.{" "}
                <button className="link-button" onClick={() => onSwitchChain(chainId)}>
                  Switch to the selected network
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h2>Passport state</h2>
        {!passport?.registered ? (
          <>
            <p className="muted">
              No passport yet. Registration proves on-chain that your wallet owns the
              Agent ID you submit — the contract rejects any mismatch.
            </p>
            <label className="field">
              <span>Agent ID token id</span>
              <input
                type="number"
                min="1"
                placeholder="e.g. 1"
                value={tokenId}
                onChange={(event) => setTokenId(event.target.value)}
              />
            </label>
            <button
              className="primary"
              disabled={!registry || !address || busy || !tokenId}
              onClick={register}
            >
              {busy ? "Working…" : "Register passport"}
            </button>
          </>
        ) : (
          <div className="passport">
            <div className="passport-handle">{handle}</div>
            <div className="passport-grid">
              <div>
                <span className="label">Streak</span>
                <strong>{passport.streak}</strong>
              </div>
              <div>
                <span className="label">Check-ins</span>
                <strong>{passport.checkIns}</strong>
              </div>
              <div>
                <span className="label">PASS points</span>
                <strong>{formatPoints(passport.score)}</strong>
              </div>
              <div>
                <span className="label">Receipts</span>
                <strong>{state.receipts ?? 0}</strong>
              </div>
            </div>
            <div className="row">
              <span className="label">Joined</span>
              <span>{formatDate(passport.joinedAt)}</span>
            </div>
            <div className="row">
              <span className="label">Last check-in</span>
              <span>
                {relativeTime(passport.lastCheckIn)} · next allowed in 4h
              </span>
            </div>
            <div className="row">
              <span className="label">Agent ID</span>
              <span>#{passport.agentTokenId.toString()}</span>
            </div>
            <button className="primary" disabled={!registry || busy} onClick={checkIn}>
              {busy ? "Working…" : "Check in (costs gas only)"}
            </button>
          </div>
        )}

        {message && (
          <p className={message.kind === "ok" ? "success" : "error"}>{message.text}</p>
        )}
        {txHash && (
          <p className="muted">
            Transaction: <code>{txHash.slice(0, 18)}…</code>
          </p>
        )}
      </div>
    </div>
  );
}
