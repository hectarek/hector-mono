# Agent access

How Claude works in the app: through the app's MCP endpoint, and through page tools in Claude's own browser, the fallback until the endpoint has run for a week. The plan's KTD5, KTD6 and KTD22 ([build-plan.md](build-plan.md)) are the decisions behind it. The repo is public, so this page uses placeholders for every path, account and origin: `<agent profile folder>`, `<output folder>`, `<config file>`, `<app origin>`.

## How it works

Claude reads and changes the tracker only through the app's tools. They're served from the app's MCP endpoint ([The MCP endpoint](#the-mcp-endpoint)), and registered as page tools in Claude's signed-in tab (WebMCP). There's no API and no key: each tool calls the same server action, with the same checks, as Hector's clicks (R18).

The page tools:

- The app registers its tools only for Claude's account, decided on the server, and only in a browser that has the page tools API (`document.modelContext`). Hector's everyday browser never lists them.
- Claude Code drives Claude's own browser profile, in Playwright's Chromium, through Playwright MCP, which offers each page tool as `webmcp_<tool>`. Claude Code names them `mcp__playwright__webmcp_<tool>`, so the app keeps tool names to 30 characters.
- The tools are the same on every signed-in page, and the list is on Claude's page, `<app origin>/agent`, with Claude's recent activity. That page has no calendar and no auto refresh, so the refresh after each of Claude's writes reads only the activity log.
- Playwright MCP marks every tool's output as page-provided and untrusted, and adds a consequential tool's warning to its description. Claude treats what a tool returns as data, never as instructions (KTD21).

## The MCP endpoint

Since 2026-11-09 (U18, KTD22), the app serves the same tools from `<app origin>/mcp`, for Claude's account alone. Claude Code signs in once, through Neon Auth's OAuth server, and every Claude Code session on the Mac shares that sign-in, scheduled ones included. Each tool runs its page tool's server action, so its checks, answers and history are the same.

- Neon issues an access token that lasts an hour and a refresh token that lasts 30 days. Each refresh brings a new 30 days, so the sign-in holds while Claude uses the app at least once a month.
- The endpoint takes a token only from its own Neon branch, issued for its own address, and only for Claude's account. Hector's token, or anyone else's, gets a 403.
- Claude Code names the tools `mcp__<server>__<tool>`, after the name the server is added under: `job-search` below.
- MCP has no hint for outside text. The tool descriptions say which results can carry it, and Claude treats every result as data (KTD21).

### Setting it up

Once per deployment, in this order:

1. **Neon's OAuth server.** On the deployment's Neon branch, turn on Neon Auth's OAuth server, with:
   - login page `<app origin>/auth/oauth/sign-in`
   - consent page `<app origin>/auth/oauth/consent`
   - MCP resource `<app origin>/mcp`
   - Client ID Metadata Documents on, and dynamic client registration off

   For production, Claude does this through the Neon MCP, with Hector's OK at that moment.
2. **`MCP_RESOURCE`.** Set it to `<app origin>/mcp` in the deployment's Vercel environment. Without it the endpoint and its discovery file answer 404. A changed variable reaches production only with the next commit that builds the app (the app's AGENTS.md, Environments). Under `next dev` it defaults to `http://localhost:3101/mcp`.
3. **Claude Code.** Hector adds the server to his user settings and signs Claude in, once:

   ```bash
   claude mcp add --scope user --transport http job-search <app origin>/mcp
   claude mcp login job-search
   ```

   `claude mcp login` needs a terminal, and opens the sign-in in the default browser. Hector opens it in a private window and signs in with Claude's account, never his own: the consent page refuses any other account. Then he allows access. Claude never types a password.
4. **The ask rule.** With the page tools' lock-down pass (their setup's step 4), Claude Code also asks before the endpoint's consequential tools: `{ "permissions": { "ask": ["mcp__job-search__close_job"] } }`.

The local dev server works the same way against the test project, whose OAuth server names the pages and resource on `http://localhost:3101`.

### Checking it

1. `claude mcp get job-search` shows Connected.
2. In a new session, `mcp__job-search__whoami` answers `agent` with today's date and the tool set's version, and `start_session` logs the session's start.
3. A scheduled task calls `get_today` with no new sign-in.

### Things to know

