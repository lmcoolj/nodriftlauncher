# CLAUDE.md

Guidance for AI agents (and humans) working in this repository. Read this before
making changes.

## What this is

An Electron + TypeScript + React Minecraft: Java Edition launcher for Windows. It
does real Microsoft auth and really launches Vanilla, Fabric, Forge and NeoForge.

## Golden rules

1. **Never hallucinate external APIs, endpoints, file formats, or Minecraft/loader
   internals.** Every network format in this app was verified against official
   sources before it was written. If you're extending something that talks to an
   external service, verify the shape first. See
   [Verified external endpoints](#verified-external-endpoints).
2. **Tokens never leave the main process.** Auth, launch credentials and skin
   uploads all happen in `src/main`. The renderer gets a token-free session object.
3. **Type-check and build before declaring done:** `npm run typecheck && npm run build`.
4. On Windows PowerShell, use **`npm.cmd`** (plain `npm` may be blocked by execution
   policy). See [Gotchas](#gotchas-hard-won).

## Commands

```bash
npm run dev         # electron-vite dev (hot reload) — opens the real app window
npm run build       # build main + preload + renderer
npm run typecheck   # tsc for node (main/preload) and web (renderer) projects
npm run dist        # build + package a Windows NSIS installer into release/
npm run gen-icons   # regenerate build/icon.ico + build/icon.png from assets/logo.png
```

There is no automated test suite. Verification is: `typecheck` + `build` pass, then
a human runs `npm run dev` and exercises the change (only a human can launch the
game / sign in — agents can't).

## Process model & layout

Three build targets (electron-vite): **main** (Node), **preload** (context bridge),
**renderer** (React). The renderer only talks to the main process through the typed
bridge in `src/preload/index.ts`, exposed as `window.nodrift`. The renderer's view
of that bridge is declared in `src/renderer/src/global.d.ts` — **keep the two in
sync** when adding IPC.

```
src/main/
  index.ts              app bootstrap, registers all IPC, CSP for packaged builds
  paths.ts              all on-disk path helpers (data root, instances, runtime)
  platform/window.ts    frameless BrowserWindow + native window-control IPC
  auth/                 MS→Xbox→XSTS→Minecraft chain, safeStorage token, profile
  metadata/             version lists: Mojang, Fabric, Forge, NeoForge (dropdowns)
  instances/            instanceStore (CRUD) + importExport (.mrpack/.zip) + instanceFs
                        (per-instance mods enable/disable, packs, file browser, jar meta)
  launch/               the download + launch pipeline (see ARCHITECTURE.md)
  mods/                 Modrinth search/detail + install (with dependency BFS)
  cosmetics/            skin upload/reset via MS skin endpoints
  ipc/                  one register*Ipc() per domain, all called from index.ts
src/preload/index.ts    the ONLY renderer↔main surface (window.nodrift)
src/renderer/src/
  App.tsx, main.tsx     shell; providers: Theme → Notifications → Auth → Instances
                        → Launch → Navigation
  useNavigation.tsx      tab + Instance-Viewer routing; useNotifications.tsx (toasts)
  components/            TitleBar, WindowControls, Modal, Console, SkinFace, icons
  tabs/                  HomeTab, ModsTab, CosmeticsTab, SettingsTab
  instances/             useInstances, useLaunch contexts, InstanceCard, dialogs,
                        InstanceViewer + viewer/{Logs,Mods,Files,Packs}Panel
  mods/                  ModDetail (markdown), InstallModal (instance picker + deps)
  auth/useAuth.tsx       auth context (restore on mount, subscribe to changes)
  theme/                 CSS-variable theme system (tokens, themes, provider)
  global.d.ts            window.nodrift type declarations (mirror of preload)
assets/logo.png          app icon source; build/ holds icon.ico + installer.nsh
```

## Conventions

- **IPC results** use a discriminated union so the renderer never catches raw IPC
  rejections for expected failures:
  `{ ok: true, ... } | { ok: false, error: string }`. Auth uses a richer
  `{ ok: false, error: { message, code } }`.
- **Adding an IPC channel:** implement in `src/main/ipc/<domain>Ipc.ts`, register it
  in `src/main/index.ts`, expose it in `src/preload/index.ts`, and declare it in
  `src/renderer/src/global.d.ts`. All four, or the renderer won't see it.
- **Downloads** go through `src/main/launch/net.ts` `downloadFile()`, which
  SHA-1-verifies and skips already-present files (this is what makes installs
  resumable and the shared runtime deduped). Guard empty URLs (`if (lib.url) ...`) —
  Forge/NeoForge processor-output libraries have no URL.
- **Themes** are token sets in `src/renderer/src/theme/themes.ts`; add one to the
  array and it appears in Settings. Palette rule: blue/purple/white/black/grey, no
  gradients, no rounded corners.

## Verified external endpoints

Do not change these without re-verifying against the source.

| Purpose | Endpoint |
|---|---|
| MS OAuth (auth code) | `login.live.com/oauth20_authorize.srf` / `oauth20_token.srf`, client `00000000402b5328`, redirect `oauth20_desktop.srf`, scope `service::user.auth.xboxlive.com::MBI_SSL` |
| Xbox Live | `POST user.auth.xboxlive.com/user/authenticate` (RpsTicket verbatim; `d=` prefix fallback) |
| XSTS | `POST xsts.auth.xboxlive.com/xsts/authorize`, RelyingParty `rp://api.minecraftservices.com/` |
| MC login | `POST api.minecraftservices.com/authentication/login_with_xbox` |
| MC profile | `GET api.minecraftservices.com/minecraft/profile` |
| Skin change | `POST api.minecraftservices.com/minecraft/profile/skins` (multipart) · `DELETE .../skins/active` |
| Version manifest | `piston-meta.mojang.com/mc/game/version_manifest_v2.json` |
| Java runtime | `launchermeta.mojang.com/v1/products/java-runtime/.../all.json` |
| Assets | `resources.download.minecraft.net/<hash[0:2]>/<hash>` |
| Fabric | `meta.fabricmc.net/v2/versions/{game,loader,loader/<mc>/<ver>/profile/json}` |
| NeoForge | `maven.neoforged.net/.../net/neoforged/neoforge` (versions), `.../neoforge-<v>-installer.jar` |
| Forge | `maven.minecraftforge.net/.../forge/maven-metadata.xml`, `.../forge-<v>-installer.jar` |
| Modrinth | `api.modrinth.com/v2/search`, `/project/{id}`, `/project/{id}/version` (send a descriptive `User-Agent`) |

## Gotchas (hard-won)

These caused real bugs during development. Respect them.

- **Windows PowerShell execution policy** blocks `npm`. Use `npm.cmd`, or set
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.
- **Electron binary**: if `npm install`'s postinstall is skipped, the app fails with
  "Electron uninstall". Fix: `node node_modules/electron/install.js`.
- **Version pinning**: electron-vite 5 caps Vite at 7, so use `vite@^7` and
  `@vitejs/plugin-react@^4` (NOT plugin-react 6, which needs Vite 8).
- **TypeScript 7**: `baseUrl` was removed (use relative paths); CSS side-effect
  imports need an ambient `declare module '*.css'` (see `src/renderer/src/assets.d.ts`).
- **Natives layout**: newest MC versions split natives into subdirs — the version's
  JVM args say `-Djava.library.path=${natives_directory}/java` (plus `/jna`,
  `/lwjgl`, `/netty`). `computeNativesLayout()` reads those args to decide where to
  extract. Old versions use the flat dir.
- **Natives on classpath**: newest versions run LWJGL in classpath-extraction mode
  (`-Dorg.lwjgl.system.SharedLibraryExtractPath`), so native jars must ALSO be on
  the classpath (`buildLaunchArgs` includes them), not just extracted to disk.
- **Library dedupe is launch-classpath-ONLY** (`buildLaunchArgs`), never in
  `resolveLibraries`. Forge's installer legitimately needs two versions of the same
  artifact (e.g. `jopt-simple` 5.0.4 AND 6.0-alpha-3) for different processors;
  deduping downloads would drop one and break install. But at launch, Forge/NeoForge's
  module system rejects duplicate jars, so the classpath is deduped by
  `group:artifact` keeping the loader's (first-listed) version.
- **Forge/NeoForge client jar**: `includeClientJar` is false for these — their
  patched client comes from the version profile's libraries, not the vanilla jar.
- **Import path-traversal**: `.mrpack`/`.zip` contents are untrusted; `importExport`
  uses `safeJoin()` to prevent writing outside the instance dir. Keep it.

## Extending

- **New mod source / metadata provider**: add a module under `metadata/` or `mods/`,
  keep fetch shapes typed, thread through IPC as above.
- **New loader**: model it on `fabricInstaller.ts` (simple, profile merge) or
  `forgeInstaller.ts` (installer + processors). Wire the branch into
  `launchService.ts` and set `includeClientJar` correctly.
- **Packaging**: `npm run dist` (electron-builder → NSIS). Config in
  `electron-builder.yml`, custom installer steps in `build/installer.nsh`, icons from
  `build/icon.ico` (regenerate with `npm run gen-icons`). `assets/logo.png` is copied
  to `resources/logo.png` via `extraResources` for the packaged runtime window icon.
  Still verify the "stays signed in across restart" requirement in the built app.

More detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
