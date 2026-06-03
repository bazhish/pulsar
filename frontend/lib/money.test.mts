import assert from "node:assert/strict";
import test from "node:test";

import { centsFromText, formatMoneyInput, moneyToApiValue, parseApiMoneyValue } from "./money.ts";

test("money input keeps only digits and treats them as cents", () => {
  assert.equal(centsFromText("1000"), 10);
  assert.equal(centsFromText("abcR$ 1.234,56xyz"), 1234.56);
  assert.equal(centsFromText("sem numero"), 0);
});

test("money values are formatted as BRL", () => {
  assert.equal(formatMoneyInput(0), "R$ 0,00");
  assert.equal(formatMoneyInput(10), "R$ 10,00");
  assert.equal(formatMoneyInput(1000), "R$ 1.000,00");
});

test("api money values are normalized to two decimals", () => {
  assert.equal(moneyToApiValue(10.129), 10.13);
  assert.equal(parseApiMoneyValue("R$ 1.000,00"), 1000);
  assert.equal(parseApiMoneyValue("2500.50"), 2500.5);
});
