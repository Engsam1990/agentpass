/** Extracts a human handle (e.g. `alice.ai`) from an Agent ID token URI. */
export function parseHandle(tokenUri: string, tokenId: bigint | number): string {
  if (!tokenUri) return `agent-${tokenId}`;

  // data:application/json;base64,... => decode and look for a "name" field.
  if (tokenUri.startsWith("data:")) {
    try {
      const base64 = tokenUri.split(",")[1] ?? "";
      const json = JSON.parse(atob(base64));
      const name = typeof json.name === "string" ? json.name : undefined;
      if (name) return name.replace(/\.ai$/i, "") + ".ai";
    } catch {
      /* fall through to regex */
    }
  }

  const match = tokenUri.match(/([A-Za-z0-9][A-Za-z0-9_-]*)\.ai/i);
  if (match) return `${match[1].toLowerCase()}.ai`;

  const jsonName = tokenUri.match(/"name"\s*:\s*"([^"]+)"/i);
  if (jsonName) return jsonName[1].replace(/\.ai$/i, "") + ".ai";

  return `agent-${tokenId}`;
}

export function shortAddress(address?: string): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatBnb(value: bigint | undefined, decimals = 4): string {
  if (value === undefined) return "—";
  const whole = value / 10n ** 18n;
  const frac = (value % 10n ** 18n).toString().padStart(18, "0").slice(0, decimals);
  return `${whole}.${frac}`;
}

export function formatPoints(value: bigint | undefined): string {
  if (value === undefined) return "0";
  return (value / 10n ** 18n).toLocaleString();
}

export function formatDate(unixSeconds: bigint | number | undefined): string {
  if (!unixSeconds) return "—";
  const ms = Number(unixSeconds) * 1000;
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  return new Date(ms).toLocaleString();
}

export function relativeTime(unixSeconds: bigint | number | undefined): string {
  if (!unixSeconds) return "never";
  const delta = Math.floor(Date.now() / 1000) - Number(unixSeconds);
  if (delta < 60) return `${Math.max(delta, 0)}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}
