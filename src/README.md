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

First ensure you have Postgres and Node.js are downloaded on your local computer. **If you don't want to change the password just set the password as "password" when you download postgres**. Currently the .ENV file dooesn't work so you will have to fill in the password you do set in the postgres url.

Stay in the root folder and all commands should be done in the root folder unless specified: MES-Event-Management-System (not src).

Then install pnpm (faster npm) after you have node installed with `npm install -g pnpm`.

After having pnpm installed run `pnpm install:all` to download all the node modules for both the web and mobile apps. **Make sure your gitignore has node_modules. You should NOT push any node_modules files to the repo.**

To install just the web app modules, you can use `pnpm install` from the root.
To install just the mobile app modules, use `pnpm install:mobile` from the root.

### Database Setup

In the root folder run `pnpm dbsetup`. This should create the database and and push the current schemas into the database as tables. You should see some output saying database created or db already exists and then something saying schema pushed. Then run `pnpm migrate` just to make sure the schemas have been pushed in.

#### Database already exists

If the database already exists and you need to update the schemas so cd int to the src/db folder and run `pnpm generate:simple` and then `pnpm migrate` and it should work. You can check if has been created by running `pnpm studio` and seeing if the tables are there.

### Running the Web App

Run `pnpm dev` to run both web-admin and web-user. If it is your first time you have to run `pnpm build:full` first and then run `pnpm dev`.

### Running the Mobile App

Start the server with `pnpm dev:server`. In another terminal, connect to an emulator/physical device, and run `pnpm dev:mobile` to build and preview the app in an Expo development server.

**Note: concurrently often does not work with expo, which is why you have to run both commands separately in split terminals.**
