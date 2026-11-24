import { useCallback, useEffect, useState } from "react";
import { AGENT_ID_ABI, POINTS_ABI, RECEIPT_ABI, REGISTRY_ABI } from "../abis";
import { agentIdAddress } from "../config";
import { parseHandle } from "./format";
import { publicClientFor } from "./wallet";

export type Stats = {
  agents: bigint;
  checkIns: bigint;
  volume: bigint;
  receiptCount: bigint;
};

export type LeaderboardEntry = {
  handle: string;
  score: bigint;
  tokenId: bigint;
  rank: number;
};

export type ActivityEntry = {
  kind: "registered" | "checkin" | "premium";
  handle: string;
  detail: string;
  timestamp: number;
  txHash?: string;
};

export type PassportData = {
  registered: boolean;
  agentTokenId: bigint;
  agentTokenURI: string;
  joinedAt: bigint;
  lastCheckIn: bigint;
  streak: number;
  checkIns: number;
  score: bigint;
  premium: boolean;
  premiumUntil: bigint;
};

export type AgentPassState = {
  loading: boolean;
  error?: string;
  stats?: Stats;
  leaderboard: LeaderboardEntry[];
  activity: ActivityEntry[];
  passport?: PassportData;
  points?: bigint;
  receipts?: number;
  agentIdBalance?: bigint;
  slotPrice?: bigint;
  pointsAddress?: string;
  receiptsAddress?: string;
  refresh: () => Promise<void>;
};

const EMPTY_PASSPORT: PassportData = {
  registered: false,
  agentTokenId: 0n,
  agentTokenURI: "",
  joinedAt: 0n,
  lastCheckIn: 0n,
  streak: 0,
  checkIns: 0,
  score: 0n,
  premium: false,
  premiumUntil: 0n,
};

