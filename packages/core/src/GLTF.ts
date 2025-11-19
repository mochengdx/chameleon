/**
 * GLTF (GL Transmission Format) type definitions.
 * Contains interfaces for all major components of a GLTF asset.
 * @see {@link https://github.com/KhronosGroup/glTF?tab=readme-ov-file erview=1#glTF-2--0-specification} for more details.
 */
/**
 * Represents the root GLTF asset structure.
 * Contains references to all major components of a GLTF file.
 */
export interface GLTF {
  asset: Asset;
  scenes: Scene[];
  nodes: Node[];
  meshes: Mesh[];
  materials: Material[];
  textures: Texture[];
  images: Image[];
  samplers: Sampler[];
  animations?: Animation[];
  buffers: Buffer[];
  bufferViews: BufferView[];
  accessors: Accessor[];
  extensions: {
    // Optional root-level extension for ANT_materials_shader. When present,
    // it defines one or more named shader entries that materials can reference.
    ANT_materials_shader?: ANTMaterialsShader;
    [ext: string]: any;
  };
}

/**
 * Root object for ANT_materials_shader extension.
 * - version: extension schema version
 * - shaders: array of named shader definitions that can be referenced by materials
 */
export interface ANTMaterialsShader {
  version: string;
  shaders: ANTShader[];
}

/**
 * A single named shader definition.
 * - id: unique identifier for this shader entry (used by materials to reference it)
 * - name: optional human-friendly name for editors or debugging
 * - version: schema/version string for the shader definition
 * - shader: contains the actual shader source locations and optional metadata
 */
export interface ANTShader {
  id: string; // shader ID used for referencing
  name?: string; // optional friendly name for editors/debugging
  version: string; // shader definition schema/version

  shader: {
    // URLs or relative paths to shader source files. These should be fetchable
    // by the loader (e.g. relative to the glTF file location or absolute URLs).
    // 0 is glsl,1 glsl
    vertex: [{ type: 0; value: string | { uri: string } }]; // vertex shader URL or source identifier
    fragment: [{ type: 0; value: string | { uri: string } }]; // fragment shader URL or source identifier

    // Optional preprocessor defines to apply when compiling the shader. Values
    // may be strings or numbers and should be mapped to engine-specific defines.
    defines?: Record<string, string | number>;

    // Uniform declarations and default values to bind when creating the material.
    // Values may be literal numbers/arrays/booleans or typed objects describing
    // textures and typed uniforms.
    // properties?: Record<string, ANTUniform>;

    // Optional pipeline hints to guide material creation (engine-specific).
    pipeline?: {
      doubleSided?: boolean;
      alphaMode?: "OPAQUE" | "MASK" | "BLEND";
      depthTest?: boolean;
      depthWrite?: boolean;
      blending?: boolean;
      side?: number; // engine-specific side constant (e.g. Three.js FrontSide/BackSide/DoubleSide)
    };

    // Reserved for future adapter-specific extensions.
    extensions?: Record<string, any>;
  };
}

/**
 * A uniform definition that can be one of:
 * - primitive number
 * - array of numbers
 * - boolean
 * - typed object describing the uniform type and its value (including textures)
 */
export type ANTUniform =
  | number
  | number[]
  | boolean
  | {
      type: "float" | "vec2" | "vec3" | "vec4" | "mat3" | "mat4" | "int" | "ivec2" | "ivec3" | "ivec4" | "texture";
      value: any;
    };

/**
 * Metadata about the GLTF asset.
 */
export interface Asset {
  version: string;
  generator?: string;
  copyright?: string;
  extras?: any;
}

/**
 * Represents a scene in the GLTF asset.
 * Contains a list of node indices.
 */
export interface Scene {
  name?: string;
  nodes: number[];
}

/**
 * Represents a node in the scene graph.
 * Can reference children, transformations, mesh, camera, and skin.
 */
