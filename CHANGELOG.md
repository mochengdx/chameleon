# CHANGELOG

## [1.0.1] - 2026-02-12

### 🐛 Bug Fixes

#### Root Configuration (`package.json`)
- **Fix typo in `dev:devtools` script**: `p,ckages/devtools` → `packages/devtools`。脚本中包名拼写错误导致 devtools 无法通过 `pnpm dev:devtools` 启动。
- **Fix malformed `author` field**: `"Daoxing.Huang <"` → `"Daoxing.Huang"`。未闭合的 `<` 符号导致 npm metadata 解析异常。
- **Fix inconsistent JSON indentation**: `@typescript-eslint/*`、`eslint`、`react`、`zustand` 等依赖缩进不一致（2 空格 vs 无缩进），统一为 4 空格对齐，防止合并冲突和 lint 误报。

#### `prettier.config.js`
- **Fix syntax errors**: `proseWrap: never` 和 `trailingComma: none` 缺少引号包裹，在 strict mode 下会导致 `ReferenceError: never is not defined`，修正为字符串值 `"never"` / `"none"`。
- **Remove misleading inline comments**: 删除 `// Use single quotes`（实际 `singleQuote: false`）和 `// Number of spaces per indentation level` 等位置不当的注释。

#### `packages/core/package.json`
- **Fix swapped `main`/`module` fields**: `main` 指向了 ESM 文件而 `module` 指向了 CJS 文件，导致 Node.js `require()` 加载 ESM 代码失败。修正 `main` → CJS，`module` → ESM。

#### `packages/core/src/Pipeline.ts`
- **Remove debug `console.log`**: `runStages` 方法中残留 `console.log("run stage:", name)` 调试语句，在生产环境每帧输出日志造成性能下降和日志污染。
- **Fix undefined type `AnyStageHook`**: `_removeTapsFromHook` 引用了不存在的 `AnyStageHook` 类型，改为 `Hook | { taps?: any[] }` 修复编译错误。
- **Remove duplicate `postProcess` call in `run()`**: `postProcess` 已在 `runStages` 中执行一次，`run()` 末尾又手动调用 `await this.hooks.postProcess.promise(ctx)` 导致重复执行。
- **Clean up empty try/catch blocks**: `_removeTapsFromHook` 中被注释掉的缓存清理代码和空的 `try/catch` 增加了代码噪音，予以删除。

#### `packages/core/src/GLTF.ts`
- **Fix namespace name**: `declare namespace Ant` → `declare namespace GLTF`。命名空间名称与 GLTF 规范不匹配，`Ant` 是内部命名泄漏。
- **Fix broken JSDoc `@see` link**: URL 包含乱码 `?tab=readme-ov-file erview=1#glTF-2--0-specification`，修正为规范链接。

#### `packages/core/tests/pipeline.spec.ts`
- **Fix reference to non-existent hook**: `pipeline.hooks.engineInit` → `pipeline.hooks.initEngine`。`engineInit` hook 不存在于 `StageHooks` 类型中，导致测试编译失败。
- **Fix MockAdapter**: 删除了不属于 `EngineAdapter` 接口的无关方法（`createTextureFromElement`、`updateVideoTexture`），修复类型匹配。
- **Remove commented-out dead code**: 大量注释掉的旧接口定义增加理解成本。

#### `packages/core/tests/utils.spec.ts`
- **Replace entirely commented-out file**: 整个文件被注释掉，没有任何有效测试。替换为有效的 placeholder 测试以保证测试套件完整。

#### `packages/plugins/src/utils/meta.ts`
- **Fix invalid type reference**: `typeof RenderingContext.prototype.metadata` 无法在 interface 上使用（`RenderingContext` 是接口不是类）。改为 `NonNullable<RenderingContext["metadata"]>`。
- **Add missing import**: `RenderingContext` 类型缺少显式 import。

#### `packages/plugins/src/VideoTexturePlugin.ts`
- **Fix `implements IPlugin` missing**: `VideoTexturePlugin` 类未实现 `IPlugin` 接口，添加类型标注。
- **Fix unsafe `ctx.metadata` access**: `ctx.metadata.videoElements` 在 `ctx.metadata` 可能为 `undefined` 时直接访问会抛出 `TypeError`。增加空值保护 `ctx.metadata = ctx.metadata || {}`。
- **Replace `any` types with proper types**: `pipeline: any` → `pipeline: Pipeline`，`ctx: any` → `ctx: RenderingContext`，提升类型安全。

