import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";

export default [
  {
    input: "src/index.js",
    output: {
      file: "dist/sdk.esm.js",
      format: "esm",
      sourcemap: true,
    },
    external: ["laravel-echo", "pusher-js"],
  },

  {
    input: "src/index.js",
    output: {
      file: "dist/sdk.min.js",
      format: "iife",
      name: "NotificationService",
      sourcemap: false,
      globals: {
        assert: "undefined",
        buffer: "undefined",
        child_process: "undefined",
        crypto: "undefined",
        events: "undefined",
        fs: "undefined",
        http: "undefined",
        https: "undefined",
        net: "undefined",
        stream: "undefined",
        tls: "undefined",
        url: "undefined",
        util: "undefined",
      },
    },
    external: [
      "assert",
      "buffer",
      "child_process",
      "crypto",
      "events",
      "fs",
      "http",
      "https",
      "net",
      "stream",
      "tls",
      "url",
      "util",
    ],
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      terser(),
    ],
  },
];
