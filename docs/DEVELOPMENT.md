# Development

## Prerequisites

- **Node.js 22+** and npm
- **Windows** (the only supported target today)
- A **Microsoft account that owns Minecraft: Java Edition** (to sign in and launch)

## Setup

```bash
npm install
npm run dev
```

`npm run dev` builds main/preload/renderer and opens the real Electron window with
hot reload for the renderer.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev app with hot reload |
| `npm run build` | Production build (`out/`) |
| `npm run preview` | Run the production build |
| `npm run typecheck` | `typecheck:node` + `typecheck:web` |
| `npm run typecheck:node` | Type-check main + preload |
| `npm run typecheck:web` | Type-check the renderer |

**Definition of done for a change:** `npm run typecheck && npm run build` pass, then
manually verify in `npm run dev`. There is no automated test suite, and only a human
can sign in / launch the game.

## Troubleshooting

### `npm` blocked: "running scripts is disabled on this system"
PowerShell's execution policy blocks npm's `.ps1` shim. Either:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned   # one-time, recommended
```

…or just call the `.cmd` shim every time: `npm.cmd run dev`.

### App fails to start: "Error: Electron uninstall"
Electron's binary wasn't downloaded (a skipped postinstall). Fetch it:

```bash
node node_modules/electron/install.js
```

### Dependency conflicts on install
Pin compatible versions: electron-vite 5 supports Vite ≤ 7, so use `vite@^7` and
`@vitejs/plugin-react@^4`. Do **not** let `@vitejs/plugin-react@6` in — it requires
Vite 8 and will break the electron-vite build.

### TypeScript errors after touching config
This repo uses **TypeScript 7**:
- `baseUrl` is removed — use relative paths (or `paths` without `baseUrl`).
- Side-effect imports of assets (e.g. `import './styles/global.css'`) need an
  ambient declaration; see `src/renderer/src/assets.d.ts`.

### A loader instance crashes on launch
See the CLAUDE.md **Gotchas** — most loader launch failures we hit were about native
library layout, natives on the classpath, or library de-duplication. The per-instance
**Console** (button on the instance card) shows the game's stdout/stderr, which is
where the real error will be.

## Data & resetting state

All runtime data lives under `%APPDATA%\nodriftlauncher` (see the README for the
tree). Useful when debugging:

- Delete an instance folder under `instances/` to remove just that instance.
- Delete `runtime/versions/<id>/.installed` to force a re-install of that runtime.
- Delete `auth.bin` to force a fresh sign-in.
- Delete `runtime/` entirely to re-download everything (instances are preserved).

## Regenerating the skin catalog

The bundled catalog PNGs in `resources/skins/` were produced by a small no-dependency
PNG generator. To change or add catalog skins, drop valid 64×64 PNG skins into
`resources/skins/` — they're picked up automatically at runtime. (When packaging is
set up, this folder must be included via electron-builder `extraResources`.)

## Coding notes

- Match the surrounding style: explicit types on exported functions, discriminated
  `Result` unions across IPC, comments that explain *why* (especially around the
  loader/natives edge cases).
- Keep all OS-specific behaviour in `src/main/platform/` so non-Windows support stays
  a possibility.
- Keep secrets in main; never widen the preload surface beyond what the UI needs.
