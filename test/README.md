# Automated tests

This directory contains the various automated test suites used by the project. It is
split into two main areas:

- **Server API Testing** – exercises the back‑end endpoints for both the
  web-admin and web-user applications. These tests are imported directly by the
  Vitest configs under `src/web-admin` and `src/web-user`.

- **Component Tests** – located in `Component Tests/web-admin` (and in the
  future `.../web-user` if UI tests are added). These are **pure unit tests**
  targeting React components, helpers and client‑side logic. They do **not**
  invoke any server code, which avoids overlap with the API tests.

Describe ...
