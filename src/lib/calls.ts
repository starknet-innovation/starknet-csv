import { type Call, cairo } from "starknet";

import { parseHumanAmount } from "./amount";
import type { TransferRow } from "./csv";

/** Resolve an ERC-20 token's `decimals` (cached by caller). */
export type DecimalsResolver = (tokenAddress: string) => Promise<number>;

function u256Calldata(value: bigint): string[] {
  const { low, high } = cairo.uint256(value);
  return [low.toString(), high.toString()];
}

/**
 * Build the list of Starknet calls for a set of validated rows. The whole list is
 * submitted as ONE multicall (all-or-nothing):
 *   - erc20 -> transfer(receiver, amount: u256)
 *   - nft   -> transferFrom(sender, receiver, token_id: u256)  (ERC-721)
 *
 * @param rows     validated transfer rows
 * @param sender   connected wallet address (the `from` for NFT transfers)
 * @param decimalsOf  resolver for ERC-20 decimals
 */
export async function buildCalls(
  rows: TransferRow[],
  sender: string,
  decimalsOf: DecimalsResolver,
): Promise<Call[]> {
  const calls: Call[] = [];

  for (const row of rows) {
    if (row.tokenType === "erc20") {
      const decimals = await decimalsOf(row.tokenAddress);
      const amount = parseHumanAmount(row.amount, decimals);
      calls.push({
        contractAddress: row.tokenAddress,
        entrypoint: "transfer",
        calldata: [row.receiver, ...u256Calldata(amount)],
      });
    } else {
      const tokenId = BigInt(row.id);
      calls.push({
        contractAddress: row.tokenAddress,
        entrypoint: "transferFrom",
        calldata: [sender, row.receiver, ...u256Calldata(tokenId)],
      });
    }
  }

  return calls;
}

/** Per-token totals in human-readable units, for the preview summary. */
export function summarizeTotals(rows: TransferRow[]): Map<string, { erc20: number; nfts: number }> {
  const totals = new Map<string, { erc20: number; nfts: number }>();
  for (const row of rows) {
    const current = totals.get(row.tokenAddress) ?? { erc20: 0, nfts: 0 };
    if (row.tokenType === "erc20") {
      current.erc20 += Number(row.amount);
    } else {
      current.nfts += 1;
    }
    totals.set(row.tokenAddress, current);
  }
  return totals;
}
