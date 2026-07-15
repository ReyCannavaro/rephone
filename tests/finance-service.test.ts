import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  ensureSufficientCashBalance,
  generateFinanceNumber,
  getPostedAccountBalance,
  roundMoney,
} from "../src/lib/finance/finance-service";

describe("finance-service", () => {
  test("roundMoney normalizes floating point money", () => {
    assert.equal(roundMoney(10.005), 10.01);
    assert.equal(roundMoney(20.004), 20);
  });

  test("generateFinanceNumber uses compact date and time", () => {
    const date = new Date(2026, 6, 15, 9, 8, 7);

    assert.equal(generateFinanceNumber("OPEX", date), "OPEX-20260715-090807");
  });

  test("getPostedAccountBalance only sums posted entries", async () => {
    const supabase = createFinanceSupabaseMock({
      lines: [
        { journal_entry_id: "posted-1", debit: 100_000, credit: 0 },
        { journal_entry_id: "draft-1", debit: 50_000, credit: 0 },
        { journal_entry_id: "posted-2", debit: 0, credit: 25_000 },
      ],
      entries: [{ id: "posted-1" }, { id: "posted-2" }],
    });

    const result = await getPostedAccountBalance(supabase, {
      id: "cash-account",
      normal_balance: "DEBIT",
    });

    assert.equal(result.error, undefined);
    assert.equal(result.data, 75_000);
  });

  test("ensureSufficientCashBalance rejects negative cash outcome", async () => {
    const supabase = createFinanceSupabaseMock({
      lines: [{ journal_entry_id: "posted-1", debit: 100_000, credit: 0 }],
      entries: [{ id: "posted-1" }],
    });

    const result = await ensureSufficientCashBalance(
      supabase,
      { id: "cash-account", normal_balance: "DEBIT" },
      150_000,
    );

    assert.equal(result.data, undefined);
    assert.match(result.error ?? "", /Insufficient account balance/);
  });
});

type FinanceMockData = {
  lines: Array<{ journal_entry_id: string; debit: number; credit: number }>;
  entries: Array<{ id: string }>;
};

function createFinanceSupabaseMock(data: FinanceMockData) {
  return {
    from(table: string) {
      const result =
        table === "journal_lines"
          ? { data: data.lines, error: null }
          : { data: data.entries, error: null };

      const chain = {
        select() {
          return chain;
        },
        eq() {
          return chain;
        },
        in() {
          return chain;
        },
        is() {
          return result;
        },
      };

      return chain;
    },
  } as never;
}
