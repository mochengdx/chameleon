import path from "path";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import { terser } from "rollup-plugin-terser";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
// import dts from "rollup-plugin-dts";
// import pkg from "./package.json";

const extensions = [".ts", ".tsx", ".js", ".jsx"];

const isProduction = process.env.NODE_ENV === "production";

const external = [
  "react",
  "react-dom",
  "three",
  "galacean",
  "@babel/core",
  "@rollup/plugin-node-resolve"
  // Add any other external dependencies here
];

const plugins = [
  resolve({ extensions }), // Resolve modules
  commonjs(), // Convert CommonJS to ES6 modules
  babel({
    extensions,
    exclude: "node_modules/**",
    babelHelpers: "bundled"
  }),
  json(), // Handle JSON imports
  typescript({
     tsconfig: path.resolve(__dirname, "packages/core/tsconfig.json"),
    exclude: [
      "node_modules/**",
      "dist/**",
      "examples/**",
      "tests/**",
      "**/*.test.ts",
      "**/*.spec.ts",
      /^@chameleon\/.+/,
    ]
  }), // Handle TypeScript files
  isProduction && terser() // Minify in production
];

export default [
  // Main build for ESM
  {
    input: path.resolve(__dirname, "packages/core/src/index.ts"),
    output: [
      {
        file: path.resolve(__dirname, "packages/core/dist/index.esm.js"),
        format: "esm",
        sourcemap: true
      }
    ],
    external,
    plugins
  }
  // Main build for CJS
  // {
  //   input: path.resolve(__dirname, 'packages/core/src/index.ts'),
  //   output: [
  //     {
  //       file: path.resolve(__dirname, 'dist/core/index.cjs.js'),
  //       format: 'cjs',
  //       sourcemap: true,
  //     },
  //   ],
  //   external,
  //   plugins,
  // },
  // // TypeScript declaration files for package
  // {
  //   input: path.resolve(__dirname, 'packages/core/src/index.ts'),
  //   output: [
  //     {
  //       file: path.resolve(__dirname, 'dist/core/index.d.ts'),
  //       format: 'es',
  //     },
  //   ],
  //   plugins: [dts()],
  // },
  // // Repeat the above for other packages (e.g., @glpipeline/interactions)
  // // Interactions package
  // {
  //   input: path.resolve(__dirname, 'packages/interactions/src/index.ts'),
  //   output: [
  //     {
  //       file: path.resolve(__dirname, 'dist/interactions/index.esm.js'),
  //       format: 'esm',
  //       sourcemap: true,
  //     },
  //   ],
  //   external,
  //   plugins,
  // },
  // {
  //   input: path.resolve(__dirname, 'packages/interactions/src/index.ts'),
  //   output: [
  //     {
  //       file: path.resolve(__dirname, 'dist/interactions/index.cjs.js'),
  //       format: 'cjs',
  //       sourcemap: true,
  //     },
  //   ],
  //   external,
  //   plugins,
  // },
  // {
  //   input: path.resolve(__dirname, 'packages/interactions/src/index.ts'),
  //   output: [
  //     {
  //       file: path.resolve(__dirname, 'dist/interactions/index.d.ts'),
  //       format: 'es',
  //     },
  //   ],
  //   plugins: [dts()],
  // },
  // // Devtools package
  // {
  //   input: path.resolve(__dirname, 'packages/devtools/src/index.tsx'),
  //   output: [
  //     {
  //       file: path.resolve(__dirname, 'dist/devtools/index.esm.js'),
  //       format: 'esm',
  //       sourcemap: true,
  //     },
  //   ],
  //   external,
  //   plugins,
  // },
  // {
  //   input: path.resolve(__dirname, 'packages/devtools/src/index.tsx'),
  //   output: [
  //     {
  //       file: path.resolve(__dirname, 'dist/devtools/index.cjs.js'),
  //       format: 'cjs',
  //       sourcemap: true,
  //     },
  //   ],
  //   external,
  //   plugins,
  // },
  // {
  //   input: path.resolve(__dirname, 'packages/devtools/src/index.tsx'),
  //   output: [
  //     {
  //       file: path.resolve(__dirname, 'dist/devtools/index.d.ts'),
  //       format: 'es',
  //     },
  //   ],
  //   plugins: [dts()],
  // },
];
