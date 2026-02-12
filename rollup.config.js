import path from "path";
import fs from "fs";
import rollupBase from "./rollup.config.base.js";

const extensions = [".ts", ".tsx", ".js", ".jsx"];

const external = [
  "react",
  "react-dom",
  "three",
  "@galacean/engine",
  "@galacean/engine-toolkit",
  "tapable",
  "lodash-es"
];

const dontCompiles = [
  "docs",
  "devtools"
  // Add any packages here that should not be compiled by Rollup
];

const pkgsRoot = path.join(__dirname, "packages");
const pkgs = fs
  .readdirSync(pkgsRoot)
  .filter((dir) => !dontCompiles.includes(dir))
  .map((dir) => path.join(pkgsRoot, dir))
  .filter((dir) => fs.statSync(dir).isDirectory())
  .map((location) => {
    return {
      location: location,
      pkgJson: require(path.resolve(location, "package.json"))
    };
  });

function makeRollupConfigForPkg(pkg) {
  return rollupBase({
    input: path.resolve(pkg.location, "src/index.ts"),
    output: [
      {
        // dir:  path.resolve(pkg.location, "dist"),
        file: path.resolve(pkg.location, "dist/index.esm.js"),
        format: "esm",
        sourcemap: true
      },
      {
        //  dir:  path.resolve(pkg.location, "dist"),
        file: path.resolve(pkg.location, "dist/index.cjs.js"),
        format: "cjs",
        sourcemap: true
      }
    ],
    tsconfig: path.resolve(pkg.location, "tsconfig.json"),
    external,
    extensions
    // declarationDir: path.resolve(pkg.location, "types")
  });
}

if (process.env.NODE_ENV !== "production") {
  console.log("Building packages:", pkgs.map((p) => p.pkgJson.name).join(", "));
}

export default pkgs.map((pkg) => makeRollupConfigForPkg(pkg));
