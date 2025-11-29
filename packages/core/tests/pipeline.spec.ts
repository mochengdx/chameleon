import { describe, it, expect } from "vitest";
import { Pipeline } from "../src/Pipeline";
import { EngineAdapter } from "../src/EngineAdapter";
import { RenderingContext } from "../src/RenderingContext";

class MockAdapter implements EngineAdapter {
  createTextureFromElement(el: HTMLVideoElement | HTMLImageElement) {
    throw new Error("Method not implemented.");
  }
  updateVideoTexture?(el: HTMLVideoElement): void {
    throw new Error("Method not implemented.");
  }
  // initEngine: ((canvas: HTMLCanvasElement, options?: any) => Promise<any>) | undefined;
  // loadTextureFromURL?: ((url: string, opts?: any) => Promise<any>) | undefined;
  // createTextureFromElement?: ((el: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) => any) | undefined;
  // createScene?: (() => any) | undefined;
  // createMeshFromParsedNode?: ((parsedNode: ParsedNode, ctx: RenderingContext) => any) | undefined;
  // createMaterialFromParsed?: ((parsedMaterial: ParsedMaterial, ctx: RenderingContext) => any) | undefined;
  // requestFrame?: ((ctx: RenderingContext) => void) | undefined;
  // setMeshMaterial?: ((mesh: any, material: any) => void) | undefined;
  name = "mock";
  async initEngine(canvas: HTMLCanvasElement, options?: any): Promise<any> {
    // mock implementation
    return;
  }
  async loadResource(src: string, ctx: RenderingContext) {
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
      ctx.parsedGLTF = await adapter.parseResource(ctx.rawAssets);
      return ctx;
    });
    pipeline.hooks.buildScene.tapPromise("build", async (ctx: any) => {
      await adapter.buildScene(ctx.parsedGLTF);
      return ctx;
    });

    const container = document.createElement("div");
    const ctx = await pipeline.run(container as any, { id: "1", source: {} } as any);
    expect(ctx).toBeDefined();
  });
});
