import { useCallback, useRef } from "react";

import type { DecimalsResolver } from "./calls";
import { callWithFailover } from "./rpc";

/**
 * Returns a resolver for ERC-20 `decimals`, cached per token address so a large
 * CSV reads each token only once instead of once per row. Reads use RPC endpoint
 * failover (see callWithFailover), so a single failing node doesn't break it.
 */
export function useDecimalsResolver(): DecimalsResolver {
  const cache = useRef(new Map<string, Promise<number>>());

  return useCallback((tokenAddress: string) => {
    const existing = cache.current.get(tokenAddress);
    if (existing) return existing;

    const promise = callWithFailover(tokenAddress, "decimals")
      .then((res) => {
        const decimals = Number(BigInt(res[0]));
        if (!Number.isFinite(decimals) || decimals < 0 || decimals > 64) {
          throw new Error(`Unexpected decimals for ${tokenAddress}`);
        }
        return decimals;
      })
      .catch((err: unknown) => {
        cache.current.delete(tokenAddress); // allow retry on failure
        throw new Error(
          `Could not read decimals for token ${tokenAddress}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });

    cache.current.set(tokenAddress, promise);
    return promise;
  }, []);
}
