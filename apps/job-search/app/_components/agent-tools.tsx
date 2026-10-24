"use client";

import { useEffect } from "react";
import { AGENT_TOOLS } from "@/app/_lib/agent-tools/registry";
import { callAction } from "@/app/_lib/call-action";
import { type PageTool, registerPageTools } from "@/app/_lib/page-tools";

// Each tool as the page registers it: a call runs the tool's action through the one wrapper,
// which answers with an envelope whatever happens (docs/build-plan.md KTD5).
const PAGE_TOOLS: PageTool[] = AGENT_TOOLS.map(({ action, ...tool }) => ({
  ...tool,
  execute: (input) => callAction(() => action(input, tool.name)),
}));

// Claude's page tools, registered while the signed-in shell is mounted, whichever page the tab is
// on, and taken away when it unmounts (aborting the registration unregisters them). The session
// chrome renders it for Claude's session only, so Hector's browser never lists them.
export function AgentTools() {
  useEffect(() => {
    const registration = new AbortController();
    registerPageTools(PAGE_TOOLS, registration.signal);
    return () => registration.abort();
  }, []);
  return null;
}
