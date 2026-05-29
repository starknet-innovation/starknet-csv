# Starknet CSV Airdrop — Product / Functional Spec (Reverse-Engineered)

> **Status:** Draft. Based on observation of <https://csv.spaceshard.io/> plus the app's in-product "How to use" documentation. The CSV format and supported token types are **confirmed** from that doc; sections still marked _(inferred)_ are reasoned assumptions about the surrounding UX/execution and should be verified against the live app or source before building.

---

## 1. Overview

A single-page web app that lets a user **batch many token transfers into a single Starknet transaction** by uploading *or pasting* a CSV file and hitting submit. It removes the overhead of sending tokens one transfer at a time — fewer signatures and transactions, saving gas and time.

**Tagline (observed):** _"Send arbitrarily many distinct tokens, to arbitrarily many distinct accounts with various different values from a CSV file in a single transaction."_

**In-product description (confirmed):** _"This app can batch multiple transfers of ERC20 in a single transaction. It's as simple as uploading / copy & pasting a single CSV transfer file and hitting the submit button. This saves gas and a substantial amount of time by requiring less signatures and transactions."_

Two confirmed properties: it supports **mixed-token batches** (many different tokens in one go) and handles **both ERC-20 and NFTs** (`token_type` of `erc20` or `nft`).

## 2. Goals & Non-Goals

**Goals**
- Bulk-distribute ERC-20 tokens to a list of recipients from a CSV.
- Support varying amounts per recipient and multiple token types in one batch.
- Execute as few on-chain transactions as possible (ideally one), reducing gas and manual error.
- Work with standard Starknet wallets via wallet connect.

**Non-Goals**
- Not an airdrop _campaign_ tool (no eligibility logic, claim pages, snapshots, or vesting).
- Not custodial — the app never holds funds or keys; the user signs from their own wallet.
- Not a recipient-facing claim flow; recipients receive tokens directly (push, not pull).
- **No custom/distributor contract** — the app is a **pure client-side multicall**; transfers go directly from the connected wallet, so there is no protocol contract to deploy or audit.

## 3. Target Users

- Projects, DAOs, foundations distributing tokens/rewards/grants.
- Teams running payroll, contributor payouts, or community rewards on Starknet.
- Anyone needing repeatable bulk transfers without scripting.

## 4. Core User Flow

1. **Land on page** — see title "Starknet CSV Airdrop", logo, short description, and a "How to use this app?" instructions section.
2. **Connect wallet** — primary CTA "Connect wallet" → "Connect to Starknet". Supports **all wallets exposed by the connector library** (Starknet wallet-connector — e.g. ArgentX, Braavos, and any others the lib surfaces). Mainnet only.
3. **Provide CSV** — upload a file **or copy & paste** CSV content describing token type, token, receiver, amount, and (for NFTs) id.
4. **Parse & preview** — _(inferred)_ app parses rows, validates addresses/amounts, shows a summary table: recipient count, per-token totals, grand total, row errors.
5. **Build the multicall** — the app assembles a single Starknet **multicall**, client-side, combining any required `approve` calls with the transfers (one combined approval + transfer batch — no separate approve step).
6. **Confirm & send** — user signs **one transaction** containing the whole multicall; transfers execute directly from the connected wallet. User pays network gas only.
7. **Result** — _(inferred)_ show tx hash, link to a block explorer (Voyager / Starkscan), and success/failure per recipient.

## 5. Functional Requirements

### 5.1 Wallet
- FR-1: Connect to a Starknet wallet using the connector library; **support all wallets the connector exposes** (not a hard-coded list). Display connected address and network.
- FR-2: **Mainnet only** for now — detect and warn if the wallet is on any other network.
- FR-3: Allow disconnect / switch account. _(inferred)_

### 5.2 CSV Input _(format confirmed from in-product docs)_
- FR-4: Accept CSV via **file upload** and via **copy & paste** into a text area.
- FR-5: Required columns, **comma-separated**, with a **header row as the first row** using these exact names:
  - `token_type` — `erc20` or `nft`.
  - `token_address` — Starknet address of the token contract (ERC-20 or NFT).
  - `receiver` — Starknet address of the transfer receiver.
  - `amount` — amount of token to transfer, **human-readable** (e.g. `1` = 1 STRK, not `10^18` fri). The app reads each token's `decimals` and converts to base units before building the call. _(inferred: for `nft` this is typically `1`.)_
  - `id` — token ID for `nft` transfers; **left blank for `erc20`**.
- FR-6: Header row is **mandatory** and must include all column names; comma `,` is the separator.
- FR-7: Surface a clear parse error if the header is missing/misnamed or the delimiter/row shape is wrong.

**Example CSV:**
```csv
token_type,token_address,receiver,amount,id
erc20,0x049d3657...,0x0123abc...,100,
erc20,0x049d3657...,0x0456def...,250.5,
nft,0x07f8a2b1...,0x0789ghi...,1,42
```

### 5.3 Validation
- FR-8: Validate each recipient address is a syntactically valid Starknet address.
- FR-9: Validate amounts are positive, numeric, and within the token's `decimals` precision (e.g. reject `0.0001` for a 2-decimal token). Fetch each token's `decimals` on-chain and convert the human-readable value to base units; reject rows whose precision would lose value on conversion.
- FR-10: Flag duplicate recipients (warn, not block). _(inferred)_
- FR-11: Compute per-token totals and verify the connected wallet's balance covers each total; block or warn on insufficient balance.
- FR-12: Show a row-level error report; let the user fix and re-upload.

