# Contributing

Thanks for helping with Nodrift Client. This is a small project; the guidelines are
light but there are a few rules that matter.

## Before you start

- Read [ARCHITECTURE.md](ARCHITECTURE.md) for the big picture and the root
  [CLAUDE.md](../CLAUDE.md) for conventions and the hard-won gotchas.
- Set up per [DEVELOPMENT.md](DEVELOPMENT.md).

## Ground rules

1. **Verify external formats.** Do not invent API endpoints, response shapes, file
   formats, or Minecraft/loader internals. If you touch anything that talks to
   Microsoft, Mojang, Fabric, Forge, NeoForge or Modrinth, confirm the shape against
   the official source first. The verified endpoints are listed in CLAUDE.md.
2. **Keep secrets in the main process.** Never expose tokens to the renderer or widen
   the preload bridge beyond what the UI needs.
3. **Respect the isolation/dedup model.** Per-instance data stays isolated; runtime
   files are shared and content-addressed. Don't copy runtime files per instance.
4. **Path safety.** Anything that extracts an untrusted archive must guard against
   path traversal (`safeJoin`).

## Workflow

1. Branch off `main`.
2. Make the change. If it adds an IPC channel, update all four places (handler,
   registration, preload, renderer types).
3. `npm run typecheck && npm run build` must pass.
4. Manually verify with `npm run dev` — describe what you tested in the PR, since
   there's no automated coverage for launching/auth.
5. Open a PR with a clear description of what changed and why.

## Commit style

- Present-tense, imperative subject lines ("Add NeoForge processor handling").
- Explain non-obvious *why* in the body, especially for loader/launch edge cases.

## Scope notes

- **Windows-first.** Cross-platform PRs are welcome but must keep OS-specific code in
  `src/main/platform/`.
- **UI/theme changes** should stay within the palette (blue/purple/white/black/grey,
  no gradients, no rounded corners) and the CSS-variable token system.
