import { type ReactNode, useEffect } from "react";

import { mainnet } from "@starknet-start/chains";
import { createStore } from "@starknet-io/get-starknet-discovery";
import { jsonRpcProvider } from "@starknet-start/providers";
import { StarknetConfig } from "@starknet-start/react";

// `publicProvider()` randomly hits starknet.drpc.org (which doesn't expose
// starknet_call) and forces specVersion "0.10.0", causing "method not found"
// errors when reading token decimals. Use a curated list of working mainnet
// endpoints and let starknet.js negotiate the spec version.
const MAINNET_RPCS = [
  "https://rpc.starknet.lava.build",
  "https://api.cartridge.gg/x/starknet/mainnet",
  "https://starknet-rpc.publicnode.com",
];

const provider = jsonRpcProvider({
  rpc: () => ({ nodeUrl: MAINNET_RPCS[Math.floor(Math.random() * MAINNET_RPCS.length)] }),
});

// Custom wallet-discovery store.
//
// The default store scans `window` for legacy-injected wallets (e.g.
// `window.starknet_braavos`) only ONCE, at module-load time. Wallet extensions
// inject asynchronously, so a wallet that loads after that scan — Braavos is the
// common case — is never picked up. Wallet-standard wallets (Ready/Argent)
// register via a continuous event listener and are unaffected.
//
// We own the store so we can re-run the injected-wallet scan a few times after
// mount and on `window.load`, catching late-injecting wallets.
const store = createStore();

const RESCAN_DELAYS_MS = [0, 250, 750, 1500, 3000];

export function StarknetProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const timers = RESCAN_DELAYS_MS.map((delay) =>
      window.setTimeout(() => store._refreshInjectedWallets(), delay),
    );
    const onLoad = () => store._refreshInjectedWallets();
    window.addEventListener("load", onLoad);
    return () => {
      timers.forEach(window.clearTimeout);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  // Mainnet only, per spec. Public RPC endpoints — swap for a keyed endpoint
  // (Alchemy/Infura/Blast) if large CSVs hit rate limits.
  return (
    <StarknetConfig chains={[mainnet]} provider={provider} store={store} autoConnect>
      {children}
    </StarknetConfig>
  );
}