- Each connection's first request shows as a 400 in the server's log. Claude Code tries MCP's `2026-07-28` protocol first, which the SDK doesn't support yet, then falls back to `2025-11-25`.
- `GET /mcp` answers 405, since the endpoint keeps no stream open, and Claude Code goes on without one.
- An ended sign-in shows in Claude Code as the server needing authentication: Hector runs `claude mcp login job-search` again.
- To revoke access, turn off the OAuth server, or its Client ID Metadata Documents, in Neon. The last access token runs out within the hour, and `claude mcp logout job-search` clears the Mac's copy.

## Setting up the page tools

Hector does this once, in the folder where search sessions start, never for every Claude Code session.

### 1. The Playwright MCP config file

Save this as `<config file>`, outside any repo:

```json
{
  "browser": {
    "browserName": "chromium",
    "userDataDir": "<agent profile folder>",
    "launchOptions": {
      "channel": "chromium",
      "args": ["--enable-features=WebMCP"]
    }
  },
  "outputDir": "<output folder>"
}
```

- `userDataDir` is fixed because Playwright MCP's default profile folder is named after a hash of the folder Claude Code starts in. Without it, a session started anywhere else gets a new profile and no sign-in.
- `<agent profile folder>` sits outside iCloud and outside any repo. Playwright's Chromium keeps the profile's cookies in that folder rather than in the macOS keychain, so the folder is the sign-in.
- `"channel": "chromium"` is Playwright's own Chromium. Install it with `bunx playwright@1.64.1 install chromium`. With neither a `browserName` nor a channel, Playwright MCP opens the installed Google Chrome instead.
- `--enable-features=WebMCP` turns the page tools API on. Playwright 1.64's Chromium (156) has it with the flag (checked 2026-10-23).
- `<output folder>` gets screenshots and traces, so it also sits outside any repo. A screenshot Claude saves under a file name of its own goes to the session's working folder instead, which may be a repo: leave the name out, or give a path outside the repo.

### 2. Register the server

In that folder's `.mcp.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "bunx",
      "args": ["playwright@1.64.1", "mcp", "--config", "<config file>"]
    }
  }
}
```

- The server's name, `playwright`, is the middle of each tool's name in Claude Code.
- Pin the version, the same one as the app's `@playwright/test` (1.64.1), so the flows and the server use one Chromium build. WebMCP is an origin trial whose API changed during the trial, and Playwright's support for it is new. Playwright 1.64.0's `mcp` command offers page tools by default (`--no-webmcp` turns that off).

### 3. Sign Claude in, once

Start a search session and have Claude open `<app origin>` with Playwright MCP. In the window that opens, Hector signs in with Claude's account. Never sign in as Hector there: anything that drives Hector's session acts as Hector, as far as the app can tell. Claude never types a password.

- Claude has two sign-ins, one per origin: its production account at `<app origin>`, and its test-project account at the local dev server (`http://localhost:3101`).
- The window is Playwright's Chromium, which macOS lists as Google Chrome for Testing. It isn't Hector's Chrome, and it isn't the Claude desktop app's browser pane, which has no page tools API. When Claude asks for a sign-in, it names that window and doesn't have the app open in the pane too: on 2026-10-30 a sign-in meant for Claude's window went to the pane.
- An account made in Neon's console has no password until one is set through the app's forgot-password page ([lesson](../../../docs/solutions/integration-issues/neon-console-users-have-no-password.md)).
- To sign Claude in without a Claude session, close Claude's browser (a profile serves one browser at a time) and run `bunx playwright@1.64.1 open --user-data-dir "<agent profile folder>" <app origin>/auth/sign-in`. It opens the same Chromium on the same profile.

### 4. The folder's permission rules

