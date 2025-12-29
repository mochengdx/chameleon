import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

const DEFAULT_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

/**
 * createBaseConfig
 * - input: entry string
 * - output: single Rollup output object or array (prefer using output objects with `dir` or `file`)
 * - external: external deps
 * - tsconfig: path to package tsconfig
 * - declarationSubdir: optional subdir under rollupOutDir for d.ts (default 'types')
 */
export default function createBaseConfig({
  input,
  output,
  external = [],
  tsconfig = "tsconfig.json",
  extensions = DEFAULT_EXTENSIONS,
  declarationSubdir: _declarationSubdir = "types"
}) {
  return {
    input,
    external,
    plugins: [
      // use rollup-plugin-typescript2 to allow tsconfigOverride

      json(),
      resolve({ extensions, browser: true }),
      commonjs(),
      typescript({
        tsconfig,
        exclude: ["node_modules/**", "dist/**", "apps/**", "tests/**", "**/*.test.ts", "**/*.spec.ts"]
      }),
      babel({
        extensions,
        exclude: "node_modules/**",
        babelHelpers: "bundled"
      }),
      process.env.NODE_ENV === "production" && terser()
    ].filter(Boolean),

    output,
    onwarn(warning, warn) {
      if (warning.code === "CIRCULAR_DEPENDENCY") return;
      warn(warning);
    }
  };
}
