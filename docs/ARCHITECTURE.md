# Architecture

How NodriftLauncher is put together. For day-to-day commands and troubleshooting
see [DEVELOPMENT.md](DEVELOPMENT.md); for agent conventions see the root
[CLAUDE.md](../CLAUDE.md).

## Process model

Electron gives us three JavaScript contexts, built separately by electron-vite:

- **Main** (`src/main`) — Node.js. Owns all privileged work: networking, the
  filesystem, auth tokens, spawning the game, running installer processors.
- **Preload** (`src/preload/index.ts`) — the only bridge. Uses `contextBridge` to
  expose a single typed object, `window.nodrift`, to the renderer. Nothing else
  crosses the boundary.
- **Renderer** (`src/renderer`) — React UI, sandboxed (`contextIsolation: true`,
  `nodeIntegration: false`). It calls `window.nodrift.*` and renders results.

Because the boundary is a hard security line, secrets (Microsoft tokens, the
Minecraft access token) are **only ever held in main**. The renderer receives a
`AuthSession` that contains a username, UUID, skin data URL and cape URL — never a
token.

### IPC pattern

Each domain has a `register<Domain>Ipc()` in `src/main/ipc/`, all invoked from
`src/main/index.ts` on app ready. Handlers return a discriminated result:

```ts
type Result<T> = ({ ok: true } & T) | { ok: false; error: string }
```

Adding a channel touches four files: the handler (`ipc/*.ts`), the registration
(`index.ts`), the bridge (`preload/index.ts`), and the renderer type
(`renderer/src/global.d.ts`).

## Data layout

Root is Electron `userData` (`%APPDATA%\nodriftlauncher`), centralised in
`src/main/paths.ts`. The defining idea (the MultiMC/Prism model) is **isolation +
deduplication**:

- **Per-instance, isolated:** `instances/<id>/minecraft/{saves,config,mods,resourcepacks}`.
- **Shared once, deduped:** `runtime/{versions,libraries,assets,java,natives,installers}`.

An instance's `instance.json` stores a `runtimeKey`
(`vanilla_<mc>` or `<loader>_<mc>_<loaderVersion>`). Instances with the same key
reference the same runtime files — nothing is copied per instance. SHA-1-verified
downloads (`launch/net.ts`) make this automatic: a file already present with the
right hash is never re-downloaded.

## Authentication (`src/main/auth`)

Path "A": ship the official Minecraft Launcher client ID and use `login.live.com`.
No Azure app, no Minecraft-API approval needed. The chain:

1. `loginWindow.ts` opens a controlled window at the real Microsoft login page and
   intercepts the redirect to `oauth20_desktop.srf?code=…`.
2. `msaClient.ts` exchanges the code for MS access + refresh tokens.
3. `xboxAuth.ts` does Xbox Live `authenticate` then XSTS `authorize` (with XErr
   handling for no-Xbox-account, child accounts, region locks).
4. `minecraftAuth.ts` does `login_with_xbox`, then fetches the profile.
5. `authService.ts` orchestrates, caches the live session in memory, persists only
   the refresh token via `tokenStore.ts` (`safeStorage`), and emits `changed` so the
   renderer updates. On startup `restore()` silently re-runs the chain from the
   stored refresh token.

## Launch pipeline (`src/main/launch`)

`launchService.ts` is the orchestrator. For any instance it:

1. **Ensures vanilla** (`vanillaInstaller.ts`): downloads the version JSON, client
   JAR, libraries, assets, and the correct Java runtime (`java.ts`, from Mojang's
   java-runtime manifest). An `.installed` marker enables fast relaunch and offline
   launch.
2. **Ensures Java early** — Forge/NeoForge processors need it before launch.
3. **Applies the loader** (if any):
   - **Fabric** (`fabricInstaller.ts`): fetch the loader profile, download its Maven
     libraries, and `mergeProfile()` its libraries + main class + args over vanilla.
   - **Forge / NeoForge** (`forgeInstaller.ts`): download the installer jar, read
     `install_profile.json` + `version.json`, extract bundled `maven/`, download
     libraries, resolve the `data` map, then **run each processor as a Java
     subprocess** (they patch/remap the client). Merge the resulting `version.json`.
4. **Extracts natives** (`natives.ts`) to the layout the version expects
   (`computeNativesLayout()` reads the JVM args — flat for old versions,
   `${natives_directory}/java` etc. for new ones).
5. **Builds args** (`launcher.ts`): classpath (deduped by `group:artifact`), JVM +
   game args with placeholder substitution and rule evaluation (`rules.ts`), then
   spawns the game and streams stdout/stderr as log events.

`libraries.ts` resolves both modern (`downloads.artifact`) and Maven-style
(`name` + `url`) library entries and marks natives.

### Loader profile model

Fabric/Forge/NeoForge all produce a `version.json` that "inherits from" vanilla —
extra libraries, a main class, extra args. `mergeProfile()` layers the loader's
libraries (first) over vanilla's; dedupe happens at classpath-build time, not here.
See the CLAUDE.md gotchas for why the split matters (the `jopt-simple` two-versions
case and the module-system duplicate-jar rejection).

## Metadata (`src/main/metadata`)

Feeds the create-instance dropdowns from live sources: Mojang version manifest,
Fabric Meta, NeoForge Maven (with the documented version→MC mapping), Forge
`maven-metadata.xml`. Results are cached per session. The loader version is
auto-selected (newest stable) in the UI.

## Mods (`src/main/mods`)

`modrinth.ts` searches and resolves versions via the Modrinth API, filtered to the
active instance's version + loader. `modManager.ts` installs into the instance's
isolated `mods/` folder and tracks Modrinth installs in `.nodrift-mods.json`
(including download URL + hashes, so export can build proper `.mrpack` `files[]`).
Manual `.jar`s are copied in via a file picker or drag-drop.

## Import / Export (`src/main/instances/importExport.ts`)

- **Export `.mrpack`** — real Modrinth format: `modrinth.index.json` with
  `dependencies` + Modrinth mods as downloadable `files[]`; manual mods, config and
  resource packs go into `overrides/`.
- **Export `.zip`** — portable format: `nodrift-instance.json` metadata + mods,
  config, resource packs (no saves).
- **Import** — auto-detects format, creates a new instance from the pack's version +
  loader, downloads files and extracts overrides. All extraction is path-traversal
  guarded (`safeJoin`).

## Cosmetics (`src/main/cosmetics/skinManager.ts`)

Uploads skins to Microsoft's authenticated endpoint (multipart `variant` + `file`)
and resets via `DELETE .../skins/active`, then refreshes the profile so the UI
updates. There is no skin *catalog* API — the catalog is PNGs bundled in
`resources/skins/`, read and served to the UI as data URLs.

## Renderer structure

Providers wrap the app in order: **Theme → Auth → Instances → Launch**. Tabs
(`Home`, `Mods`, `Cosmetics`, plus a gear `Settings`) read those contexts. The
theme system maps token objects to CSS custom properties on `:root`, so restyling is
data, not code.
