import { formatDollars, formatPercent } from "./format";

export type FieldUnit = "dollars" | "percent" | "years";

type Reading =
  | { kind: "missing" }
  | { kind: "invalid" }
  | { kind: "number"; value: number };

// One parser for every field (KTD12). It drops $, % and spaces. A comma then depends on the
// field: in dollars and years it separates thousands, and in a percent it's a decimal point,
// since a phone set to a comma-decimal language shows only a comma on its decimal keypad.
// Empty is missing, never 0. Only plain digits with one decimal point count, so `1e3` and
// `0x10` are invalid rather than read as JavaScript would.
export function parseField(text: string, unit: FieldUnit): Reading {
  const bare = text.replace(/[\s$%]/g, "");
  if (bare === "") return { kind: "missing" };
  const plain =
    unit === "percent" ? bare.replaceAll(",", ".") : bare.replaceAll(",", "");
  if (!/^(\d+\.?\d*|\.\d+)$/.test(plain)) return { kind: "invalid" };
  return { kind: "number", value: Number(plain) };
}

// The range every field of a unit takes (R15). Years are whole.
const RANGES: Record<FieldUnit, { min: number; max: number }> = {
  dollars: { min: 0, max: 100_000_000 },
  percent: { min: 0, max: 25 },
  years: { min: 0, max: 80 },
};

export type FieldRule = {
  unit: FieldUnit;
  // What the field asks for, as its message says it: "a deposit", "a yearly return".
  noun: string;
  // An optional field may be left empty.
  optional?: true;
};

type FieldCheck =
  | { ok: true; value: number | null }
  | { ok: false; problem: string };

// A field's value, or the message that names its fix (R16): "Enter a deposit to see what it
// grows to". `purpose` is the calculator's end of that sentence.
export function checkField(
  rule: FieldRule,
  text: string,
  purpose: string,
): FieldCheck {
  const reading = parseField(text, rule.unit);
  if (reading.kind === "missing") {
    return rule.optional
      ? { ok: true, value: null }
      : { ok: false, problem: `Enter ${rule.noun} ${purpose}` };
  }
  if (reading.kind === "invalid") {
    return { ok: false, problem: `Enter ${rule.noun} as a number ${purpose}` };
  }
  const { min, max } = RANGES[rule.unit];
  const whole = rule.unit !== "years" || Number.isInteger(reading.value);
  if (reading.value < min || reading.value > max || !whole) {
    return {
      ok: false,
      problem: `Enter ${rule.noun} from ${rangeText(rule.unit)}`,
    };
  }
  return { ok: true, value: reading.value };
}

// "$0 to $100,000,000", "0% to 25%", "0 to 80, in whole years".
export function rangeText(unit: FieldUnit): string {
  const { min, max } = RANGES[unit];
  if (unit === "dollars")
    return `${formatDollars(min)} to ${formatDollars(max)}`;
  if (unit === "percent")
    return `${formatPercent(min)} to ${formatPercent(max)}`;
  return `${min} to ${max}, in whole years`;
}