### 5.4 Distribution / Execution
- FR-13: Build a **pure client-side Starknet multicall** — no custom/distributor contract. The multicall contains one call per CSV row plus any needed approvals, all combined into **one transaction / one signature**.
- FR-14: Emit the right call per row directly against the token contract:
  - `erc20` → `transfer(receiver, amount)` (or `approve`+`transferFrom` if the chosen pattern requires it).
  - `nft` → ERC-721 `transferFrom(owner, receiver, id)`.
  - Approvals, where needed, are folded into the **same** multicall (one combined approval + transfer — no separate approve step).
- FR-15: Execute the **entire batch as a single transaction** — no chunking. The whole CSV becomes one multicall, one signature. Practical row count is therefore bounded by Starknet's per-tx calldata/step limits. _(Open: surface that ceiling gracefully — warn/disable submit if a CSV would exceed it rather than letting the tx fail at sign time.)_
- FR-16: Surface estimated fees before signing. _(inferred)_

### 5.5 Feedback & Results
- FR-17: Show pending → confirmed states with the tx hash and explorer link.
- FR-18: Single-tx semantics → **all-or-nothing**: the batch either fully succeeds or fully reverts; report the single outcome clearly.
- FR-19: Allow export/download of a results log (CSV of recipient → status → tx hash). _(inferred, nice-to-have)_

## 6. Confirmed Facts

_From the in-product "How to use" docs:_
- **Token standards:** ERC-20 **and** NFTs (`token_type` ∈ {`erc20`, `nft`}).
- **CSV schema:** required columns `token_type, token_address, receiver, amount, id`; comma-separated; header row mandatory as the first row; `id` blank for ERC-20.
- **Input methods:** file upload **and** copy & paste, then a submit button.
- **Value prop:** batch into a single transaction → fewer signatures/transactions → saves gas and time.

_Confirmed directly by the team:_
- **Architecture:** **Pure client-side multicall** — no distributor contract, nothing to deploy or audit.
- **Network:** **Mainnet only** for now.
- **Wallets:** **All wallets exposed by the connector library** (not a hard-coded subset).
- **Fees:** **Network gas only** — the tool takes no protocol fee.
- **Approval UX:** **One combined approval + transfer** in the same multicall (no separate approve step).
- **Execution:** **Always a single transaction** — no chunking, regardless of CSV size (all-or-nothing). Max rows are bounded by Starknet per-tx limits.
- **Amount units:** **Human-readable** in the CSV (`1` = 1 STRK, not `10^18` fri); the app converts using each token's on-chain `decimals`.

## 7. Open Questions (still to confirm)

1. **Practical row cap:** What's the real maximum CSV size before Starknet per-tx calldata/step limits cause the single tx to fail — and does the UI warn before that point?
2. **NFT standard:** ERC-721 only, or also ERC-1155 (which would make `amount` meaningful for NFTs)?

## 8. Non-Functional / Assumptions

- **Trust model:** Non-custodial; user signs all transactions. No private keys ever handled by the app. _(Crypto-safety note: any spec/implementation must never request, store, or transmit seed phrases or private keys.)_
- **No contract surface:** Because it's a pure client-side multicall against standard token contracts, there is no bespoke contract attack surface — the security focus is the front-end (correct calldata construction, address/amount validation, dependency integrity).
- **Client-side parsing:** CSV parsed in-browser; recipient data ideally never sent to a backend (privacy).
- **Resilience:** Clear, recoverable errors on parse/validation/tx failure.

## 9. Tech & Deployment

- **Framework:** React 19 + TypeScript, **Vite** SPA (static build — no SSR, no backend).
- **Starknet integration:** [`@starknet-start/react`](https://github.com/starknet-start/starknet-start) — a wagmi-inspired hooks library powered by starknet.js. Chosen over starknet-react because its wallet layer is built on **`get-starknet` v5 (wallet-standard)**, which auto-discovers every installed Starknet wallet — directly satisfying the "all wallets from the connector lib" requirement with no extra connector kit.
  - `StarknetConfig` provider, `mainnet` chain only, `publicProvider()` (swap for a keyed RPC for large CSVs).
  - Hooks used: `useConnect`/`useAccount`/`useDisconnect`/`useNetwork` (wallet), `useProvider` (read `decimals`), `useSendTransaction` (the single multicall).
- **Multicall:** `useSendTransaction({ calls })` — one `Call` per CSV row (`transfer` for `erc20`, ERC-721 `transferFrom` for `nft`), submitted as one all-or-nothing transaction.
- **Hosting:** **GitHub Pages** (static). Repo `starknet-innovation/starknet-csv` → Pages base path `/starknet-csv/`. Deployed via GitHub Actions on push to `main` (build → upload artifact → deploy).
- **Crypto-safety:** the app never handles seed phrases or private keys; all signing happens in the user's wallet.

## 10. Suggested Acceptance Criteria (for a rebuild)

- A user can connect a Starknet wallet, upload a valid CSV of N recipients across M tokens, preview accurate per-token totals, sign, and have all recipients receive the correct amounts.
- Invalid rows are reported precisely (row number + reason) and never silently dropped.
- Insufficient balance is caught before signing.
- Every executed transaction is linkable to a block explorer from the UI.

---

_External-facing note: the remaining `_(inferred)_` sections (UX details, chunking, amount units) should be confirmed against the live tool before publishing or using this spec as a build reference. Any security claims should be verified independently._
