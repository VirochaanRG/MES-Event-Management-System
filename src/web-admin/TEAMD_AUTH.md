# TeamD Portal Authentication

This portal supports two authentication methods for maximum development flexibility.

## 🚀 Local Development Auth (Recommended for TeamD developers)

**Quick start for local development:**

1. Visit `http://localhost:3014/`
2. Click "Use Local Login"
3. Use any of these test accounts:
   - `teamd@large-event.com`
   - `admin@teamd.local`
   - `member@teamd.local`

**Benefits:**
- No need to run the main portal (`localhost:4001`)
- Faster development cycle
- Independent of large-event infrastructure
- TeamD-specific user accounts

## 🌐 Main Portal Auth (Full system integration)

**For testing full system integration:**

1. Start main portal: `cd /Users/luke/Dev/MacEngSociety/large-event/apps/web-user && pnpm dev`
2. Visit `http://localhost:4000` and login
3. Navigate to Team D portal or visit with auth token

**Benefits:**
- Full integration testing
- Real user accounts from main system
- Cross-team portal navigation
- Production-like authentication flow

## Development Commands

```bash
# Start TeamD portal only (for local auth)
pnpm dev

# Build
pnpm build

# Start with main portal for full integration
# Terminal 1:
cd /Users/luke/Dev/MacEngSociety/large-event/apps/web-user && pnpm dev
# Terminal 2:
pnpm dev
```

## Authentication Priority

1. **URL Token**: Auth token passed via `?auth=...` (from main portal)
2. **Stored Session**: Previous login stored in sessionStorage
3. **Main Portal Check**: Automatic check if logged into main portal
4. **Login Required**: Show auth options (local or main portal)

## Notes

- Local auth tokens expire after 8 hours
- Main portal auth tokens expire after 24 hours
- Sessions are stored in sessionStorage (cleared on tab close)
- Auth source is displayed in the green header bar