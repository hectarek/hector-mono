# Lighthouse CI Setup

Lighthouse CI is configured to test your app for 100% scores across all categories.

## Quick Start

### Option 1: Run with Existing Dev Server

If you already have `bun run dev` running:

1. **Stop the existing dev server** (or use Option 2)
2. Run Lighthouse:
   ```bash
   bun run lighthouse
   ```

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

2. **Start your dev server manually**:
   ```bash
   bun run dev
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
- **PWA**: Minimum score 1.0 (100%)

## Troubleshooting

### Port Already in Use

**Error**: `Port 3000 is in use`

**Solution**: 
1. Stop the existing dev server:
   ```bash
   # Find and kill the process
   lsof -ti:3000 | xargs kill -9
   ```

2. Or update `.lighthouserc.js` to use a different port:
   ```javascript
   url: ["http://localhost:3001"],
   ```

### Lock File Error

**Error**: `Unable to acquire lock at .next/dev/lock`

**Solution**:
1. Stop all Next.js dev servers
2. Delete the lock file:
   ```bash
   rm -rf .next/dev/lock
   ```
3. Run Lighthouse again

### Server Not Starting

**Error**: Server doesn't start in time

**Solution**: Increase timeout in `.lighthouserc.js`:
```javascript
startServerReadyTimeout: 60000, // 60 seconds instead of 30
```

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run Lighthouse CI
  run: |
    bun run build
    bun run start &
    sleep 5
    bun run lighthouse:ci
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
- **PWA**: Service worker, manifest, offline support

