/**
 * An object listing the supported adapter names for the application.
 *
 * - `three`: Represents the Three.js adapter.
 * - `galacean`: Represents the Galacean adapter.
 */
export const SUPPORTED_ADAPTERS = {
  three: "three",
  galacean: "galacean"
} as const;

export type SupportedAdapterName = (typeof SUPPORTED_ADAPTERS)[keyof typeof SUPPORTED_ADAPTERS];
