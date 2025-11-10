/**
 * Namespace representing the GLTF (GL Transmission Format) structure.
 * Contains interfaces for all major components of a GLTF asset.
 * @namespace Ant
 * @see {@link https://github.com/KhronosGroup/glTF?tab=readme-ov-file erview=1#glTF-2--0-specification} for more details.
 */
// declare namespace Ant {
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
}

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
  extensions?: any;
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
// }
