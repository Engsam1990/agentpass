import { useCallback, useEffect, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type PublicClient,
  type WalletClient,
} from "viem";
import { chainConfig } from "../config";

export type InjectedProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export function getInjectedProvider(): InjectedProvider | undefined {
  if (typeof window === "undefined") return undefined;
  const eth = (window as unknown as { ethereum?: InjectedProvider }).ethereum;
  return eth;
}

export function publicClientFor(chainId: number): PublicClient {
  const config = chainConfig(chainId);
  return createPublicClient({ chain: config.chain, transport: http(config.rpc) });
}

export function walletClientFor(chainId: number): WalletClient | undefined {
  const provider = getInjectedProvider();
  if (!provider) return undefined;
  const config = chainConfig(chainId);
  return createWalletClient({
    chain: config.chain,
    transport: custom(provider),
  });
}

/** Waits for a submitted transaction to be mined and throws if it reverted. */
export async function waitForTx(chainId: number, hash: `0x${string}`) {
  const client = publicClientFor(chainId);
  const receipt = await client.waitForTransactionReceipt({ hash, timeout: 180_000 });
  if (receipt.status !== "success") throw new Error(`Transaction reverted: ${hash}`);
  return receipt;
}

export function useWallet() {
  const [address, setAddress] = useState<string>();
  const [chainId, setChainId] = useState<number>();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const provider = getInjectedProvider();
    if (!provider) return;

    const handleAccounts = (accounts: unknown) => {
      const list = (accounts as string[]) ?? [];
      setAddress(list[0]);
    };
    const handleChain = (chain: unknown) => {
      const hex = String(chain);
      setChainId(Number.parseInt(hex, 16));
    };

    provider.on?.("accountsChanged", handleAccounts);
    provider.on?.("chainChanged", handleChain);

    provider
      .request({ method: "eth_accounts" })
      .then((accounts) => handleAccounts(accounts))
      .catch(() => undefined);
    provider
      .request({ method: "eth_chainId" })
      .then((chain) => handleChain(chain))
      .catch(() => undefined);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccounts);
      provider.removeListener?.("chainChanged", handleChain);
    };
  }, []);

  const connect = useCallback(async () => {
    setError(undefined);
    const provider = getInjectedProvider();
    if (!provider) {
      setError("No browser wallet detected. Install Binance Wallet or MetaMask.");
      return;
    }
    setConnecting(true);
    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      const chain = (await provider.request({ method: "eth_chainId" })) as string;
      setAddress(accounts?.[0]);
      setChainId(Number.parseInt(chain, 16));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection rejected");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(undefined);
  }, []);

  const switchChain = useCallback(async (target: number) => {
    const provider = getInjectedProvider();
    if (!provider) return;
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${target.toString(16)}` }],
      });
      setChainId(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not switch network");
    }
  }, []);

  return { address, chainId, connecting, error, connect, disconnect, switchChain };
}
