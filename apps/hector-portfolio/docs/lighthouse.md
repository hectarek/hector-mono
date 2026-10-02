# Lighthouse CI Setup

Lighthouse CI is configured to test your app for 100% scores across all categories.

## Quick Start

Run it from the app directory. It isn't part of CI (`.github/workflows/ci.yml` runs lint, typecheck and tests only).

### Option 1: Let Lighthouse Start the Server

1. **Stop anything on port 3000** (a dev server, or an earlier `next start`)
2. Run Lighthouse:
   ```bash
   cd apps/hector-portfolio
   bun run lighthouse
   ```

`.lighthouserc.js` runs `bun run build && bun run start`, so it audits a production build, not the dev server.

### Option 2: Use Existing Server

If you want to test against an already-running server:

1. **Edit `.lighthouserc.js`**:
   ```javascript
   collect: {
     url: ["http://localhost:3000"],
     startServerCommand: null, // Don't start server
     // ... rest of config
   }
   ```

2. **Build and start a production server manually**:
   ```bash
   bun run build && bun run start
   ```

3. **Run Lighthouse** (in another terminal):
   ```bash
   bun run lighthouse
   ```

## Configuration

Lighthouse CI is configured in `.lighthouserc.js`:

- **Performance**: Minimum score 1.0 (100%)
- **Accessibility**: Minimum score 1.0 (100%)
- **Best Practices**: Minimum score 1.0 (100%)
- **SEO**: Minimum score 1.0 (100%)

Reports stay local: the `filesystem` upload target writes the HTML and JSON reports for each URL, plus a `manifest.json`, to `.lighthouseci/reports/`. LHCI keeps its raw run results in `.lighthouseci/` too, and the whole folder is gitignored. Nothing is uploaded; the `temporary-public-storage` target would publish each report at a public URL.

Lighthouse 12 (the version `@lhci/cli` 0.15 runs) has no PWA category, so there's no PWA assertion.

## Troubleshooting

### Port Already in Use

**Error**: `Port 3000 is in use`

**Solution**: 
1. Stop the server that's using the port (the dev server, or an earlier `next start`).

2. Or update `.lighthouserc.js` to use a different port:
   ```javascript
   url: ["http://localhost:3001"],
   startServerCommand: "bun run build && bun run start --port 3001",
   ```

### Server Not Starting

**Error**: Server doesn't start in time

**Solution**: Increase timeout in `.lighthouserc.js` (it covers the build too):
```javascript
startServerReadyTimeout: 180000, // 3 minutes instead of 2
```

## Manual Testing

You can also run Lighthouse manually in Chrome:

1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Run audit
4. Check scores match requirements

## Scores Breakdown

- **Performance**: Core Web Vitals, loading metrics
- **Accessibility**: ARIA labels, contrast, keyboard navigation
- **Best Practices**: HTTPS, modern APIs, no console errors
- **SEO**: Meta tags, structured data, sitemap

