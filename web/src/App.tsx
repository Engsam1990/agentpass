import { useMemo, useState } from "react";
import { About } from "./components/About";
import { DeployPanel } from "./components/DeployPanel";
import { Leaderboard } from "./components/Leaderboard";
import { Overview } from "./components/Overview";
import { Passport } from "./components/Passport";
import { Premium } from "./components/Premium";
import { CHAINS, chainConfig, registryAddress } from "./config";
import { useAgentPass } from "./lib/useAgentPass";
import { shortAddress } from "./lib/format";
import { useWallet } from "./lib/wallet";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "passport", label: "My passport" },
  { id: "premium", label: "Premium" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "deploy", label: "Deploy" },
  { id: "about", label: "About" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function App() {
  const [tab, setTab] = useState<TabId>("overview");
  const [chainId, setChainId] = useState<number>(CHAINS[0].id);
  const [registryOverride, setRegistryOverride] = useState<string | undefined>();

  const wallet = useWallet();
  const config = chainConfig(chainId);
  const registry = registryOverride ?? registryAddress(chainId);

  const state = useAgentPass(chainId, registry, wallet.address);

  const connectedChainLabel = useMemo(() => {
    if (wallet.chainId === undefined) return undefined;
    return chainConfig(wallet.chainId).label;
  }, [wallet.chainId]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">◈</span>
          <div>
            <h1>AgentPass</h1>
            <p>On-chain passport & access registry for Agent ID holders</p>
          </div>
        </div>

        <div className="controls">
          <label className="select">
            <span>Network</span>
            <select
              value={chainId}
              onChange={(event) => {
                setChainId(Number(event.target.value));
                setRegistryOverride(undefined);
              }}
            >
              {CHAINS.map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.label}
                </option>
              ))}
            </select>
          </label>

          {wallet.address ? (
            <div className="wallet-box">
              <span className="wallet-address">{shortAddress(wallet.address)}</span>
              <span className="muted">
                {connectedChainLabel ?? `chain ${wallet.chainId ?? "?"}`}
              </span>
              <button className="link-button" onClick={wallet.disconnect}>
                disconnect
              </button>
            </div>
          ) : (
            <button className="primary" onClick={wallet.connect} disabled={wallet.connecting}>
              {wallet.connecting ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </div>
      </header>

      {wallet.error && <div className="banner error">{wallet.error}</div>}

      <nav className="tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "tab active" : "tab"}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === "overview" && (
          <Overview state={state} registry={registry} chainLabel={config.label} />
        )}
        {tab === "passport" && (
          <Passport
            state={state}
            registry={registry}
            chainId={chainId}
            address={wallet.address}
            connectedChainId={wallet.chainId}
            onSwitchChain={wallet.switchChain}
          />
        )}
        {tab === "premium" && (
          <Premium
            state={state}
            registry={registry}
            chainId={chainId}
            address={wallet.address}
          />
        )}
        {tab === "leaderboard" && <Leaderboard state={state} />}
        {tab === "deploy" && (
          <DeployPanel
            chainId={chainId}
            chainLabel={config.label}
            address={wallet.address}
            registry={registry}
            onDeployed={() => setRegistryOverride(undefined)}
          />
        )}
        {tab === "about" && (
          <About
            registry={registry}
            pointsAddress={state.pointsAddress}
            receiptsAddress={state.receiptsAddress}
            explorer={config.explorer}
          />
        )}
      </main>

      <footer className="footer">
        <p>
          AgentPass · built for the Binance Wallet × BNB Chain Agent ID Hackathon ·{" "}
          <span className="muted">
            PASS points have no redemption value and are not an investment.
          </span>
        </p>
        <p className="muted">
          Agent ID collection: <code>0x60b9262456de011f7d15a54cdd8c48baaa8b022f</code>
        </p>
      </footer>
    </div>
  );
}