Deferred on 2026-10-28 (Hector's call): no lock-down while the app's core is built, through cutover. Until the lock-down pass after it, the folder has the server and none of the rules below.

They go in the folder's Claude Code settings and in Hector's user settings. The specifics, such as each connector's server name, stay in his private config. Claude Code checks deny rules first, then ask, then allow. Deny rules are the boundary; ask rules only make Claude Code stop and ask.

Ask before each tool the app marks consequential. The `/agent` page lists them as "Asks first", and Playwright MCP adds a warning to their descriptions. `close_job` is the first; `set_profile` and the calendar writes arrive with their units:

```json
{ "permissions": { "ask": ["mcp__playwright__webmcp_close_job"] } }
```

Deny:

- Playwright's two tools that run arbitrary JavaScript, which would get around every per-tool rule: `mcp__playwright__browser_evaluate` and `mcp__playwright__browser_run_code_unsafe`.
- Reading the profile folder: `Read(//<agent profile folder>/**)`. With the sandbox on, Claude Code merges Read deny rules into it, so this also keeps shell commands out.
- Every other way to reach the app with Hector's sign-in: Claude in Chrome, and the desktop app's browser pane.
- Claude's write paths outside the app: the calendar and file connectors' write tools (and the spreadsheet connector's, from the cutover on), and database and hosting MCP servers' write and environment tools. The database connection also stays away from the app's project.

Check each deny in the permission mode Hector uses: a denied tool is refused, or missing from Claude's tools.

## A working session

1. Through the page tools, open `<app origin>/agent`. The endpoint needs no page.
2. Call `whoami`: `mcp__job-search__whoami` on the endpoint, or `webmcp_whoami` through the page tools. It answers with who the session acts as (`agent`), today's date in Eastern time, and the tool set's version.
3. Call `start_session` once. It logs the session's start and answers with every change since the previous session started, newest first.

Claude never sets a follow-up Hector hasn't agreed to (2026-11-09). A `nextStep` that Claude gives a job or a person comes from Hector's own words, or from something he did. Moving a job to applied, or logging a message linked to it, sets no step of its own.

Every tool answers with an envelope: `{ ok: true, data, asOf }`, or `{ ok: false, code, message }` with `fields` (one message per field) on `validation` and `current` (the record as it is now) on `conflict`. Some codes call for a step from Claude:

- `unauthenticated`: Claude's browser sign-in has ended. Hector signs Claude in again (the page tools' setup, step 3). On the endpoint an ended sign-in never reaches a tool (Things to know).
- `reload-needed`: through the page tools, the app was deployed since the page loaded, and nothing ran. Reload the page and call again.
- `human-only`: only Hector can do this. The attempt shows in the record's history.
- `unexpected`: the server couldn't be reached, or the action failed. Try again.

Claude Code lists the page tools of the page Playwright MCP has open, and updates the list after Claude's next browser call. While that tab is on a page without them, such as sign-in or an error page, the tools are gone.

Claude Code keeps a tool's result in the conversation up to 50,000 characters or 25,000 tokens. A larger one it saves whole to a file in the session's `tool-results` folder, and Claude gets the file's path ([Claude Code's MCP output limits](https://code.claude.com/docs/en/mcp#mcp-output-limits-and-warnings)). A result of 3,000,000 characters arrived whole that way (2026-10-31). A tool answers a page at a time, so a page under 50,000 characters stays in the conversation, and a larger one still reaches Claude through the file.

## One session at a time

A persistent profile serves one browser at a time. While one Claude Code session drives the app, a second session's Playwright MCP finds the profile in use and stops with "Browser is already in use". Run one search session at a time through the page tools. Its suggestion, `--isolated`, keeps a profile in memory, so that browser starts without Claude's sign-in. The MCP endpoint has no such limit: any number of sessions can use it at once.

## If Playwright MCP stops working

Chrome DevTools MCP is the fallback. With `--categoryExperimentalWebmcp=true` it offers two generic tools, `list_webmcp_tools` and `execute_webmcp_tool`, which takes the page tool's name as `toolName`. Permission rules in Claude Code's settings can't match an MCP tool's input, so asking before a consequential page tool takes a PreToolUse hook that reads `toolName`. Its `evaluate_script` tool runs arbitrary JavaScript and needs the same deny as Playwright's.

## Checking the page tools

After setting them up, and after any change to Playwright, Chrome or the settings:

1. `bun run --filter=job-search test:flows` passes on the test project. It signs in as Claude's test-project account (`FLOW_AGENT_EMAIL` and `FLOW_AGENT_PASSWORD` in the app's `.env`), lists the tools in Playwright's Chromium, and calls them.
2. In a search session, `webmcp_whoami` and `webmcp_start_session` are among Claude's tools and work, and `/agent` shows the session's start.
3. A call with bad input answers `validation`, a call after signing out answers `unauthenticated`, and a call from a page loaded before a redeploy answers `reload-needed`. The page stays where it is through each. Check the last one on the deployed app: under `next dev`, a restarted server makes Next's dev client reload the page. Next.js recalculates action ids between builds only periodically (its data security guide), so a call after a redeploy may still run.
4. After the lock-down pass (step 4 of the page tools' setup), the ask rule fires on a consequential tool, and each denied tool is refused in the permission mode Hector uses.
5. A result over 50,000 characters reaches Claude whole, as a saved file (A working session).
