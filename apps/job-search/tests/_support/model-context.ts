// A stand-in for the page's model context (WebMCP), behaving as Playwright 1.64's Chromium
// (Chrome for Testing 156, launched with --enable-features=WebMCP) did when measured on
// 2026-10-23 (docs/build-plan.md U4):
// - registerTool returns a promise. A second live registration of a name rejects with
//   InvalidStateError. Aborting the signal unregisters the tool, and rejects the registration with
//   AbortError while it's still pending, or at once when the signal was already aborted.
// - getTools lists each live tool with all four annotations set.
// - executeTool hands the tool its input as an object, never checked against the tool's schema,
//   and answers what the tool resolved to as JSON text, which Playwright parses.
// The real-browser flow (tests/flows/webmcp.flow.ts) checks the same against Chromium itself.
import type {
  ModelContext,
  PageTool,
  RegisteredTool,
} from "@/app/_lib/page-tools";

type Registration = { tool: PageTool };

export class FakeModelContext implements ModelContext {
  private readonly live = new Map<string, Registration>();
  // Every registration the page asked for, in order, with its signal.
  readonly registrations: { name: string; signal?: AbortSignal }[] = [];

  registerTool(
    tool: PageTool,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<undefined> {
    this.registrations.push({ name: tool.name, signal });
    if (signal?.aborted) {
      return Promise.reject(aborted());
    }
    if (this.live.has(tool.name)) {
      return Promise.reject(
        new DOMException("Duplicate tool name", "InvalidStateError"),
      );
    }
    const registration = { tool };
    this.live.set(tool.name, registration);
    return new Promise((resolve, reject) => {
      let settled = false;
      signal?.addEventListener(
        "abort",
        () => {
          if (this.live.get(tool.name) === registration) {
            this.live.delete(tool.name);
          }
          if (!settled) {
            settled = true;
            reject(aborted());
          }
        },
        { once: true },
      );
      // The browser settles a registration in a task of its own.
      setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(undefined);
        }
      });
    });
  }

  async getTools(): Promise<RegisteredTool[]> {
    return [...this.live.values()].map(({ tool }) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: {
        readOnlyHint: false,
        untrustedContentHint: false,
        consequentialHint: false,
        debugging: false,
        ...tool.annotations,
      },
    }));
  }

  async executeTool(tool: RegisteredTool, input: object = {}): Promise<string> {
    const registration = this.live.get(tool.name);
    if (!registration) {
      throw new DOMException("No such tool", "NotFoundError");
    }
    const result = await registration.tool.execute(
      JSON.parse(JSON.stringify(input)),
      { signal: new AbortController().signal },
    );
    return JSON.stringify(result);
  }

  // A call as Claude makes one through Playwright: by name, with the result parsed.
  async call(name: string, input: object = {}): Promise<unknown> {
    const tool = (await this.getTools()).find((each) => each.name === name);
    if (!tool) {
      throw new Error(`No tool named ${name} is registered`);
    }
    return JSON.parse(await this.executeTool(tool, input));
  }
}

function aborted(): DOMException {
  return new DOMException("The registration was aborted", "AbortError");
}

// Gives the page a model context, as flag-enabled Chrome has, or takes it away (undefined), until
// the returned function puts things back. Without a browser (a plain test), a stand-in document
// holds it.
export function setModelContext(
  modelContext: FakeModelContext | undefined,
): () => void {
  if (typeof document === "undefined") {
    Object.defineProperty(globalThis, "document", {
      value: { modelContext },
      configurable: true,
    });
    return () => {
      Reflect.deleteProperty(globalThis, "document");
    };
  }
  Object.defineProperty(document, "modelContext", {
    value: modelContext,
    configurable: true,
  });
  return () => {
    Reflect.deleteProperty(document, "modelContext");
  };
}
