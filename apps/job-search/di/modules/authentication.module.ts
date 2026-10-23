import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { MockAuthService } from "@/src/infrastructure/services/mock-auth.service";
import { NeonAuthService } from "@/src/infrastructure/services/neon-auth.service";

export function createAuthenticationModule() {
  const authModule = createModule();

  if (process.env.NODE_ENV === "test") {
    authModule.bind(DI_SYMBOLS.IAuthenticationService).toClass(MockAuthService);
  } else {
    authModule
      .bind(DI_SYMBOLS.IAuthenticationService)
      .toClass(NeonAuthService, [DI_SYMBOLS.ILoggerService]);
  }

  return authModule;
}
