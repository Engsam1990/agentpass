import type { AgentPassState } from "../lib/useAgentPass";
import { formatBnb, formatPoints } from "../lib/format";

export function Overview({
  state,
  registry,
  chainLabel,
}: {
  state: AgentPassState;
  registry?: string;
  chainLabel: string;
}) {
  const { stats, loading } = state;

  if (!registry) {
    return (
      <div className="card empty-state">
        <h2>Registry not deployed on {chainLabel} yet</h2>
        <p>
          AgentPass reads live data from the BNB Chain. Deploy the contract with the
          <strong> Deploy </strong> tab (wallet signature — no private key needed) and
          this page fills itself with real on-chain metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="card stat-card">
        <span className="stat-label">Agent ID passports</span>
        <span className="stat-value">{stats ? stats.agents.toString() : "—"}</span>
        <span className="stat-hint">unique Agent ID addresses registered</span>
      </div>
      <div className="card stat-card">
        <span className="stat-label">Check-ins</span>
        <span className="stat-value">{stats ? stats.checkIns.toString() : "—"}</span>
        <span className="stat-hint">daily engagement rounds completed</span>
      </div>
      <div className="card stat-card">
        <span className="stat-label">Premium volume</span>
        <span className="stat-value">
          {stats ? `${formatBnb(stats.volume)} BNB` : "—"}
        </span>
        <span className="stat-hint">paid for time-limited access slots</span>
      </div>
      <div className="card stat-card">
        <span className="stat-label">Receipts minted</span>
        <span className="stat-value">{stats ? stats.receiptCount.toString() : "—"}</span>
        <span className="stat-hint">non-transferable proof-of-activity NFTs</span>
      </div>

      <div className="card wide">
        <h2>What AgentPass does</h2>
        <div className="feature-grid">
          <div>
            <h3>1 · On-chain identity gate</h3>
            <p>
              Every action is gated by real Agent ID ownership. The contract calls
              <code> ownerOf(tokenId) </code> and <code> balanceOf(wallet) </code> on the
              Binance Agent ID collection — no off-chain claims, no trust assumptions.
            </p>
          </div>
          <div>
            <h3>2 · Engagement loop</h3>
            <p>
              Register once, then check in daily. Streaks multiply PASS points, and
              milestones mint a permanent, non-transferable receipt on BNB Chain.
            </p>
          </div>
          <div>
            <h3>3 · Paid access</h3>
            <p>
              A premium slot is a real on-chain purchase that unlocks gated content for
              30 days. Fees are held by the contract and only the owner can withdraw them.
            </p>
          </div>
          <div>
            <h3>4 · Privacy by design</h3>
            <p>
              The leaderboard shows Agent ID handles and points only. Wallet addresses are
              never published, so AgentPass cannot be used as a name → wallet lookup.
            </p>
          </div>
        </div>
        {loading && <p className="muted">Syncing with {chainLabel}…</p>}
      </div>

      <div className="card wide">
        <h2>Live activity</h2>
        {state.activity.length === 0 ? (
          <p className="muted">No on-chain activity yet — be the first Agent ID holder.</p>
        ) : (
          <ul className="feed">
            {state.activity.slice(0, 12).map((entry, index) => (
              <li key={`${entry.txHash}-${index}`}>
                <span className={`dot ${entry.kind}`} />
                <span className="feed-handle">{entry.handle}</span>
                <span className="feed-detail">{entry.detail}</span>
                <span className="feed-block">block {entry.timestamp}</span>
              </li>
            ))}
          </ul>
        )}
        {state.error && <p className="error">Read error: {state.error}</p>}
      </div>
    </div>
  );
}

export function PointsBadge({ value }: { value?: bigint }) {
  return <span className="badge">{formatPoints(value)} PASS</span>;
}
