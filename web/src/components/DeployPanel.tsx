import { useState } from "react";
import { REGISTRY_ABI, REGISTRY_BYTECODE } from "../abis";
import { agentIdAddress, chainConfig, saveRegistryAddress } from "../config";
import { walletClientFor } from "../lib/wallet";

/**
 * Deploys the audited registry bytecode straight from the connected wallet.
 * The private key never touches this machine, a file, or the chat.
 */
export function DeployPanel({
  chainId,
  chainLabel,
  address,
  registry,
  onDeployed,
}: {
  chainId: number;
  chainLabel: string;
  address?: string;
  registry?: string;
  onDeployed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string }>();
  const [deployed, setDeployed] = useState<string>();

  async function deploy() {
    setBusy(true);
    setMessage(undefined);
    try {
      const wallet = walletClientFor(chainId);
      if (!wallet) throw new Error("No browser wallet detected");
      const hash = await wallet.deployContract({
        abi: REGISTRY_ABI,
        bytecode: REGISTRY_BYTECODE,
        args: [agentIdAddress(chainId) as `0x${string}`],
        account: address as `0x${string}`,
        chain: chainConfig(chainId).chain,
      });
      setMessage({
        kind: "ok",
        text: `Deployment submitted: ${hash.slice(0, 14)}… — confirm in your wallet.`,
      });
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Deployment failed",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid">
      <div className="card">
        <h2>Deploy AgentPass</h2>
        <p className="muted">
          This deploys the same bytecode that is open-sourced and unit-tested in this
          repository, straight from your wallet. No private key is requested, stored, or
          transmitted.
        </p>
        <div className="row">
          <span className="label">Network</span>
          <span>{chainLabel}</span>
        </div>
        <div className="row">
          <span className="label">Agent ID collection</span>
          <code>{agentIdAddress(chainId)}</code>
        </div>
        <div className="row">
          <span className="label">Bytecode size</span>
          <span>{(REGISTRY_BYTECODE.length - 2) / 2} bytes</span>
        </div>
        <button className="primary" disabled={!address || busy} onClick={deploy}>
          {busy ? "Deploying…" : "Deploy with wallet signature"}
        </button>
        {!address && <p className="notice">Connect a wallet first.</p>}
        {message && (
          <p className={message.kind === "ok" ? "success" : "error"}>{message.text}</p>
        )}
      </div>

      <div className="card">
        <h2>Point the app at a deployment</h2>
        <p className="muted">
          After the transaction is confirmed, paste the new registry address here. It is
          stored only in this browser (localStorage) and used to read live data.
        </p>
        <label className="field">
          <span>Registry address</span>
          <input
            type="text"
            placeholder="0x…"
            value={deployed ?? ""}
            onChange={(event) => setDeployed(event.target.value)}
          />
        </label>
        <button
          className="secondary"
          disabled={!deployed || !/^0x[0-9a-fA-F]{40}$/.test(deployed ?? "")}
          onClick={() => {
            saveRegistryAddress(chainId, deployed!.trim());
            setMessage({ kind: "ok", text: "Registry address saved for this browser." });
            onDeployed();
          }}
        >
          Use this address
        </button>
        {registry && (
          <p className="muted">
            Current registry: <code>{registry}</code>
          </p>
        )}
      </div>
    </div>
  );
}
