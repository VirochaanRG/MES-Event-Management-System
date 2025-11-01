# Team D CapstoneMock

This repository contains Team D's implementation for the CapstoneMock project, designed to work both standalone and as part of the larger large-event project.

## Project Structure

```
src/
├── api/              # Team's API server
├── web-user/         # Team's user-facing web app (port 3002)
├── web-admin/        # Team's admin web app (port 3001)
├── mobile/           # Team's mobile components
└── shared/           # Team-specific utilities
```

## Quick Start

### Standalone Development

```bash
# Install dependencies
pnpm install

# Run both web apps in development mode
pnpm dev

# Run individual apps
pnpm dev:admin    # web-admin on port 3001
pnpm dev:user     # web-user on port 3002

# Build all apps
pnpm build

# Run production builds
pnpm start
```

### Individual App Commands

#### Web Admin (Port 3001)
```bash
cd src/web-admin
pnpm dev    # Development mode
pnpm build  # Production build
pnpm start  # Production server
```

#### Web User (Port 3002)
```bash
cd src/web-user
pnpm dev    # Development mode
pnpm build  # Production build
pnpm start  # Production server
```

## Integration with large-event Project

This project is designed to integrate seamlessly with the large-event monorepo:

1. The `teams/teamD/src` workspace is already configured in large-event
2. Dependencies and scripts are compatible with the parent project
3. Port configuration ensures no conflicts with other team apps

## Technology Stack

- **Next.js 14.2.3**: React framework with App Router
- **React 18.3.1**: UI library
- **TypeScript 5.4.5**: Type safety
- **pnpm**: Package manager with workspace support

## Development URLs

- Web Admin: http://localhost:3001
- Web User: http://localhost:3002

The folders and files for this project are as follows:

docs - Documentation for the project
refs - Reference material used for the project, including papers
src - Source code
test - Test cases