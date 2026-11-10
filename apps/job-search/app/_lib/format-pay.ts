const DOLLARS = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// A posted yearly band, a side not posted as "?", or null when neither is.
export function payBand({
  payMin,
  payMax,
}: {
  payMin: number | null;
  payMax: number | null;
}): string | null {
  if (payMin === null && payMax === null) return null;
  return [payMin, payMax]
    .map((amount) => (amount === null ? "?" : DOLLARS.format(amount)))
    .join(" – ");
}
