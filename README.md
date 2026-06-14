# Book Agent

React + Vite frontend with a local Tauri AG-UI adapter, OpenRouter calls, and a Tauri desktop shell.

## Setup

```sh
corepack pnpm install
```

Set `OPENROUTER_API_KEY` in the environment or in `.dev.vars` at the project root. Optional: set `OPENROUTER_MODEL`; the default model is `deepseek/deepseek-v4-flash`.

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

The desktop dev command starts Vite on `http://127.0.0.1:1420` and opens the `Book Agent` window.

## Desktop Build

Build a desktop package:

```sh
corepack pnpm tauri:build
```
