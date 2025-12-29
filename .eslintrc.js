module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:prettier/recommended"
  ],
  plugins: ["@typescript-eslint", "react", "react-hooks"],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: "detect"
    }
  },
  rules: {
    "prettier/prettier": "warn",
    // Allow explicit any but warn
    "@typescript-eslint/no-explicit-any": "warn",
    // Prefer type imports when possible
    "@typescript-eslint/consistent-type-imports": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        ignoreRestSiblings: true
      }
    ],
    "@typescript-eslint/ban-ts-comment": "warn",
    "@typescript-eslint/no-unused-expressions": "warn",
    "@typescript-eslint/no-require-imports": "warn",
    // Disable prop-types for TSX files
    "react/prop-types": "off",
    // React 17+ JSX transform doesn't require React in scope
    "react/react-in-jsx-scope": "off",
    // Enforce maximum line length to match Prettier's printWidth and keep diffs readable
    "max-len": [
      "warn",
      {
        code: 120,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
        ignoreTrailingComments: true
      }
    ],
    "no-empty": "warn",
    "prefer-const": "warn"
  },
  env: {
    browser: true,
    node: true,
    es6: true
  },
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      excludedFiles: ["vitest.workspace.ts", "**/*.config.ts", "rollup.config.js", "rollup.config.base.js"],
      parserOptions: {
        project: ["./tsconfig.json", "./packages/*/tsconfig.json", "./apps/tsconfig.app.json"],
        tsconfigRootDir: __dirname
      }
    },
    {
      files: ["**/*.js"],
      rules: {
        "@typescript-eslint/no-var-requires": "off"
      }
    }
  ]
};
