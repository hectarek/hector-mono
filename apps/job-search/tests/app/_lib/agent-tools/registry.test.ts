import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { AGENT_TOOLS } from "@/app/_lib/agent-tools/registry";
import {
  startSessionSchema,
  whoamiSchema,
} from "@/src/entities/models/agent-session.model";

// The entity schema each tool's controller parses its input with.
const PARSED_WITH: Record<string, z.ZodType> = {
  whoami: whoamiSchema,
  start_session: startSessionSchema,
};

describe("Claude's page tools", () => {
  it("each take, as their input schema, the JSON Schema of the entity schema their controller parses with", () => {
    expect(AGENT_TOOLS.map(({ name }) => name).sort()).toEqual(
      Object.keys(PARSED_WITH).sort(),
    );
    for (const { name, inputSchema } of AGENT_TOOLS) {
      const schema = PARSED_WITH[name];
      if (!schema) throw new Error(`No entity schema listed for ${name}`);
      expect(inputSchema).toEqual(z.toJSONSchema(schema, { io: "input" }));
    }
  });
});