#### `examples/src/plugins/EnvironmentSkyboxPlugin.ts`
- **Fix ReferenceError in `unapply`**: 方法体中引用了未定义的 `ctx`、`typeScene` 变量，运行时必定报错。简化为仅调用 `pipeline.uninstall()`。

#### `examples/src/components/ReplaceSceneCard.tsx`
- **Fix duplicate plugin registration on every replace**: `handleReplace` 每次调用都 `new EnvironmentSkyboxPlugin()` 并 `.use()`，导致同名 hook 被重复注册，每次替换模型后 buildScene 中的环境贴图设置会执行 N 次。删除此处的重复注册。
- **Fix incorrect empty array type**: `const plugins: [] = [new EnvironmentSkyboxPlugin()]` 中 `[]` 类型（空元组）不匹配实际内容，TypeScript 应报错。
- **Remove empty `useEffect`**: `useEffect(() => {}, [])` 无任何作用。
- **Remove debug `console.log`**: 组件每次 render 都输出日志。

#### `examples/src/components/SceneCard.tsx`
- **Add missing `SceneCardProps` type definition**: 组件 props 类型未定义，TypeScript strict mode 下会报错。

---

### 🔧 Code Quality & Engineering

#### `pnpm-workspace.yaml`
- **Remove non-existent workspace paths**: `libs/*`、`components/*`、`projects/*` 三个路径在项目中不存在，会在 `pnpm install` 时产生警告信息。

#### `rollup.config.js`
- **Remove 30+ lines of commented-out code**: 旧的单包打包配置被注释但保留在文件中，降低可读性。
- **Fix external dependencies list**: `"galacean"` 应为 `"@galacean/engine"`（npm 包名不同）；`"@babel/core"` 和 `"@rollup/plugin-node-resolve"` 是构建工具而非运行时依赖，不应列为 external。添加 `"tapable"` 和 `"lodash-es"` 作为 external 以避免打包进 bundle。
- **Remove dead comments**: 删除 `// const fs = require("fs")`、`// const isProduction = ...` 等历史遗留注释。

#### `rollup.config.base.js`
- **Fix inconsistent indentation**: plugins 数组和 typescript 配置项的缩进混乱（3空格、7空格混用），统一为 6 空格（与文件上下文一致）。
- **Remove obsolete comment**: `// use rollup-plugin-typescript2 to allow tsconfigOverride` 残留注释与当前使用的 `@rollup/plugin-typescript` 不匹配。

#### `packages/adapters/src/constants.ts`
- **Add `as const` assertion**: `SUPPORTED_ADAPTERS` 对象添加 `as const`，使值成为字面量类型，支持类型推断和类型安全。
- **Export `SupportedAdapterName` type**: 新增导出类型别名，方便下游使用。

#### `packages/plugins/src/index.ts`
- **Export missing modules**: `VideoTexturePlugin` 和 `GalaceanStaticTexturePlugin` 存在于源码中但未在 barrel 文件中导出，外部无法引入。

#### `packages/plugins/src/galaceanPlugins/GalaceanInteractionPlugin.ts`
- **Remove duplicated `computeModelBoundingSphere`**: 与 `galaceanUtils.ts` 中的同名函数完全一致（约 40 行重复代码），改为 import 共享版本。消除维护性风险（修改一处需同步两处）。

#### `packages/utils/package.json`
- **Move engine deps to `peerDependencies`**: `@galacean/engine` 和 `three` 是宿主项目应提供的 peer 依赖，作为 `dependencies` 会导致打包体积膨胀且版本冲突。

#### `packages/devtools/src/usePipelineDevTools.ts`
- **Fix zustand import**: zustand v4+ 使用命名导出 `{ create }` 而非默认导出 `create`，修正以兼容新版本。

#### `packages/devtools/src/PipelineTimeline.tsx`
- **Fix unused `records` prop**: 组件接受 `records` prop 但实际始终从 store 读取，导致 prop 功能失效。修改为 prop 优先、store 兜底。

#### `packages/core/src/index.ts`
- **Export `StageHooks` type**: 下游 plugin 开发者需要引用 `StageHooks` 类型来实现类型安全的 hook 注册。

#### General
- **Add `.editorconfig`**: 新增编辑器配置文件统一团队缩进风格（2空格）、行尾符（LF）和尾行换行，防止跨平台 diff 噪音。
- **Remove unused imports**: `SceneCard.tsx` 中 `useCallback` 未使用，`ReplaceSceneCard.tsx` 中 `useEffect` 未使用。
