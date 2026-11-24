export function About({
  registry,
  pointsAddress,
  receiptsAddress,
  explorer,
}: {
  registry?: string;
  pointsAddress?: string;
  receiptsAddress?: string;
  explorer: string;
}) {
  return (
    <div className="grid">
      <div className="card wide">
        <h2>How Agent ID is used</h2>
        <ol className="steps">
          <li>
            <strong>Verification.</strong> The registry calls the Binance Agent ID ERC-721
            collection directly: <code>ownerOf(tokenId)</code> must equal the caller and{" "}
            <code>balanceOf(caller)</code> must be greater than zero. There is no
            off-chain account list and no admin override.
          </li>
          <li>
            <strong>Identity.</strong> The resolved Agent ID handle is stored on-chain with
            the passport, so the passport is bound to the Agent ID, not to an email or a
            social account.
          </li>
          <li>
            <strong>Entitlement.</strong> Check-ins and premium slots re-check Agent ID
            ownership every time, so access follows the Agent ID.
          </li>
        </ol>
      </div>

      <div className="card">
        <h2>Contract addresses</h2>
        {registry ? (
          <ul className="addresses">
            <li>
              <span>AgentIdRegistry</span>
              <a href={`${explorer}/address/${registry}`} target="_blank" rel="noreferrer">
                <code>{registry}</code>
              </a>
            </li>
            {pointsAddress && (
              <li>
                <span>AgentPassToken (PASS)</span>
                <a
                  href={`${explorer}/address/${pointsAddress}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <code>{pointsAddress}</code>
                </a>
              </li>
            )}
            {receiptsAddress && (
              <li>
                <span>AgentReceipt (APRC)</span>
                <a
                  href={`${explorer}/address/${receiptsAddress}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <code>{receiptsAddress}</code>
                </a>
              </li>
            )}
          </ul>
        ) : (
          <p className="muted">No registry configured for this network yet.</p>
        )}
      </div>

      <div className="card">
        <h2>Safety & compliance</h2>
        <ul className="bullets">
          <li>No wallet addresses are published anywhere in the product.</li>
          <li>No credentials, seed phrases or personal data are collected.</li>
          <li>No automatic or scheduled transfers out of user wallets.</li>
          <li>No trading signals, price predictions or return promises.</li>
          <li>Owner powers are limited and disclosed: fees withdrawal, content hashes, slot price, ownership transfer.</li>
          <li>PASS points are a reputation counter with no redemption value.</li>
        </ul>
      </div>
    </div>
  );
}
