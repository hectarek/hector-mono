import { describe, expect, it } from "bun:test";
import { checkField, type FieldRule, parseField } from "@/src/finance/parse";

// The examples in docs/finance-math.md, "Reading what people type".
describe("parseField", () => {
  it.each([
    ["$350,000", 350_000],
    ["1,234", 1234],
    ["350000", 350_000],
    [" $ 1,234.50 ", 1234.5],
    ["0", 0],
  ])("reads %p in a dollar field as %p", (text, value) => {
    expect(parseField(text, "dollars")).toEqual({ kind: "number", value });
  });

  it.each([
    ["6,5", 6.5],
    ["6.5%", 6.5],
    ["6,5 %", 6.5],
    ["7", 7],
  ])("reads %p in a percent field as %p", (text, value) => {
    expect(parseField(text, "percent")).toEqual({ kind: "number", value });
  });

  it.each(["", "   ", "$", "%"])("reads %p as missing, never 0", (text) => {
    expect(parseField(text, "dollars")).toEqual({ kind: "missing" });
    expect(parseField(text, "percent")).toEqual({ kind: "missing" });
  });

  it.each(["abc", "1e3", "0x10"])("reads %p as invalid", (text) => {
    expect(parseField(text, "dollars")).toEqual({ kind: "invalid" });
    expect(parseField(text, "percent")).toEqual({ kind: "invalid" });
    expect(parseField(text, "years")).toEqual({ kind: "invalid" });
  });
});

const PURPOSE = "to see what it grows to";
const deposit: FieldRule = { unit: "dollars", noun: "a deposit" };
const rate: FieldRule = { unit: "percent", noun: "a yearly return" };
const years: FieldRule = { unit: "years", noun: "how many years" };

describe("checkField", () => {
  it("passes a number in range", () => {
    expect(checkField(deposit, "$200", PURPOSE)).toEqual({
      ok: true,
      value: 200,
    });
    expect(checkField(rate, "25", PURPOSE)).toEqual({ ok: true, value: 25 });
    expect(checkField(years, "80", PURPOSE)).toEqual({ ok: true, value: 80 });
  });

  it("names what to enter when a field is empty", () => {
    expect(checkField(deposit, "", PURPOSE)).toEqual({
      ok: false,
      problem: "Enter a deposit to see what it grows to",
    });
  });

  it("passes an empty optional field as no value", () => {
    expect(
      checkField(
        {
          unit: "years",
          noun: "how long to keep putting money in",
          optional: true,
        },
        "",
        PURPOSE,
      ),
    ).toEqual({ ok: true, value: null });
  });

  it("asks for a number when the text isn't one", () => {
    expect(checkField(deposit, "abc", PURPOSE)).toEqual({
      ok: false,
      problem: "Enter a deposit as a number to see what it grows to",
    });
  });

  it("names the range for a rate above 25%, more than 80 years, or an amount above $100M", () => {
    expect(checkField(rate, "25.5", PURPOSE)).toEqual({
      ok: false,
      problem: "Enter a yearly return from 0% to 25%",
    });
    expect(checkField(years, "81", PURPOSE)).toEqual({
      ok: false,
      problem: "Enter how many years from 0 to 80, in whole years",
    });
    expect(checkField(deposit, "$100,000,001", PURPOSE)).toEqual({
      ok: false,
      problem: "Enter a deposit from $0 to $100,000,000",
    });
  });

  it("takes years only whole", () => {
    expect(checkField(years, "30.5", PURPOSE)).toEqual({
      ok: false,
      problem: "Enter how many years from 0 to 80, in whole years",
    });
  });
});