export interface Node {
  name?: string;
  children?: number[];
  matrix?: number[];
  rotation?: number[];
  scale?: number[];
  translation?: number[];
  mesh?: number;
  camera?: number;
  skin?: number;
  weights?: number[];
}

/**
 * Represents a mesh, which is a collection of primitives.
 */
export interface Mesh {
  name?: string;
  primitives: Primitive[];
  weights?: number[];
}

/**
 * Represents a geometric primitive in a mesh.
 * Contains attribute mappings and optional indices, material, mode, and morph targets.
 */
export interface Primitive {
  attributes: { [key: string]: number };
  indices?: number;
  material?: number;
  mode?: number;
  targets?: Target[];
}

/**
 * Represents a morph target for a primitive.
 */
export interface Target {
  [key: string]: number;
}

/**
 * Represents a material used for rendering meshes.
 */
export interface Material {
  name?: string;
  pbrMetallicRoughness?: PBRMetallicRoughness;
  extensions?: {
    ANT_materials_shader?: {
      shader: number; // reference to shader definition by index
      properties?: Record<string, any>;
      // fragmentUniforms?: Record<string, any>;
      description?: string;
    };
    [ext: string]: any;
  };
  extras?: any;
}

/**
 * Describes the PBR metallic-roughness material properties.
 */
export interface PBRMetallicRoughness {
  baseColorFactor?: number[];
  baseColorTexture?: TextureInfo;
  metallicFactor?: number;
  roughnessFactor?: number;
  metallicRoughnessTexture?: TextureInfo;
}

/**
 * Contains information about a texture reference.
 */
export interface TextureInfo {
  index: number;
  texCoord?: number;
  extensions?: any;
  extras?: any;
}

/**
 * Represents a texture, referencing an image and optional sampler.
 */
export interface Texture {
  name?: string;
  source: number;
  sampler?: number;
  extensions?: any;
  extras?: any;
}

/**
 * Represents an image used by textures.
 */
export interface Image {
  uri?: string;
  mimeType?: string;
  bufferView?: number;
  name?: string;
}

/**
 * Represents a sampler for textures, defining filtering and wrapping modes.
 */
export interface Sampler {
  magFilter?: number;
  minFilter?: number;
  wrapS?: number;
  wrapT?: number;
}

/**
 * Represents a binary buffer containing data for the asset.
 */
export interface Buffer {
  uri?: string;
  byteLength: number;
  name?: string;
}

/**
 * Represents a view into a buffer, describing a subset of the buffer's data.
 */
export interface BufferView {
  buffer: number;
  byteOffset?: number;
  byteLength: number;
  target?: number;
  name?: string;
  byteStride?: number;
}

/**
 * Represents an accessor, describing how to access data from buffer views.
 */
export interface Accessor {
  bufferView: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: string;
  normalized?: boolean;
  min?: number[];
  max?: number[];
  name?: string;
  sparse?: SparseAccessor;
}

/**
 * Represents a sparse accessor for compressed or partial data.
 */
export interface SparseAccessor {
  count: number;
  indices: SparseIndices;
  values: SparseValues;
}

/**
 * Represents indices for a sparse accessor.
 */
export interface SparseIndices {
  bufferView: number;
  byteOffset?: number;
  componentType: number;
}

/**
 * Represents values for a sparse accessor.
 */
export interface SparseValues {
  bufferView: number;
  byteOffset?: number;
}

/**
 * Represents an animation, containing channels and samplers.
 */
export interface Animation {
  name?: string;
  channels: AnimationChannel[];
  samplers: AnimationSampler[];
}

/**
 * Represents an animation channel, mapping a sampler to a target.
 */
export interface AnimationChannel {
  sampler: number;
  target: AnimationTarget;
}

/**
 * Represents the target of an animation channel.
 */
export interface AnimationTarget {
  node: number;
  path: string;
}

/**
 * Represents an animation sampler, describing input/output data and interpolation.
 */
export interface AnimationSampler {
  input: number;
  output: number;
  interpolation?: string;
}
