import { useAccount, useConnect, useDisconnect, useNetwork } from "@starknet-start/react";

function shorten(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletBar() {
  const { address, status } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { chain } = useNetwork();

  if (status === "connected" && address) {
    return (
      <div className="wallet-bar">
        <span className="wallet-meta">
          <span className="dot" /> {shorten(address)} · {chain.name}
        </span>
        <button type="button" className="btn-secondary" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  if (connectors.length === 0) {
    return (
      <div className="wallet-bar">
        <span className="muted">
          No Starknet wallet detected. Install Ready (Argent) or Braavos, then reload.
        </span>
      </div>
    );
  }

  return (
    <div className="wallet-bar">
      <span className="muted">Connect to Starknet:</span>
      <div className="connectors">
        {connectors.map((connector) => (
          <button
            key={connector.name}
            type="button"
            className="btn-primary"
            onClick={() => connect({ connector })}
          >
            {connector.icon ? (
              <img src={connector.icon} alt="" width={18} height={18} />
            ) : null}
            {connector.name}
          </button>
        ))}
      </div>
    </div>
  );
}
