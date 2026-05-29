# Starknet CSV Airdrop

Batch many **ERC-20 and NFT transfers** on Starknet into a **single transaction**, from a CSV file. Fewer signatures, less gas, no scripting.

Non-custodial: the app builds a client-side multicall and your wallet signs it. There is no backend and no custom contract — transfers go directly from your wallet to each receiver.

> Live: https://starknet-innovation.github.io/starknet-csv/

## CSV format

Comma-separated, with a **mandatory header row** using these exact columns:

| column | meaning |
| --- | --- |
| `token_type` | `erc20` or `nft` |
| `token_address` | Starknet address of the token contract |
| `receiver` | Starknet address of the recipient |
| `amount` | **human-readable** amount (`1` = 1 token, not base units); used for `erc20` |
| `id` | NFT token id (for `nft` rows); leave blank for `erc20` |

```csv
token_type,token_address,receiver,amount,id
erc20,0x049d3657...,0x0123abc...,100,
erc20,0x049d3657...,0x0456def...,250.5,
nft,0x07f8a2b1...,0x0789aaa...,1,42
```

See [`public/example.csv`](public/example.csv).

## How it works

- **Wallet:** [`@starknet-start/react`](https://github.com/starknet-start/starknet-start) on top of `get-starknet` (wallet-standard) — auto-discovers every installed Starknet wallet.
- **Amounts:** each ERC-20's `decimals` is read on-chain and used to convert the human-readable amount to base units.
- **Execution:** all rows become one multicall (`transfer` for ERC-20, ERC-721 `transferFrom` for NFTs), submitted as a single **all-or-nothing** transaction.
- **Network:** mainnet only.

> The whole CSV is sent as one transaction, so very large files can exceed Starknet's per-tx limits. Split the CSV if a transaction fails to estimate.

## Develop

```bash
npm install
npm run dev          # local dev server (base path "/")
npm run build        # production build to dist/
npm run preview
```

For local builds without the GitHub Pages base path: `VITE_BASE=/ npm run build`.

## Deploy

Pushing to `main` triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds and publishes `dist/` to GitHub Pages. Enable **Settings → Pages → Source: GitHub Actions** once.

---

This is a community tool. Verify recipients and amounts before signing — transfers are irreversible.
