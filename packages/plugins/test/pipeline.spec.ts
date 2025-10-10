import { describe, it, expect } from "vitest";
import { GLPipeline } from "../src/Pipeline";

class MockAdapter {
  name = "mock";
  async init() {}
  async loadResource() {
    return { asset: { version: "2.0" } };
  }
  async parseResource(raw: any) {
    return raw;
  }
  async buildScene(parsed: any) {
    return { scene: {} };
  }
  startRenderLoop(ctx: any, onFrame: any) {
    // don't run RAF
  }
  stopRenderLoop() {}
  dispose() {}
}

describe("GLPipeline baseline", () => {
  it("runs pipeline happy path", async () => {
    const adapter = new MockAdapter();
    const pipeline = new GLPipeline(adapter);
    // simple loader plugin
    pipeline.hooks.engineInit.tapPromise("init", async (ctx: any) => {
      await adapter.init(ctx.container);
    });
    pipeline.hooks.resourceLoad.tapPromise("load", async (ctx: any) => {
      ctx.rawAssets = await adapter.loadResource("x", ctx);
      return ctx;
    });
    pipeline.hooks.resourceParse.tapPromise("parse", async (ctx: any) => {
      ctx.parsedGLTF = await adapter.parseResource(ctx.rawAssets, ctx);
      return ctx;
    });
    pipeline.hooks.buildScene.tapPromise("build", async (ctx: any) => {
      await adapter.buildScene(ctx.parsedGLTF, ctx);
      return ctx;
    });

    const container = document.createElement("div");
    const ctx = await pipeline.run(container as any, { id: "1", source: {} } as any);
    expect(ctx).toBeDefined();
  });
});
