import type { ReactNode } from "react";

import { mainnet } from "@starknet-start/chains";
import { publicProvider } from "@starknet-start/providers";
import { StarknetConfig } from "@starknet-start/react";

// Mainnet only, per spec. `publicProvider()` uses public RPC nodes — swap for a
// keyed endpoint (Alchemy/Infura/Blast) if large CSVs hit rate limits.
export function StarknetProvider({ children }: { children: ReactNode }) {
  return (
    <StarknetConfig chains={[mainnet]} provider={publicProvider()} autoConnect>
      {children}
    </StarknetConfig>
  );
}
