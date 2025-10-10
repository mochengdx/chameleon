export type RenderRequest = {
  id: string;
  source: string | object | ArrayBuffer;
  options?: Record<string, any>;
  userData?: any;
};

export interface RenderingContext {
  request: RenderRequest;
  container: HTMLElement;
  adapter: any;
  rawAssets?: any;
  parsedGLTF?: any;
  scene?: any;
  engineHandles?: any;
  customShader?: { code: string; vertex?: string; uniforms?: Record<string, any> } | null;
  metadata: Record<string, any>;
  abortController: AbortController;
  abortSignal: AbortSignal;
  renderState?: { running?: boolean; frameCount?: number; lastError?: any };
  // pipeline reference (optional)
  pipeline?: any;
}
