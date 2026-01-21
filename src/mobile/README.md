# @teamd/mobile-components

Team D's React Native mobile component package for the Large Event Platform.

## Overview

This package provides reusable React Native components that integrate with the mobile app. Components are built with TypeScript and designed to work seamlessly with the platform's authentication and data infrastructure.

**Dual-Mode Package:**
- **Library Mode** (`src/`): Exports React Native components for consumption by mobile app
- **Standalone Mode** (`standalone/`): Complete Expo app for independent development and testing

## Package Structure

```
teams/teamD/src/mobile/
├── src/                        # Library Mode - Component exports
│   ├── components/            # Reusable UI components
│   │   └── Placeholder.tsx
│   ├── services/              # API clients and utilities
│   │   └── api.ts
│   ├── types/                 # TypeScript type definitions
│   │   └── index.ts
│   └── index.ts               # Main export file
├── standalone/                 # Standalone Mode - Complete app
│   ├── App.tsx                # Root component
│   ├── index.js               # Expo entry point
│   ├── app.json               # Expo configuration
│   ├── babel.config.js        # Babel configuration
│   ├── metro.config.js        # Metro bundler config
│   ├── contexts/              # Auth and app contexts
│   │   └── AuthContext.tsx
│   ├── navigation/            # Navigation setup
│   │   └── RootNavigator.tsx
│   └── screens/               # App screens
│       ├── LoginScreen.tsx
│       ├── HomeScreen.tsx
│       └── ProfileScreen.tsx
├── dist/                      # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Development Workflows

### Option 1: Standalone Mode (Recommended for Independent Development)

Run Team D's mobile app independently for faster iteration and focused development.

**Step 1: Install Dependencies**
```bash
cd teams/teamD/src/mobile
pnpm install
```

**Step 2: Start the Standalone App**
```bash
# Start Expo development server
pnpm start

# Or directly on iOS/Android
pnpm ios      # iOS Simulator
pnpm android  # Android Emulator
```

**Step 3: Develop Components**
- Create components in `src/components/`
- Export them from `src/index.ts`
- Use them in `standalone/screens/HomeScreen.tsx`
- Changes appear instantly with Fast Refresh

**Benefits:**
- ✅ Faster feedback loop (no mobile app rebuild needed)
- ✅ Complete isolation for Team D features
- ✅ Full control over navigation and auth
- ✅ Easier debugging and testing

### Option 2: Library Mode (Testing Integration with Mobile App)

Build components as a library and test them within the integrated mobile app.

**Step 1: Build the Package**
```bash
# From mobile package directory
pnpm build

# Or watch mode for auto-rebuild
pnpm dev
```

**Step 2: Test in Mobile App**
```bash
# From repository root
cd apps/mobile
pnpm dev
```

**Step 3: View Components**
Navigate to the Team D tab in the mobile app to see your components integrated with the full platform.

**Benefits:**
- ✅ Test components in real integration context
- ✅ Verify authentication and data flow with platform
- ✅ See how components work alongside other teams
- ✅ Test full user journey

### When to Use Each Mode

| Use Standalone Mode When... | Use Library Mode When... |
|------------------------------|--------------------------|
| Building new components | Testing integration |
| Rapid iteration needed | Verifying auth/data flow |
| Debugging Team D features | Preparing for production |
| Demonstrating to stakeholders | Testing with other teams |

## API Configuration & Requirements

### Standalone Mode Requirements

**Required Services:**
- ✅ **Team D API** (port 3004) - Backend API server
- ✅ **PostgreSQL** (port 5432) - Database
- ✅ **Redis** (port 6379) - Cache and sessions

**NOT Required:**
- ❌ Internal Gateway (port 3000)
- ❌ Nginx Gateway (port 80)
- ❌ web-admin server (port 4101)
- ❌ Other team APIs

**API Connection:**
- **iOS Simulator**: `http://localhost:3004/api`
- **Android Emulator**: `http://10.0.2.2:3004/api`
- **Production**: `https://api.large-event.com/api/v1/teamD`

**Starting Required Services:**
```bash
# From repository root
docker-compose up -d postgres redis

# Start Team D API
cd teams/teamD/src/api
pnpm dev
```

### Library Mode Requirements

**Required Services:**
- ✅ **Mobile app** (Expo app)
- ✅ **Team D API** (port 3004) - For Team D components
- ✅ **web-admin server** (port 4101) - For mobile app auth
- ✅ **PostgreSQL** + **Redis**

**Note:** Library components use Team D API (3004) directly, while mobile app auth uses web-admin server (4101). Both must be running for full functionality.

### Platform-Specific Configuration

The app automatically detects the platform and uses the correct API URL:

```typescript
// iOS Simulator
localhost:3004 → Team D API

// Android Emulator
10.0.2.2:3004 → Team D API (Android uses 10.0.2.2 for host's localhost)

// Physical Device
Use your local network IP (e.g., 192.168.1.100:3004)
```

### Authentication Token

**Token Storage Key:** `@large-event/auth_token`

Both standalone and library modes use the same token key, allowing authentication state to be shared across contexts (if using the same device/simulator).

## Creating Components

### Component Structure

All components should accept `TeamComponentProps`:

```typescript
import type { TeamComponentProps } from '@teamd/mobile-components';

export function MyComponent({ user, token, instances }: TeamComponentProps) {
  // Your component logic
}
```

### Example Component

```typescript
// src/components/EventsList.tsx
import React from 'react';
import { View, Text, FlatList } from 'react-native';
import type { TeamComponentProps } from '../types';

export function EventsList({ user, token, instances }: TeamComponentProps) {
  return (
    <View>
      <Text>Events for {user.firstName}</Text>
      {/* Your component UI */}
    </View>
  );
}
```

