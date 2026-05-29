import { useCallback, useRef } from "react";

import { useProvider } from "@starknet-start/react";

import type { DecimalsResolver } from "./calls";

/**
 * Returns a resolver for ERC-20 `decimals`, cached per token address so a large
 * CSV reads each token only once instead of once per row.
 */
export function useDecimalsResolver(): DecimalsResolver {
  const { provider } = useProvider();
  const cache = useRef(new Map<string, Promise<number>>());

  return useCallback(
    (tokenAddress: string) => {
      const existing = cache.current.get(tokenAddress);
      if (existing) return existing;

      const promise = provider
        .callContract({ contractAddress: tokenAddress, entrypoint: "decimals", calldata: [] })
        .then((res: string[]) => {
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
    },
    [provider],
  );
}
