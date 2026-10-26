import { describe, expect, it } from "bun:test";
import {
  addSourceSchema,
  sourceNameKey,
} from "@/src/entities/models/lead-source.model";

describe("lead sources", () => {
  it("take a name trimmed, with runs of spaces made one", () => {
    expect(addSourceSchema.parse({ name: "  Widget   Jobs " })).toEqual({
      name: "Widget Jobs",
    });
    expect(addSourceSchema.safeParse({ name: " " }).success).toBe(false);
  });

  it("compare names ignoring case and runs of spaces", () => {
    expect(sourceNameKey("Widget Jobs")).toBe(sourceNameKey("widget  JOBS"));
    expect(sourceNameKey("Widget Jobs")).not.toBe(sourceNameKey("WidgetJobs"));
  });
});
