module.exports = {
  parser: "@typescript-eslint/parser", // Eslint TypeScript Parser
  extends: ["plugin:prettier/recommended"],
  plugins: ["@typescript-eslint"],
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true
    }
  },
  rules: {
    "prettier/prettier": "error"
  },
  env: {
    browser: true,
    node: true
  }
};
