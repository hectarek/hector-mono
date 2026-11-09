// What a verified MCP request carries, in the shape the MCP SDK's transport takes as `authInfo`.
export type McpAuthInfo = {
  token: string;
  clientId: string;
  scopes: string[];
  expiresAt?: number;
  resource?: URL;
  extra?: Record<string, unknown>;
};

// The caller a request's access token verified as: its account, and the token's details.
export type McpCaller = { userId: string; authInfo: McpAuthInfo };

// The MCP endpoint's sign-in (docs/build-plan.md KTD22): checks a request's bearer token against
// this branch's Neon Auth issuer and the endpoint's own address, and serves the discovery file.
export interface IMcpAuthService {
  // The caller, or the response to send instead: 401 pointing to the discovery file for a missing
  // or bad token, or 503 when the issuer can't be reached.
  authenticate(request: Request): Promise<McpCaller | Response>;
  // The discovery file (RFC 9728) at either of its paths, or undefined for any other request.
  discovery(request: Request): Response | undefined;
}
