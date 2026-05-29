export type TokenType = "erc20" | "nft";

/** A single parsed-and-validated transfer row. */
export interface TransferRow {
  /** 1-based row number in the source file (excluding the header), for error reporting. */
  line: number;
  tokenType: TokenType;
  tokenAddress: string;
  receiver: string;
  /** Human-readable amount as written in the CSV (converted to base units later). */
  amount: string;
  /** NFT token id; empty string for erc20 rows. */
  id: string;
}

export interface ParseError {
  line: number;
  message: string;
}

export interface ParseResult {
  rows: TransferRow[];
  errors: ParseError[];
}

const REQUIRED_COLUMNS = [
  "token_type",
  "token_address",
  "receiver",
  "amount",
  "id",
] as const;

// Starknet addresses are felts: 0x followed by up to 64 hex chars.
const ADDRESS_RE = /^0x[0-9a-fA-F]{1,64}$/;

function splitCsvLine(line: string): string[] {
  return line.split(",").map((cell) => cell.trim());
}

/**
 * Parse the CSV transfer file. The header row is mandatory and must contain the
 * exact column names: token_type, token_address, receiver, amount, id.
 * Comma-separated. Invalid rows are reported individually and never dropped silently.
 */
export function parseTransfersCsv(text: string): ParseResult {
  const errors: ParseError[] = [];
  const rows: TransferRow[] = [];

  // Keep original 1-based line numbers for accurate error reporting; a line is
  // "blank" if it's empty or contains only separators/whitespace (e.g. ",,,,"
  // rows that spreadsheets append when exporting).
  const rawLines = text.split(/\r?\n/);
  const isBlank = (line: string) =>
    line.trim() === "" || splitCsvLine(line).every((cell) => cell === "");

  const headerIndex = rawLines.findIndex((l) => !isBlank(l));
  if (headerIndex === -1) {
    return { rows, errors: [{ line: 0, message: "File is empty" }] };
  }

  const header = splitCsvLine(rawLines[headerIndex]).map((h) => h.toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    return {
      rows,
      errors: [
        {
          line: headerIndex + 1,
          message: `Header row must include columns: ${REQUIRED_COLUMNS.join(", ")}. Missing: ${missing.join(", ")}`,
        },
      ],
    };
  }

  const idx = Object.fromEntries(
    REQUIRED_COLUMNS.map((c) => [c, header.indexOf(c)]),
  ) as Record<(typeof REQUIRED_COLUMNS)[number], number>;

  for (let i = headerIndex + 1; i < rawLines.length; i++) {
    if (isBlank(rawLines[i])) continue; // skip blank / separator-only rows
    const fileLine = i + 1; // 1-based line in the original file
    const cells = splitCsvLine(rawLines[i]);
    const get = (col: (typeof REQUIRED_COLUMNS)[number]) => cells[idx[col]] ?? "";

    const tokenTypeRaw = get("token_type").toLowerCase();
    const tokenAddress = get("token_address");
    const receiver = get("receiver");
    const amount = get("amount");
    const id = get("id");

    const rowErrors: string[] = [];

    if (tokenTypeRaw !== "erc20" && tokenTypeRaw !== "nft") {
      rowErrors.push(`token_type must be "erc20" or "nft" (got "${get("token_type")}")`);
    }
    if (!ADDRESS_RE.test(tokenAddress)) {
      rowErrors.push("token_address is not a valid Starknet address");
    }
    if (!ADDRESS_RE.test(receiver)) {
      rowErrors.push("receiver is not a valid Starknet address");
    }

    const tokenType = tokenTypeRaw as TokenType;
    if (tokenType === "erc20") {
      if (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0) {
        rowErrors.push("amount must be a positive number");
      }
    } else if (tokenType === "nft") {
      if (!/^\d+$/.test(id)) {
        rowErrors.push("id (token id) is required and must be an integer for nft rows");
      }
    }

    if (rowErrors.length > 0) {
      errors.push({ line: fileLine, message: rowErrors.join("; ") });
      continue;
    }

    rows.push({ line: fileLine, tokenType, tokenAddress, receiver, amount, id });
  }

  return { rows, errors };
}
