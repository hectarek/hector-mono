import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { MockAuthService } from "@/src/infrastructure/services/mock-auth.service";
import { MockMcpAuthService } from "@/src/infrastructure/services/mock-mcp-auth.service";
import { NeonAuthService } from "@/src/infrastructure/services/neon-auth.service";
import { NeonMcpAuthService } from "@/src/infrastructure/services/neon-mcp-auth.service";

// The MCP endpoint's own URL in local development (`next dev` on 3101, .claude/launch.json).
// Every deployment sets MCP_RESOURCE (docs/build-plan.md KTD22).
const DEV_MCP_RESOURCE = "http://localhost:3101/mcp";

export function createAuthenticationModule() {
  const authModule = createModule();

  if (process.env.NODE_ENV === "test") {
    authModule.bind(DI_SYMBOLS.IAuthenticationService).toClass(MockAuthService);
    authModule.bind(DI_SYMBOLS.IMcpAuthService).toClass(MockMcpAuthService);
  } else {
    authModule
      .bind(DI_SYMBOLS.IAuthenticationService)
      .toClass(NeonAuthService, [DI_SYMBOLS.ILoggerService]);
    authModule.bind(DI_SYMBOLS.McpAuthConfig).toValue({
      baseUrl: process.env.NEON_AUTH_BASE_URL,
      resource:
        process.env.MCP_RESOURCE ??
        (process.env.NODE_ENV === "development" ? DEV_MCP_RESOURCE : undefined),
    });
    authModule
      .bind(DI_SYMBOLS.IMcpAuthService)
      .toClass(NeonMcpAuthService, [DI_SYMBOLS.McpAuthConfig]);
  }

  return authModule;
}
