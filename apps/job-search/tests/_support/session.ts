// Who's signed in, for pages, actions and route handlers run through the test container.
import { getInjection } from "@/di/container";
import {
  MockAuthService,
  TEST_ACCOUNTS,
} from "@/src/infrastructure/services/mock-auth.service";

// The test container's auth service, which says who's signed in.
export function testAuth(): MockAuthService {
  const auth = getInjection("IAuthenticationService");
  if (!(auth instanceof MockAuthService)) {
    throw new Error("The test container should use MockAuthService");
  }
  return auth;
}

// Signs in as one of the test container's accounts: the owner, the agent or a stranger (an
// account that isn't one of the app's two). The container lives for the whole run, so each
// test that depends on who's signed in says so.
export function signInAs(account: keyof typeof TEST_ACCOUNTS | "signed-out") {
  testAuth().session = account === "signed-out" ? null : TEST_ACCOUNTS[account];
}