### Exporting Components

Add new components to [src/index.ts](src/index.ts):

```typescript
// Export your new component
export { EventsList } from './components/EventsList';
export { EventDetails } from './components/EventDetails';

// Re-export types for consumers
export type { TeamComponentProps } from './types';
```

## API Integration

The package includes a pre-configured API client for Team D's backend:

```typescript
import { teamDInstances, teamDUsers, tokenStorage } from '@teamd/mobile-components';

// Fetch instances
const instances = await teamDInstances.getAll();

// Get user profile
const profile = await teamDUsers.getProfile();

// Token management
await tokenStorage.save('your-jwt-token');
const token = await tokenStorage.get();
```

### API Configuration

The API client is configured for different platforms:

- **iOS Simulator**: `http://localhost:3004/api/v1/teamD`
- **Android Emulator**: `http://10.0.2.2:3004/api/v1/teamD`
- **Physical Device/Production**: Uses environment-specific URLs

## Publishing Workflow

### Option 1: Workspace Dependencies (Current)

Components are linked as workspace dependencies via pnpm:

```json
{
  "dependencies": {
    "@teamd/mobile-components": "workspace:*"
  }
}
```

**Advantages**:
- Instant updates during development
- No publish step required
- Works immediately with Metro bundler

### Option 2: Verdaccio (Local npm Registry)

For production-like testing, publish to Verdaccio:

```bash
# Ensure Verdaccio is running
docker-compose up -d verdaccio

# Build and publish
pnpm teamd:mobile:publish
```

Then install in mobile app:

```bash
cd apps/mobile
pnpm add @teamd/mobile-components@1.0.0
```

## TypeScript Configuration

The package uses a standalone TypeScript configuration optimized for React Native:

- **Target**: ESNext
- **Module**: CommonJS (for React Native compatibility)
- **JSX**: react-native
- **Declarations**: Enabled (generates .d.ts files)

## Testing Components

### In Mobile App

1. Build the package: `pnpm teamd:mobile:build`
2. Start mobile app: `cd apps/mobile && pnpm dev`
3. Use Expo Go or a simulator to view changes

### Hot Reload

For the best development experience:

1. Run build in watch mode: `pnpm teamd:mobile:dev`
2. Start mobile app in parallel: `cd apps/mobile && pnpm dev`
3. Changes to components will trigger automatic rebuilds

## Available Components

### TeamDPlaceholder

A demo component showing integration patterns:

```typescript
import { TeamDPlaceholder } from '@teamd/mobile-components';

<TeamDPlaceholder user={user} token={token} instances={instances} />
```

**Features**:
- Displays user authentication status
- Shows available instances
- Demonstrates API integration
- Pull-to-refresh functionality
- Error handling examples

## Common Tasks

### Adding a New Component

1. Create component file: `src/components/MyComponent.tsx`
2. Export from `src/index.ts`
3. Build: `pnpm teamd:mobile:build`
4. Use in mobile app: `import { MyComponent } from '@teamd/mobile-components'`

### Updating Types

1. Edit `src/types/index.ts` or create new type files
2. Export from `src/index.ts`
3. Rebuild the package
4. Types are automatically available to consumers

### Debugging Build Issues

```bash
# Clean dist folder
pnpm teamd:mobile:clean

# Rebuild from scratch
pnpm teamd:mobile:build

# Check TypeScript compilation
cd teams/teamD/src/mobile
pnpm tsc --noEmit
```

## Dependencies

### Runtime Dependencies

- **@large-event/api-types**: Shared type definitions
- **axios**: HTTP client for API requests
- **@react-native-async-storage/async-storage**: Token storage

### Peer Dependencies

- **react**: 18.2.0
- **react-native**: 0.74.5

These are provided by the mobile-shell and not bundled with the package.

## Best Practices

1. **Always use TypeScript**: All components should have proper type definitions
2. **Export types**: Make TypeScript interfaces available to consumers
3. **Handle errors gracefully**: Use try/catch and show user-friendly messages
4. **Test on multiple platforms**: iOS simulator, Android emulator, and physical devices
5. **Keep components focused**: Each component should have a single responsibility
6. **Document props**: Use JSDoc comments for component props

## Troubleshooting

### Module not found: @teamd/mobile-components

**Solution**: Ensure the package is built and installed:

```bash
pnpm teamd:mobile:build
pnpm install
```

### Type errors in mobile app

**Solution**: Rebuild the package to regenerate .d.ts files:

```bash
pnpm teamd:mobile:clean
pnpm teamd:mobile:build
```

### Changes not reflecting

**Solution**: Restart Metro bundler with cache clear:

```bash
cd apps/mobile
pnpm start -- --clear
```

## Version History

- **1.0.0** (Initial Release)
  - TeamDPlaceholder component
  - API client utilities
  - Token storage helpers
  - TypeScript definitions

## Contributing

When adding features to this package:

1. Follow the established file structure
2. Add TypeScript types for all new exports
3. Update this README with new components
4. Test in both development and build modes
5. Rebuild the package before committing

## Related Documentation

- [Mobile App README](../../../../apps/mobile/README.md)
- [API Types Package](../../../../shared/api-types/README.md)
- [Team D API Documentation](../api/README.md)
- [Project Root Documentation](../../../../README.md)

## Support

For questions or issues:

1. Check the [main project documentation](../../../../README.md)
2. Review mobile app integration patterns
3. Consult Team D's API documentation
4. Reach out to the platform team

---

**Package**: @teamd/mobile-components
**Version**: 1.0.0
**License**: Private
**Platform**: React Native 0.74.5
