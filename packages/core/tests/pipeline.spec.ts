import { describe, expect, it } from "vitest";
import type { EngineAdapter } from "../src/EngineAdapter";
import { Pipeline } from "../src/Pipeline";
import type { RenderingContext } from "../src/RenderingContext";

class MockAdapter implements Partial<EngineAdapter> {
  name = "mock";
  async initEngine(container: HTMLElement, ctx: RenderingContext): Promise<any> {
    return { engine: {}, scene: {}, camera: {} };
  }
  async loadResource(src: string, ctx: RenderingContext) {
    return { asset: { version: "2.0" } };
  }
  async parseResource(raw: any) {
    return raw;
  }
  async buildScene(parsed: any, ctx: RenderingContext) {
    return { scene: {} };
  }
  startRenderLoop(ctx: any, onFrame: any) {
    // don't run RAF in tests
  }
  dispose() {}
}

describe("Pipeline baseline", () => {
  it("runs pipeline happy path", async () => {
    const adapter = new MockAdapter() as unknown as EngineAdapter;
    const pipeline = new Pipeline(adapter);

    pipeline.hooks.initEngine.tapPromise("initEngine", async (ctx: any) => {
      await adapter.initEngine(ctx.container, ctx);
    });
    pipeline.hooks.resourceLoad.tapPromise("load", async (ctx: any) => {
      ctx.rawAssets = await adapter.loadResource("x", ctx);
      return ctx;
    });
    pipeline.hooks.resourceParse.tapPromise("parse", async (ctx: any) => {
      ctx.parsedGLTF = await adapter.parseResource(ctx.rawAssets);
      return ctx;
    });
    pipeline.hooks.buildScene.tapPromise("build", async (ctx: any) => {
      await adapter.buildScene(ctx.parsedGLTF, ctx);
      return ctx;
    });

    const container = document.createElement("div");
    const ctx = await pipeline.run(container, { id: "1", source: "test.gltf" });
    expect(ctx).toBeDefined();
  });
});
