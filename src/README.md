# CapstoneMock Source Code

This project follows a modular architecture with the following structure:

## Directory Structure

```
src/
├── api/              # Team's API server
├── web-user/         # Team's user-facing web app
├── web-admin/        # Team's admin web app
├── mobile/           # Team's mobile components
└── shared/           # Team-specific utilities
```

## Components

- **api/**: Backend API server implementation
- **web-user/**: Frontend application for end users
- **web-admin/**: Administrative dashboard and management interface
- **mobile/**: Mobile application components and utilities
- **shared/**: Common utilities, types, and shared code across components

This structure supports both standalone development and integration within the larger large-event project architecture.

## Setup

Basic setup steps to ensure this works for us.

First ensure you have Postgres and Node.js are downloaded on your local computer.

Stay in the root folder and all commands should be done in the root folder unless specified: MES-Event-Management-System (not src).

Then install pnpm (faster npm) after you have node installed with `npm install -g pnpm`.

After having pnpm installed run `pnpm install` to download all the node modules. **Make sure your gitignore has node_modules. You should NOT push any node_modules files to the repo.**

### Database Setup

In the root folder run `pnpm dbsetup`. This should create the database and and push the current schemas into the database as tables. You should see some output saying database created or db already exists and then something saying schema pushed.

### Running the Web App

Run `pnpm dev` to run both web-admin and web-user.

### Running the Mobile App
