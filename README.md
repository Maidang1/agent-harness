# Book Agent

React + Vite frontend with a local Tauri AG-UI adapter, OpenRouter calls, and a Tauri desktop shell.

## Setup

```sh
corepack pnpm install
```

Use the settings button in the app header to configure API keys on the client. The panel stores OpenRouter API Key, OpenRouter model, OpenRouter endpoint, and WeChat API Key in local browser storage.

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
