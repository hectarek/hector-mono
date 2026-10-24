// The page's model context (WebMCP), the browser API Claude's page tools register with
// (docs/build-plan.md KTD5). The only module that touches `document.modelContext`, so a change to
// the API lands here alone. Typed by hand from the W3C draft of 20 October 2026
// (https://webmachinelearning.github.io/webmcp/), as far as the app uses it: Chrome 149 to 162 has
// it behind --enable-features=WebMCP or an origin trial, and there's no polyfill, so elsewhere
// `document.modelContext` is missing.

// Hints a tool gives the agent. Annotations belong to a tool, not a call.
type ToolAnnotations = {
  readOnlyHint?: boolean;
  // Its output may carry outside text, to be read as data (KTD21).
  untrustedContentHint?: boolean;
  // It takes a step the agent should confirm first (Claude Code asks).
  consequentialHint?: boolean;
  debugging?: boolean;
};

// A tool as the page registers it. The browser hands `execute` the agent's input as an object,
// unchecked against `inputSchema`, and gives back what it resolves to; one that throws reaches the
// agent only as "invocation failed".
export type PageTool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations?: ToolAnnotations;
  execute: (
    input: object,
    options: { signal: AbortSignal },
  ) => Promise<unknown>;
};

// A tool as getTools() lists it: its definition without the callback (the browser adds the window
// and origin that registered it).
export type RegisteredTool = Omit<PageTool, "execute">;

export type ModelContext = {
  // Rejects for a name that's already registered (InvalidStateError) and when the signal aborts
  // before the registration settles, or already had (AbortError). Aborting it unregisters the tool:
  // there's no unregisterTool.
  registerTool(
    tool: PageTool,
    options?: { signal?: AbortSignal },
  ): Promise<undefined>;
  getTools(): Promise<RegisteredTool[]>;
  // Answers what the tool's execute resolved to, as JSON text.
  executeTool(tool: RegisteredTool, input?: object): Promise<string>;
};

declare global {
  interface Document {
    // On `document`, not `navigator`: the API moved during the trial.
    readonly modelContext?: ModelContext;
  }
}

// The refusals a registration gets in the normal course: AbortError when the page leaves before it
// settles (React's StrictMode mounts twice), and InvalidStateError for a name that's still
// registered, which keeps the registration that holds it.
const EXPECTED_REFUSALS = new Set(["AbortError", "InvalidStateError"]);

// Registers each tool with the page's model context until the signal aborts. Does nothing in a
// browser without one. The expected refusals are dropped; any other stays an unhandled rejection,
// in the browser's console, rather than a tool that's quietly missing.
export function registerPageTools(
  tools: readonly PageTool[],
  signal: AbortSignal,
): void {
  const modelContext = document.modelContext;
  if (!modelContext) {
    return;
  }
  for (const tool of tools) {
    modelContext.registerTool(tool, { signal }).catch((err: unknown) => {
      if (!(err instanceof DOMException && EXPECTED_REFUSALS.has(err.name))) {
        throw err;
      }
    });
  }
}
