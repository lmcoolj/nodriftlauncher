# NodriftLauncher

A custom Minecraft: Java Edition launcher for Windows, built with Electron, TypeScript and React.

NodriftLauncher signs you in with your real Microsoft account, manages isolated
instances with a shared runtime store (the MultiMC/Prism model), launches
**Vanilla, Fabric, Forge and NeoForge**, browses and installs mods from Modrinth,
imports/exports packs (`.mrpack` and `.zip`), and lets you change your skin.

> Windows-only today, but window and launch code lives behind a platform layer so
> Linux/macOS can be added without a rewrite.

---

## Features

- **Real Microsoft authentication** — full MS → Xbox Live → XSTS → Minecraft chain.
  Stays signed in across restarts (refresh token encrypted at rest via the OS keystore).
- **Instances** — create/edit/delete/import/export. Each instance has its own
  isolated saves, configs, mods and resource packs; the version JAR, libraries,
  assets and Java runtime are **shared** and downloaded once per version+loader.
- **All four loaders launch for real** — Vanilla, Fabric, NeoForge, Forge, including
  auto-downloaded per-version Java and Forge/NeoForge's bytecode-processor install.
- **Instance Viewer** — a per-instance page with live **Logs**, per-instance **Mods**
  (enable/disable, import), a **Files** browser, and **resource-pack** management.
- **Mods browser** — Modrinth search with instant results, a **filters** sidebar
  (environment / version / loader / category), rich mod **detail pages** (formatted
  descriptions), **dependency auto-install**, and **multi-select** batch install.
- **Import / Export** — real Modrinth `.mrpack` and a portable `.zip` format.
- **Cosmetics** — view your current skin and upload a PNG (or reset), using
  Microsoft's authenticated skin endpoints.
- **Themes** — a small CSS-variable theme system with three built-in themes.
- **Toast notifications** for imports, installs and other actions.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it all fits together.

---

## Quick start (development)

Requires **Node.js 22+** and **npm**.

```bash
npm install
npm run dev
```

> **Windows / PowerShell note:** if PowerShell blocks `npm` with an execution-policy
> error, either use `npm.cmd run dev`, or run once:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
> See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#troubleshooting) for this and other gotchas.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the app with hot reload (electron-vite) |
| `npm run build` | Production build of main, preload and renderer |
| `npm run typecheck` | Type-check the whole project (node + web) |
| `npm run preview` | Preview the production build |

---

## How authentication works

NodriftLauncher ships the **official Minecraft Launcher client ID**
(`00000000402b5328`) and uses the legacy `login.live.com` OAuth flow. This means:

- **No Azure app registration is required** by you or by users.
- It sidesteps the "new Azure apps must be approved for the Minecraft API or get a
  403" limitation, because the official client ID is already approved.

The client ID and flow are isolated in `src/main/auth/config.ts`, so switching to a
registered Azure app later is a one-file change. Tokens are handled entirely in the
main process; the renderer never sees them. Only the long-lived refresh token is
persisted, encrypted with Electron `safeStorage` (Windows DPAPI).

---

## Where your data lives

Everything is stored under Electron's `userData` directory
(`%APPDATA%\nodriftlauncher` on Windows):

```
%APPDATA%\nodriftlauncher\
├── auth.bin                     encrypted refresh token
├── instances\<id>\
│   ├── instance.json            instance metadata
│   └── minecraft\               ISOLATED per instance
│       ├── saves\ config\ mods\ resourcepacks\ ...
└── runtime\                     SHARED across instances
    ├── versions\<id>\           version JAR + JSON
    ├── libraries\               Maven-style library store
    ├── assets\                  asset indexes + objects
    ├── java\<component>\        per-version Java runtimes
    ├── natives\<runtimeKey>\    extracted native libraries
    └── installers\              Forge/NeoForge installer jars
```

---

## Building a Windows installer

The app packages with **electron-builder** into a custom (assisted) NSIS installer.

```bash
npm run dist          # build + produce release/NodriftLauncher-Setup-<version>.exe
npm run dist:dir      # unpacked build only (faster, for testing)
npm run gen-icons     # regenerate build/icon.ico + build/icon.png from assets/logo.png
```

The installer (config in [electron-builder.yml](electron-builder.yml), custom NSIS
steps in [build/installer.nsh](build/installer.nsh)) is per-user (no admin prompt),
lets you choose the install directory, and creates Start-menu + desktop shortcuts.
Output lands in `release/`.

---

## Project status

All v1 spec features plus the polish pass are implemented and verified, and the app
packages into a Windows installer. Possible next steps: code signing, auto-update,
and cross-platform (Linux/macOS) targets.

---

## Tech stack

Electron 43 · TypeScript · React 18 · electron-vite (Vite 7) · electron-builder ·
adm-zip · react-markdown.

External services (all official, verified endpoints — see
[CLAUDE.md](CLAUDE.md#verified-external-endpoints)): Microsoft OAuth / Xbox / XSTS,
Minecraft Services, Mojang piston-meta, Fabric Meta, NeoForge & Forge Maven,
Modrinth API.

## License

MIT. NodriftLauncher is an unofficial project and is not affiliated with Mojang or
Microsoft. Minecraft is a trademark of Mojang Synergies AB.
