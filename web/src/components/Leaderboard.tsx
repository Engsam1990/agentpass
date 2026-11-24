import { formatPoints } from "../lib/format";
import type { AgentPassState } from "../lib/useAgentPass";

export function Leaderboard({ state }: { state: AgentPassState }) {
  return (
    <div className="card wide">
      <h2>Leaderboard</h2>
      <p className="muted">
        Ranked by PASS reputation points earned through check-ins. Handles only — wallet
        addresses are never published, so AgentPass cannot be used as a directory.
      </p>
      {state.leaderboard.length === 0 ? (
        <p className="muted">No entries yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Agent ID</th>
              <th>Token id</th>
              <th>PASS points</th>
            </tr>
          </thead>
          <tbody>
            {state.leaderboard.map((entry) => (
              <tr key={`${entry.rank}-${entry.handle}`}>
                <td>{entry.rank}</td>
                <td className="handle">{entry.handle}</td>
                <td>#{entry.tokenId.toString()}</td>
                <td>{formatPoints(entry.score)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
