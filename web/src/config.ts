import { defineChain, type Chain } from "viem";
import { bsc, bscTestnet } from "viem/chains";

/** Binance Agent ID collection ("SPACE ID Agent ID", symbol AI) on BNB Chain. */
export const AGENT_ID_ADDRESS = "0x60b9262456de011f7d15a54cdd8c48baaa8b022f";

/** Chain id of the local Hardhat node used for offline development. */
export const LOCAL_CHAIN_ID = 31337;

export const localChain = defineChain({
  id: LOCAL_CHAIN_ID,
  name: "Hardhat Local",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
  blockExplorers: { default: { name: "Local", url: "http://127.0.0.1:8545" } },
  testnet: true,
});

/**
 * Agent ID collection per chain. The production networks always use the real
 * Binance collection; the local chain uses the test-only mock deployment.
 */
export function agentIdAddress(chainId: number): string {
  if (chainId === LOCAL_CHAIN_ID) {
    return import.meta.env.VITE_AGENT_ID_LOCAL || AGENT_ID_ADDRESS;
  }
  return AGENT_ID_ADDRESS;
}

export type SupportedChain = {
  id: number;
  label: string;
  chain: Chain;
  rpc: string;
  explorer: string;
  testnet: boolean;
};

export const CHAINS: SupportedChain[] = [
  {
    id: bsc.id,
    label: "BNB Smart Chain",
    chain: bsc,
    rpc: import.meta.env.VITE_BSC_RPC || "https://bsc-rpc.publicnode.com",
    explorer: "https://bscscan.com",
    testnet: false,
  },
  {
    id: bscTestnet.id,
    label: "BNB Smart Chain Testnet",
    chain: bscTestnet,
    rpc:
      import.meta.env.VITE_BSC_TESTNET_RPC ||
      "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
    explorer: "https://testnet.bscscan.com",
    testnet: true,
  },
  ...(import.meta.env.DEV
    ? [
        {
          id: localChain.id,
          label: "Local dev (Hardhat)",
          chain: localChain,
          rpc: "http://127.0.0.1:8545",
          explorer: "http://127.0.0.1:8545",
          testnet: true,
        },
      ]
    : []),
];

export function chainConfig(chainId: number): SupportedChain {
  return CHAINS.find((c) => c.id === chainId) ?? CHAINS[0];
}

/**
 * Registry addresses. Values can come from:
 *  - env vars baked at build time (VITE_REGISTRY_BSC / VITE_REGISTRY_BSC_TESTNET)
 *  - localStorage (set by the in-dApp deploy panel or by the owner)
 */
export function registryAddress(chainId: number): string | undefined {
  const envKeys: Record<number, string[]> = {
    [bsc.id]: ["VITE_REGISTRY_BSC"],
    [bscTestnet.id]: ["VITE_REGISTRY_BSC_TESTNET"],
    [LOCAL_CHAIN_ID]: ["VITE_REGISTRY_LOCAL"],
  };
  for (const key of envKeys[chainId] ?? []) {
    const fromEnv = import.meta.env[key] as string | undefined;
    if (fromEnv && /^0x[0-9a-fA-F]{40}$/.test(fromEnv)) return fromEnv;
  }

  const stored = localStorage.getItem(`agentpass.registry.${chainId}`);
  if (stored && /^0x[0-9a-fA-F]{40}$/.test(stored)) return stored;
  return undefined;
}

export function saveRegistryAddress(chainId: number, address: string) {
  localStorage.setItem(`agentpass.registry.${chainId}`, address);
}

export function clearRegistryAddress(chainId: number) {
  localStorage.removeItem(`agentpass.registry.${chainId}`);
}

export const GATED_CONTENT_IDS = [1, 2, 3];

/** Content descriptions unlocked by a premium slot (hash is published on-chain). */
export const GATED_CONTENT: Record<number, { title: string; body: string }> = {
  1: {
    title: "Agent Signal Brief #01",
    body: "Premium-only on-chain brief: agent routing patterns observed on BNB Chain this cycle, with the raw content hash anchored in the registry.",
  },
  2: {
    title: "Agent Signal Brief #02",
    body: "Premium-only on-chain brief: the weekly Agent ID activity digest, anchored by a content hash stored in the registry contract.",
  },
  3: {
    title: "Agent Signal Brief #03",
    body: "Premium-only on-chain brief: agent wallet interoperability notes, anchored by a content hash stored in the registry contract.",
  },
};
