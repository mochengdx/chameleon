import { describe, expect, it } from "vitest";
import type { EngineAdapter } from "../src/EngineAdapter";
import { Pipeline } from "../src/Pipeline";
import type { RenderingContext } from "../src/RenderingContext";

class MockAdapter implements EngineAdapter {
  public readonly name = "mock";

  public async initEngine(container: HTMLElement, ctx: RenderingContext, _options?: any): Promise<any> {
    // Minimal fake handles; real adapters will populate engineHandles.
    return { engine: {}, scene: {}, camera: {} };
  }

  public async loadResource(_src: string, _ctx: RenderingContext): Promise<any> {
    return { asset: { version: "2.0" } };
  }

  public async parseResource(raw: any, _ctx: RenderingContext): Promise<any> {
    return { entity: raw, gltf: raw };
  }

  public async buildScene(_parsed: any, _ctx: RenderingContext): Promise<void> {
    // no-op
  }

  public startRenderLoop(_ctx: any, _onFrame: (dtMs: number) => void) {
    // no-op (avoid RAF in tests)
  }

  public dispose() {
    // no-op
  }
}

describe("GLPipeline baseline", () => {
  it("runs pipeline happy path", async () => {
    const adapter = new MockAdapter();
    const pipeline = new Pipeline(adapter);
    // simple loader plugin
    pipeline.hooks.initEngine.tapPromise("initEngine", async (ctx: any) => {
      await adapter.initEngine(ctx.container);
    });
    pipeline.hooks.resourceLoad.tapPromise("load", async (ctx: any) => {
      ctx.rawAssets = await adapter.loadResource("x", ctx);
      return ctx;
    });
    pipeline.hooks.resourceParse.tapPromise("parse", async (ctx: any) => {
      const parsed = await adapter.parseResource(ctx.rawAssets, ctx);
      ctx.parsed = parsed;
      return undefined;
    });
    pipeline.hooks.buildScene.tapPromise("build", async (ctx: any) => {
      await adapter.buildScene(ctx.parsed?.entity ?? ctx.parsed, ctx);
      return ctx;
    });

    const container = {} as any as HTMLElement;
    const ctx = await pipeline.run(container as any, { id: "1", source: {} } as any);
    expect(ctx).toBeDefined();
  });
});
