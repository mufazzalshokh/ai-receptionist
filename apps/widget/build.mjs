import * as esbuild from "esbuild";
import { createHash } from "crypto";
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes("--watch");

const distDir = resolve(__dirname, "dist");
const webPublicDir = resolve(__dirname, "../web/public");

const buildOptions = {
  entryPoints: ["src/widget.ts"],
  bundle: true,
  minify: !isWatch,
  outfile: "dist/widget.js",
  format: "iife",
  target: ["es2020"],
  define: {
    "process.env.NODE_ENV": isWatch ? '"development"' : '"production"',
  },
};

function copyToWebPublic() {
  const src = resolve(distDir, "widget.js");
  mkdirSync(webPublicDir, { recursive: true });

  // Copy stable-name version
  copyFileSync(src, resolve(webPublicDir, "widget.js"));

  // Generate content-hashed version
  const content = readFileSync(src);
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 8);
  const hashedName = `widget.${hash}.js`;
  copyFileSync(src, resolve(webPublicDir, hashedName));

  // Write manifest
  writeFileSync(
    resolve(webPublicDir, "widget-manifest.json"),
    JSON.stringify({ version: "0.1.0", hash, file: hashedName }, null, 2)
  );

  console.log(`Copied to web/public: widget.js + ${hashedName}`);
}

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(buildOptions);
  copyToWebPublic();
  console.log("Widget built successfully");
}
