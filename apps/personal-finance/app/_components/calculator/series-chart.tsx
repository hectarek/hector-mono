"use client";

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
} from "@repo/ui/components/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { formatCompactDollars } from "@/src/finance/format";

type ChartSeries = { key: string; dashed?: boolean };

// The lines of a ChartAndTable, in a file of their own so recharts (about 146 KB compressed)
// loads only once the page's fields are working. For the eye only: hidden from screen readers,
// with no focus stop (recharts 3.11 turns its keyboard layer on by default) and no animation,
// since a calculator redraws on every keystroke.
export function SeriesChart({
  config,
  data,
  series,
}: {
  config: ChartConfig;
  data: readonly Record<string, string | number>[];
  series: readonly ChartSeries[];
}) {
  return (
    <ChartContainer
      config={config}
      aria-hidden="true"
      className="aspect-auto h-64 w-full"
    >
      <LineChart
        data={[...data]}
        accessibilityLayer={false}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={formatCompactDollars}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <ChartLegend verticalAlign="top" content={<ChartLegendContent />} />
        {series.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            stroke={`var(--color-${s.key})`}
            strokeWidth={2}
            strokeDasharray={s.dashed ? "6 4" : undefined}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
