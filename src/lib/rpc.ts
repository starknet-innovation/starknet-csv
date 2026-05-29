import { RpcProvider } from "starknet";

// Verified-working Starknet mainnet endpoints (all serve starknet_call).
// publicProvider()'s defaults include a dead node (drpc.org), so we curate.
export const MAINNET_RPCS = [
  "https://rpc.starknet.lava.build",
  "https://api.cartridge.gg/x/starknet/mainnet",
  "https://starknet-rpc.publicnode.com",
];

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const providerCache = new Map<string, RpcProvider>();

function providerFor(nodeUrl: string): RpcProvider {
  let provider = providerCache.get(nodeUrl);
  if (!provider) {
    provider = new RpcProvider({ nodeUrl });
    providerCache.set(nodeUrl, provider);
  }
  return provider;
}

/**
 * Read-only contract call with endpoint failover: tries each mainnet RPC (in a
 * randomized order, for light load-balancing) and returns the first success.
 * Throws only if every endpoint fails, aggregating the errors.
 */
export async function callWithFailover(
  contractAddress: string,
  entrypoint: string,
  calldata: string[] = [],
): Promise<string[]> {
  const errors: string[] = [];

  for (const nodeUrl of shuffled(MAINNET_RPCS)) {
    try {
      return await providerFor(nodeUrl).callContract({ contractAddress, entrypoint, calldata });
    } catch (err) {
      errors.push(`${nodeUrl}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(`all RPC endpoints failed — ${errors.join(" | ")}`);
}
