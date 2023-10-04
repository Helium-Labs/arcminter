// import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import nodePolyfills from "rollup-plugin-polyfill-node";
import typescript from 'rollup-plugin-typescript2';
import terser from '@rollup/plugin-terser';

const nodeBuiltIns = ['assert', 'buffer', 'child_process', 'cluster', 'console', 'constants', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'https', 'module', 'net', 'os', 'path', 'process', 'punycode', 'querystring', 'readline', 'repl', 'stream', 'string_decoder', 'sys', 'timers', 'tls', 'tty', 'url', 'util', 'v8', 'vm', 'zlib']

export default [
  // Browser config
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/bundle.mjs",
        format: "es",
        inlineDynamicImports: true,
      },
    ],
    plugins: [
      nodeResolve({
        preferBuiltins: true,
        browser: true,
        modulesOnly: false,
      }),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "dist"
      }),
      nodePolyfills(),
      commonjs(),
      terser({
        maxWorkers: 4
      })
    ],
    external: ["axios", "algosdk", "@json-rpc-tools/utils"],
  },
  // Node config
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/bundle.cjs",
        format: "cjs",
      },
    ],
    external: ["algosdk", "@json-rpc-tools/utils", ...nodeBuiltIns],
    plugins: [
      nodeResolve({
        preferBuiltins: false,
      }),
      typescript({
        tsconfig: "./tsconfigCJS.json",
        declaration: true,
        declarationDir: "dist"
      }),
      commonjs(),
      json(),
      terser({
        maxWorkers: 4
      })
    ],
  },
];
