# Chameleon apps demo (monorepo)

This repository is a template showing a Tapable-based GL pipeline with:

- plugin-driven lifecycle (engineInit/resourceLoad/resourceParse/buildScene/renderLoop/postProcess/dispose)
- adapter layer (Three/Galacean)
- plugins: GLTF loader, Validator, CustomShader, VideoTexture, Business plugin
- DevTools (React + Tailwind) showing timeline, context and plugins
- monorepo structure (pnpm workspaces)
- unit test example (Vitest)

## Quick start

1. Install pnpm (if not already):

```bash
npm i -g pnpm
```

2. Install deps at repo root (pnpm will install workspace packages):

```bash
pnpm install
```

3. Start apps demo:

```bash
pnpm run dev:apps
```

4. Start DevTools (separately, optional):

```bash
pnpm run dev:devtools
```

Open the Vite URL printed in terminal (typically `http://localhost:5173`).

The apps demo exposes dev artifacts to `window` (basic integration):

window.**GLPIPE_CTX** → current RenderingContext

window.**GLPIPE_PLUGINS** → registered plugin meta

window.**GLPIPE_LOGGER** → PipelineLogger (DevTools can attach by reading)

## Notes

To enable Galacean adapter, install @galacean/engine in workspace:

```bash
pnpm -w add @galacean/engine
```

DevTools is a lightweight React app to inspect pipeline execution timeline and context.

This template is ready to be refactored into multiple npm packages; build scripts (tsc) exist in each package.

## Testing

Run tests:

```bash
pnpm run test
```

Next steps (suggested)

Implement more robust glTF parsing in plugins (use three GLTFLoader integration)

Add types & stricter plugin manifest validation

Add CLI to scaffold plugins and run pipeline presets

Add CI (GitHub Actions) for testing & build

```

```
