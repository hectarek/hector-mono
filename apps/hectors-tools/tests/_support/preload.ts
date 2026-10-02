// Runs before every test file (bunfig.toml [test].preload).
// Bun loads .env for tests too. Drop the Gateway credentials so no test can reach the paid
// AI Gateway, and so tests behave the same with or without a .env.
for (const key of ["AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN"]) {
  delete process.env[key];
}
