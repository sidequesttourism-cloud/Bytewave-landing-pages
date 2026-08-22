import { cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const client = path.join(dist, "client");

rmSync(dist, { recursive: true, force: true });
mkdirSync(client, { recursive: true });

for (const item of ["index.html", "robots.txt", "sitemap.xml", "assets", "css", "js"]) {
  cpSync(path.join(root, item), path.join(client, item), { recursive: true });
}

mkdirSync(path.join(dist, "server"), { recursive: true });
cpSync(path.join(root, "worker", "index.js"), path.join(dist, "server", "index.js"));

mkdirSync(path.join(dist, ".openai"), { recursive: true });
cpSync(path.join(root, ".openai", "hosting.json"), path.join(dist, ".openai", "hosting.json"));

console.log("ByteWave public build prepared.");