export function useAgentPass(
  chainId: number,
  registry: string | undefined,
  address: string | undefined
): AgentPassState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [stats, setStats] = useState<Stats>();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [passport, setPassport] = useState<PassportData>();
  const [points, setPoints] = useState<bigint>();
  const [receipts, setReceipts] = useState<number>();
  const [agentIdBalance, setAgentIdBalance] = useState<bigint>();
  const [slotPrice, setSlotPrice] = useState<bigint>();
  const [pointsAddress, setPointsAddress] = useState<string>();
  const [receiptsAddress, setReceiptsAddress] = useState<string>();

  const refresh = useCallback(async () => {
    if (!registry) {
      setStats(undefined);
      setLeaderboard([]);
      setActivity([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    const client = publicClientFor(chainId);

    try {
      const registryAddress = registry as `0x${string}`;
      const agentIdContract = agentIdAddress(chainId) as `0x${string}`;

      const [statsRaw, leaderboardRaw, priceRaw, pointsAddrRaw, receiptsAddrRaw] =
        (await Promise.all([
          client.readContract({
            address: registryAddress,
            abi: REGISTRY_ABI,
            functionName: "stats",
          }),
          client.readContract({
            address: registryAddress,
            abi: REGISTRY_ABI,
            functionName: "leaderboard",
          }),
          client.readContract({
            address: registryAddress,
            abi: REGISTRY_ABI,
            functionName: "slotPrice",
          }),
          client.readContract({
            address: registryAddress,
            abi: REGISTRY_ABI,
            functionName: "points",
          }),
          client.readContract({
            address: registryAddress,
            abi: REGISTRY_ABI,
            functionName: "receipts",
          }),
        ])) as unknown as [
          readonly [bigint, bigint, bigint, bigint],
          readonly [readonly `0x${string}`[], readonly bigint[]],
          bigint,
          `0x${string}`,
          `0x${string}`,
        ];

      setStats({
        agents: statsRaw[0],
        checkIns: statsRaw[1],
        volume: statsRaw[2],
        receiptCount: statsRaw[3],
      });
      setSlotPrice(priceRaw);
      setPointsAddress(pointsAddrRaw as string);
      setReceiptsAddress(receiptsAddrRaw as string);

      const agents = leaderboardRaw[0] as readonly `0x${string}`[];
      const scores = leaderboardRaw[1] as readonly bigint[];

      const entries = await Promise.all(
        agents.map(async (agent, index) => {
          const tokenId = (await client.readContract({
            address: registryAddress,
            abi: REGISTRY_ABI,
            functionName: "agentTokenIdOf",
            args: [agent],
          })) as bigint;
          let handle = `agent-${tokenId}`;
          if (tokenId > 0n) {
            try {
              const uri = (await client.readContract({
                address: agentIdContract,
                abi: AGENT_ID_ABI,
                functionName: "tokenURI",
                args: [tokenId],
              })) as string;
              handle = parseHandle(uri, tokenId);
            } catch {
              handle = `agent-${tokenId}`;
            }
          }
          return { handle, score: scores[index], tokenId, rank: 0 };
        })
      );

      entries.sort((a, b) => (b.score === a.score ? 0 : b.score > a.score ? 1 : -1));
      setLeaderboard(entries.map((entry, index) => ({ ...entry, rank: index + 1 })));

      // Live activity from contract events.
      const fromBlock = 0n;
      const toBlock = await client.getBlockNumber();
      const logs = await client.getContractEvents({
        address: registryAddress,
        abi: REGISTRY_ABI,
        fromBlock,
        toBlock,
      });

      const handleCache = new Map<string, string>();
      const resolveHandle = async (agent: string, tokenId?: bigint) => {
        if (handleCache.has(agent)) return handleCache.get(agent)!;
        let id = tokenId ?? 0n;
        if (tokenId === undefined) {
          try {
            id = (await client.readContract({
              address: registryAddress,
              abi: REGISTRY_ABI,
              functionName: "agentTokenIdOf",
              args: [agent as `0x${string}`],
            })) as bigint;
          } catch {
            id = 0n;
          }
        }
        let handle = `agent-${id}`;
        if (id > 0n) {
          try {
            const uri = (await client.readContract({
              address: agentIdContract,
              abi: AGENT_ID_ABI,
              functionName: "tokenURI",
              args: [id],
            })) as string;
            handle = parseHandle(uri, id);
          } catch {
            /* keep fallback */
          }
        }
        handleCache.set(agent, handle);
        return handle;
      };

      const feed: ActivityEntry[] = [];
      for (const log of logs) {
        const block = log.blockNumber ?? 0n;
        const timestamp = Number(block);
        const args = log.args as Record<string, unknown>;
        const agent = String(args.agent ?? "");

        if (log.eventName === "Registered") {
          const tokenId = args.agentTokenId as bigint;
          feed.push({
            kind: "registered",
            handle: await resolveHandle(agent, tokenId),
            detail: `registered Agent ID #${tokenId}`,
            timestamp,
            txHash: log.transactionHash,
          });
        } else if (log.eventName === "CheckedIn") {
          feed.push({
            kind: "checkin",
            handle: await resolveHandle(agent),
            detail: `checked in — streak ${String(args.streak)}`,
            timestamp,
            txHash: log.transactionHash,
          });
        } else if (log.eventName === "SlotPurchased") {
          feed.push({
            kind: "premium",
            handle: await resolveHandle(agent),
            detail: "activated a premium slot",
            timestamp,
            txHash: log.transactionHash,
          });
        }
      }
      feed.sort((a, b) => b.timestamp - a.timestamp);
      setActivity(feed.slice(0, 40));

      if (address) {
        // `passportOf` returns a named struct, so viem decodes it to an object.
        // Fall back to positional access for older/unnamed ABIs.
        const raw = (await client.readContract({
          address: registryAddress,
          abi: REGISTRY_ABI,
          functionName: "passportOf",
          args: [address as `0x${string}`],
        })) as unknown;
        const tuple = Array.isArray(raw)
          ? (raw as unknown as readonly [bigint, string, bigint, bigint, number, number, bigint, boolean, boolean, bigint])
          : undefined;
        const named = (raw ?? {}) as Record<string, unknown>;
        const field = <T,>(index: number, key: string, fallback: T): T => {
          const value = tuple ? tuple[index] : named[key];
          return (value === undefined ? fallback : value) as T;
        };
        setPassport({
          registered: field(7, "registered", false),
          agentTokenId: field(0, "agentTokenId", 0n),
          agentTokenURI: field(1, "agentTokenURI", ""),
          joinedAt: field(2, "joinedAt", 0n),
          lastCheckIn: field(3, "lastCheckIn", 0n),
          streak: Number(field(4, "streak", 0)),
          checkIns: Number(field(5, "checkIns", 0)),
          score: field(6, "score", 0n),
          premium: field(8, "premium", false),
          premiumUntil: field(9, "premiumUntil", 0n),
        });

        const [balance, receiptBalance, agentBalance] = (await Promise.all([
          client.readContract({
            address: pointsAddrRaw,
            abi: POINTS_ABI,
            functionName: "balanceOf",
            args: [address as `0x${string}`],
          }),
          client.readContract({
            address: receiptsAddrRaw,
            abi: RECEIPT_ABI,
            functionName: "balanceOf",
            args: [address as `0x${string}`],
          }),
          client.readContract({
            address: agentIdContract,
            abi: AGENT_ID_ABI,
            functionName: "balanceOf",
            args: [address as `0x${string}`],
          }),
        ])) as unknown as [bigint, bigint, bigint];
        setPoints(balance);
        setReceipts(Number(receiptBalance));
        setAgentIdBalance(agentBalance);
      } else {
        setPassport(undefined);
        setPoints(undefined);
        setReceipts(undefined);
        setAgentIdBalance(undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read chain data");
      setPassport(undefined);
    } finally {
      setLoading(false);
    }
  }, [chainId, registry, address]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return {
    loading,
    error,
    stats,
    leaderboard,
    activity,
    passport,
    points,
    receipts,
    agentIdBalance,
    slotPrice,
    pointsAddress,
    receiptsAddress,
    refresh,
  };
}

export { EMPTY_PASSPORT };
