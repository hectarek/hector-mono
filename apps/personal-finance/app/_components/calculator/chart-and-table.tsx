"use client";

import type { ChartConfig } from "@repo/ui/components/chart";
import dynamic from "next/dynamic";
import { useId } from "react";
import { formatDollars } from "@/src/finance/format";

// Loaded in the browser only, after the fields work: recharts draws nothing on the server
// anyway. The placeholder holds the chart's height, so the page doesn't shift when it arrives.
const SeriesChart = dynamic(
  () => import("./series-chart").then((module) => module.SeriesChart),
  { ssr: false, loading: () => <div aria-hidden="true" className="h-64" /> },
);

type Series = {
  key: string;
  label: string;
  // A theme token, such as "var(--primary)".
  color: string;
  // A second line is dashed, so the lines differ by more than color (R22).
  dashed?: boolean;
};

type Row = {
  label: string;
  // One amount per series, in the series' order.
  values: readonly number[];
};

// A chart beside the table that is its equivalent (R22, KTD13). The chart is for the eye only
// (series-chart.tsx); the table carries every number, and scrolls sideways inside its own
// labelled region at 320px.
export function ChartAndTable({
  caption,
  rowHeader,
  series,
  rows,
}: {
  caption: string;
  rowHeader: string;
  series: readonly Series[];
  rows: readonly Row[];
}) {
  const captionId = useId();
  const config: ChartConfig = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color }]),
  );
  const data = rows.map((row) => ({
    label: row.label,
    ...Object.fromEntries(series.map((s, i) => [s.key, row.values[i] ?? 0])),
  }));

  return (
    <div className="space-y-6">
      <SeriesChart config={config} data={data} series={series} />

      {/* A named section is a region landmark. It takes no tabIndex (Biome's
          noNoninteractiveTabindex): Chrome and Firefox let a keyboard focus a scroller that
          holds nothing focusable on their own. */}
      <section
        aria-labelledby={captionId}
        className="overflow-x-auto rounded-lg border"
      >
        <table className="w-full text-base tabular-nums">
          <caption id={captionId} className="px-4 py-3 text-left font-semibold">
            {caption}
          </caption>
          <thead>
            <tr className="border-y bg-muted">
              <th scope="col" className="px-4 py-2 text-left font-semibold">
                {rowHeader}
              </th>
              {series.map((s) => (
                <th
                  key={s.key}
                  scope="col"
                  className="px-4 py-2 text-right font-semibold"
                >
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="px-4 py-2 text-left font-normal">
                  {row.label}
                </th>
                {row.values.map((value, i) => (
                  <td
                    key={series[i]?.key ?? i}
                    className="px-4 py-2 text-right"
                  >
                    {formatDollars(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
