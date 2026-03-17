import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
// Keep minimal - most deps should be external to avoid require issues
const allowlist = [];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  let externals = allDeps;

  // Add Node.js built-ins to externals
  const nodeBuiltins = ['path', 'fs', 'os', 'url', 'crypto', 'stream', 'util', 'events', 'buffer', 'http', 'https', 'net', 'tls', 'zlib', 'querystring', 'string_decoder', 'assert', 'sys', 'punycode', 'module', 'child_process', 'cluster', 'dgram', 'dns', 'domain', 'readline', 'repl'];
  externals = [...externals, ...nodeBuiltins];

  console.log('Externals count:', externals.length);

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.js",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
