// esbuild resolves image imports through its `file` loader (see the `loader`
// map in esbuild.dev.js / esbuild.build.js) and hands back the emitted URL.
// This repo has no tsconfig, so the ambient declaration lives next to the
// assets it covers — without it editors flag `import logo from "./x.jpg"`.
declare module "*.jpg" {
  const url: string;
  export default url;
}
declare module "*.png" {
  const url: string;
  export default url;
}
