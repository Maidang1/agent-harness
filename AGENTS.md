# Repository Guidelines

## Project Structure & Module Organization

`src/` contains the React + TypeScript app. Core UI starts at `src/App.tsx`, thread UI lives in `src/components/`, the AG-UI/OpenRouter bridge lives in `src/agents/`, and client persistence helpers live in `src/client-config.ts`, `src/chat-store.ts`, and `src/sidebar-data.ts`.

`tests/` contains Node test files named `*.test.ts`. `public/` stores static browser assets. `src-tauri/` contains the Tauri 2 desktop shell, Rust commands, capabilities, icons, and packaging config. Build output goes to `dist/` and `src-tauri/target/`.

## Build, Test, and Development Commands

- `corepack pnpm install`: install dependencies with the pinned pnpm version.
- `corepack pnpm dev`: run the Vite web app locally.
- `corepack pnpm tauri:dev`: run the desktop app with Vite on `http://127.0.0.1:1420`.
- `corepack pnpm test`: run `node --test tests/*.test.ts`.
- `corepack pnpm lint`: run ESLint across TypeScript and React files.
- `corepack pnpm build`: build the Vite frontend.
- `corepack pnpm tauri:build`: build the macOS desktop app bundle.

## Coding Style & Naming Conventions

Use TypeScript ESM with single quotes, no semicolons, and two-space indentation. Prefer named exports for reusable helpers and PascalCase for React components. Keep component-specific logic near the component and shared pure helpers in `src/*.ts` modules.

Use camelCase for TypeScript variables and functions, PascalCase for types and components, and kebab-case for files that represent data or non-component modules. Use Rust `snake_case` and `rustfmt` defaults inside `src-tauri/src/`.

## Testing Guidelines

Use Node’s built-in `node:test` plus `node:assert/strict`. Add tests under `tests/` with the pattern `<module>.test.ts`, mirroring the source module when practical. Cover config migrations, persistence normalization, sidebar data transforms, and Rust command behavior when it affects app-visible results.

Run `corepack pnpm test` before opening a PR. Run `corepack pnpm lint` and `corepack pnpm build` for changes touching app code, dependencies, or Tauri integration.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit prefixes such as `feat:`. Use short, imperative commit messages like `feat: add preference memory` or `fix: handle empty OpenRouter response`.

PRs should include the user-facing change, verification commands, linked issue or task context, and screenshots for visible UI changes. Call out changes to local storage keys, Tauri permissions, API key handling, or OpenRouter request shape.

## Security & Configuration Tips

API keys are configured through the app settings UI and stored locally on the client. Keep real secrets out of committed files, screenshots, tests, and sample payloads.
