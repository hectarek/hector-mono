// Runs before every test file (bunfig.toml [test].preload).

// Bun loads .env for tests too. Drop the app's credentials and account settings so no test
// can reach the test project's database, auth or Google, and so tests behave the same with
// or without a .env.
for (const key of [
  "DATABASE_URL",
  "NEON_AUTH_BASE_URL",
  "NEON_AUTH_COOKIE_SECRET",
  "OWNER_USER_ID",
  "AGENT_USER_ID",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_CALENDAR_ACCOUNT_EMAIL",
  "CALENDAR_TOKEN_KEY",
]) {
  delete process.env[key];
}
