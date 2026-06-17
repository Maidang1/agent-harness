# JIAJIA

React + Vite frontend with a local Tauri AG-UI adapter, OpenRouter calls, and a Tauri desktop shell.

## Project Structure

`src/` keeps app entry files at the top level and groups feature modules by responsibility:

- `src/config/`: client settings, provider selection, and settings form normalization.
- `src/model-clients/`: OpenRouter and Codex client bridges.
- `src/memory/`: local reading memory data, persistence, and learning records.
- `src/chat/`: conversation persistence, sidebar data, and text content helpers.
- `src/recommendations/`: recommendation analytics and stats.
- `src/layout/`: shared layout constants for the thread shell.
- `src/updates/`: desktop app update checks, download state, and restart helpers.
- `src/components/thread/`: chat workspace, thread views, composer, sidebar, and settings UI.
- `src/components/ui/`: reusable shadcn-style primitives.

## Setup

```sh
corepack pnpm install
```

Use the settings entry in the sidebar to configure API keys on the client. The panel stores OpenRouter API Key, OpenRouter model, OpenRouter endpoint, Codex settings, and WeChat Reading API Key in local browser storage.

The reading hub can manually sync WeChat Reading data through the local Tauri gateway. Synced data is cached in the app data directory as `weread-snapshot.json`; local reading plans, recommendation cards, and review drafts are saved as `reading-workspace.json`.

## Web Development

Run the frontend:

```sh
corepack pnpm dev
```

## Desktop Development

Run the Tauri desktop app with the local Vite dev server:

```sh
corepack pnpm tauri:dev
```

The desktop dev command starts Vite on `http://127.0.0.1:1420` and opens the `JIAJIA` window.

## Desktop Build

Build a desktop package:

```sh
corepack pnpm tauri:build
```

## Desktop Release Updates

The desktop updater reads release metadata from:

```txt
https://github.com/Maidang1/agent-harness/releases/latest/download/latest.json
```

Updater signing keys were generated locally at:

- Private key: `~/.tauri/book-agent.key`
- Public key: `~/.tauri/book-agent.key.pub`
- Password: `~/.tauri/book-agent.key.password`

Set these GitHub Actions secrets before publishing a release:

- `TAURI_SIGNING_PRIVATE_KEY`: contents of `~/.tauri/book-agent.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: contents of `~/.tauri/book-agent.key.password`

Before tagging a release, keep `package.json`, `src-tauri/Cargo.toml`, and
`src-tauri/tauri.conf.json` on the same SemVer version.
