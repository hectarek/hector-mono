# Claude's MCP sign-in: research

What a research run on 2026-11-09 tested and read before U18 ([build-plan.md](build-plan.md), KTD22) moved Claude's access from WebMCP page tools to an MCP endpoint signed in through Neon Auth's OAuth server. The repo is public, so addresses are placeholders: `<issuer>` is a Neon Auth branch's Auth URL, and `<app origin>` the app's address.

## Tested

On a throwaway branch of the test project, using the Neon MCP. Production wasn't touched.

- **Neon's OAuth server turns on per branch.** `update_auth_oauth_server` stored a login page, a consent page and an MCP resource, with Client ID Metadata Documents (CIMD) on and dynamic registration off, its defaults. A child branch gets its own issuer and settings.
- **Its metadata offers what Claude Code needs.** `<issuer>/.well-known/oauth-authorization-server` (and `openid-configuration`) lists:
  - `client_id_metadata_document_supported: true`
  - token endpoint auth methods `none`, `client_secret_basic`, `client_secret_post` and `private_key_jwt`
  - scopes `openid`, `profile`, `email` and `offline_access`
  - PKCE `S256` only
  - introspection and revocation endpoints
  - no `registration_endpoint` while dynamic registration is off

  The JWKS holds one Ed25519 (EdDSA) key. The grant types list `client_credentials`, which Neon's docs say it refuses.
- **What Claude Code sends.** The setup: Claude Code 2.1.278, in a throwaway `CLAUDE_CONFIG_DIR`, pointed at a stand-in MCP server that answered `401` with RFC 9728 metadata naming the branch's issuer. `claude mcp login --no-browser` needs a terminal: run it under `script -q /dev/null`, outside the sandbox, which blocks `openpty`. It:
  - fetched only the protected resource metadata, with `MCP-Protocol-Version: 2025-11-25`
  - identified itself by CIMD as `https://claude.ai/oauth/claude-code-client-metadata`, with PKCE and a `http://localhost:<port>/callback` redirect
  - sent `resource`, the server's own URL
  - sent no `scope` when the server's metadata listed none, and Neon filled in `openid profile email offline_access`
  - sent `scope=openid offline_access` and `prompt=consent` when the metadata listed only `openid`
- **What Neon did with it.** It accepted Claude Code's request and redirected to the login page with the request signed and good for 10 minutes. It refused a resource it doesn't know with `400 invalid_target`. It also accepted a managed public client made with `create_auth_oauth_client`.
- **Not tested:** anything after sign-in. That covers the token request, the token, refreshing it, and whether other sessions and scheduled tasks reuse it. Signing in means typing a password into Neon's hosted service, so U18's spike covers it, with Hector signing in.

## Read in the packages (versions of 2026-11-09)

- **`@neondatabase/auth` 0.7.0-beta**, the app's package, already registers Better Auth's OAuth provider client: `oauth2.continue`, `oauth2.consent` and `oauth2.publicClient`. It attaches the signed `oauth_query` to every request but GET and DELETE while the page's URL carries `sig` and `ba_param`.
  - Its `AuthView` never calls `oauth2.continue`, and after `signIn.email` it goes to `redirectTo` without reading the answer's redirect. So the OAuth sign-in is a page of its own.
  - Its renamed successor, `@neon/auth` 0.8, keeps the same Next.js server API but drops the UI exports the app uses (`AuthView`, `authViewPaths`), so U18 stays on 0.7.
- **`@neon/oauth` 0.3.0 (beta):**
  - `createMcpAuth({ baseUrl, resource })`, plus `@neon/oauth/mcp/next`'s `withMcpAuth` and `createMetadataHandlers`, which serve the discovery file and answer `401` with `resource_metadata`.
  - It accepts JWTs only, checking the exact issuer and that the audience includes the resource.
  - Its types import the MCP SDK 1.x's `AuthInfo`, so it pairs with `@modelcontextprotocol/sdk` 1.x, whose `WebStandardStreamableHTTPServerTransport` runs stateless in a route handler.
- **`mcp-handler` 2.1.1:** `withMcpAuth` lets a tokenless request reach the tools unless `required: true`. Its `protectedResourceHandler` reports the origin as the resource unless given `resourceUrl`.
- **Better Auth's OAuth provider (1.7.18):**
  - No `resource` means an opaque token, and with one the token is a JWT.
  - A refresh rotates the refresh token and gives the new one a full 30 days. Replaying an old one outside the reuse window revokes the whole family.
  - `offline_access` is needed for a refresh token.
  - Consent is kept per client and user, and asked again only for new scopes or resources.

## Claude's side, from its docs

- Claude Code supports CIMD, dynamic registration, and a pre-registered client (`--client-id`, `--client-secret`, `--callback-port`). It refreshes tokens on its own, and stores them "securely", without saying where or whether sessions share them.
- claude.ai's connectors show up in the desktop app's Code sessions, and scheduled tasks list "config files and connectors". A claude.ai custom connector calls from Anthropic's cloud, so it needs a public address. It supports CIMD, dynamic registration or your own client, and request headers are a beta for some organizations.
- The MCP authorization spec (2025-06-18) requires clients to send `resource` on both the authorization and the token request.

## Sources

- Neon, OAuth provider: https://neon.com/docs/auth/guides/plugins/oauth-provider
- Neon, an MCP server with Managed Better Auth: https://neon.com/docs/compute/functions/mcp-server
- MCP authorization spec: https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization
- Claude Code, MCP: https://code.claude.com/docs/en/mcp
- Claude Code, desktop scheduled tasks: https://code.claude.com/docs/en/desktop-scheduled-tasks
- claude.ai custom connectors: https://claude.com/docs/connectors/custom/add-unlisted
- Vercel, MCP servers on Next.js: https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel
