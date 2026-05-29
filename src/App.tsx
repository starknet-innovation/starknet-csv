import { useMemo, useState } from "react";

import { useAccount, useNetwork, useSendTransaction } from "@starknet-start/react";

import { WalletBar } from "./components/WalletBar";
import { buildCalls, summarizeTotals } from "./lib/calls";
import { parseTransfersCsv } from "./lib/csv";
import { useDecimalsResolver } from "./lib/useDecimals";

const EXAMPLE_CSV = `token_type,token_address,receiver,amount,id
erc20,0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7,0x0123abc...,100,
erc20,0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7,0x0456def...,250.5,
nft,0x07f8a2b1...,0x0789ghi...,1,42`;

export function App() {
  const { address, status } = useAccount();
  const { chain } = useNetwork();
  const decimalsOf = useDecimalsResolver();
  const { sendAsync } = useSendTransaction({});

  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const parsed = useMemo(() => (text.trim() ? parseTransfersCsv(text) : null), [text]);
  const totals = useMemo(() => (parsed ? summarizeTotals(parsed.rows) : null), [parsed]);

  const canSubmit =
    status === "connected" &&
    !!parsed &&
    parsed.rows.length > 0 &&
    parsed.errors.length === 0 &&
    !submitting;

  async function onFile(file: File) {
    setText(await file.text());
  }

  async function onSubmit() {
    if (!parsed || !address) return;
    setSubmitting(true);
    setSubmitError(null);
    setTxHash(null);
    try {
      const calls = await buildCalls(parsed.rows, address, decimalsOf);
      const result = await sendAsync(calls);
      setTxHash(result.transaction_hash);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const explorerUrl = txHash ? `https://voyager.online/tx/${txHash}` : null;

  return (
    <main className="container">
      <header className="header">
        <h1>Starknet CSV Airdrop</h1>
        <p className="subtitle">
          Batch many ERC-20 and NFT transfers into a <strong>single transaction</strong>. Upload or
          paste a CSV, then submit. Saves gas and signatures.
        </p>
      </header>

      <WalletBar />

      <section className="card">
        <h2>How to use</h2>
        <p>
          Provide a comma-separated CSV with a header row and these columns:
          <code> token_type</code> (<code>erc20</code> or <code>nft</code>),
          <code> token_address</code>, <code>receiver</code>, <code>amount</code> (human-readable —
          <code> 1</code> = 1 token, not base units), and <code>id</code> (NFT token id; leave blank
          for erc20).
        </p>
        <button type="button" className="btn-link" onClick={() => setText(EXAMPLE_CSV)}>
          Load example
        </button>
      </section>

      <section className="card">
        <div className="input-row">
          <label className="file-label">
            Upload CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>
          <span className="muted">or paste below</span>
        </div>
        <textarea
          className="csv-input"
          rows={10}
          spellCheck={false}
          placeholder="token_type,token_address,receiver,amount,id"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </section>

      {parsed && (
        <section className="card">
          <h2>
            Preview · {parsed.rows.length} valid {parsed.rows.length === 1 ? "row" : "rows"}
            {parsed.errors.length > 0 && (
              <span className="error-count"> · {parsed.errors.length} error(s)</span>
            )}
          </h2>

          {parsed.errors.length > 0 && (
            <ul className="errors">
              {parsed.errors.map((e) => (
                <li key={e.line}>
                  Line {e.line}: {e.message}
                </li>
              ))}
            </ul>
          )}

          {totals && totals.size > 0 && (
            <table className="totals">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>ERC-20 total</th>
                  <th>NFTs</th>
                </tr>
              </thead>
              <tbody>
                {[...totals.entries()].map(([token, t]) => (
                  <tr key={token}>
                    <td className="mono">{token.slice(0, 10)}…</td>
                    <td>{t.erc20 || "—"}</td>
                    <td>{t.nfts || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section className="card submit-card">
        <button type="button" className="btn-primary btn-lg" disabled={!canSubmit} onClick={onSubmit}>
          {submitting
            ? "Confirm in your wallet…"
            : status !== "connected"
              ? "Connect a wallet to submit"
              : "Send transfers"}
        </button>
        {chain && status === "connected" && chain.network !== "mainnet" && (
          <p className="warn">This app is mainnet-only. Switch your wallet to Starknet mainnet.</p>
        )}
        {submitError && <p className="warn">Failed: {submitError}</p>}
        {explorerUrl && (
          <p className="success">
            Submitted ·{" "}
            <a href={explorerUrl} target="_blank" rel="noreferrer">
              view on Voyager
            </a>
          </p>
        )}
      </section>

      <footer className="footer">
        Non-custodial · all signing happens in your wallet · mainnet only ·{" "}
        <a href="https://github.com/starknet-innovation/starknet-csv" target="_blank" rel="noreferrer">
          source
        </a>
      </footer>
    </main>
  );
}
