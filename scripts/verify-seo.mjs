import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const clientRoot = new URL("../dist/client/", import.meta.url);
const html = await readFile(new URL("index.html", clientRoot), "utf8");

assert.match(html, /<html lang="en-BN">/);
assert.match(html, /<title>Web Development &amp; Digital Solutions Brunei \| ByteWave Digital<\/title>/);
assert.match(html, /<link rel="canonical" href="https:\/\/bytewave-digitalbrunei\.com\/">/);
assert.doesNotMatch(html, /noindex/i);
assert.equal((html.match(/<title>/g) || []).length, 1);
assert.equal((html.match(/<meta name="description"/g) || []).length, 1);
assert.equal((html.match(/<link rel="canonical"/g) || []).length, 1);
assert.equal((html.match(/<h1\b/g) || []).length, 1);
assert.match(html, /<h1[^>]*>Web Development &amp; Digital Solutions in Brunei<\/h1>/);

const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1] || "";
assert.ok(description.length >= 150 && description.length <= 160, `Meta description is ${description.length} characters`);

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, "HTML contains duplicate IDs");
for (const target of [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1])) {
  assert.ok(ids.includes(target), `Missing anchor target #${target}`);
}

const jsonLdSource = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
assert.ok(jsonLdSource, "JSON-LD is present");
const jsonLd = JSON.parse(jsonLdSource);
assert.deepEqual(jsonLd["@graph"].map((item) => item["@type"]), ["Organization", "WebSite", "Service"]);
assert.equal(jsonLd["@graph"][0].areaServed.name, "Brunei Darussalam");

const robots = await readFile(new URL("robots.txt", clientRoot), "utf8");
assert.match(robots, /Allow: \/$/m);
assert.match(robots, /Sitemap: https:\/\/bytewave-digitalbrunei\.com\/sitemap\.xml/);

const sitemap = await readFile(new URL("sitemap.xml", clientRoot), "utf8");
assert.equal((sitemap.match(/<url>/g) || []).length, 1);
assert.match(sitemap, /<loc>https:\/\/bytewave-digitalbrunei\.com\/<\/loc>/);
assert.doesNotMatch(sitemap, /#/);

for (const asset of ["assets/preview-desktop.png", "assets/bytewave-logo-transparent.webp", "assets/sidequest-tourism/sidequest-master-overview.png"]) {
  await access(new URL(asset, clientRoot));
}

const { default: worker } = await import("../dist/server/index.js");
const response = await worker.fetch(new Request("https://bytewave.example/"), {
  ASSETS: { fetch: async () => new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } }) },
});
assert.equal(response.status, 200);
assert.match(response.headers.get("content-security-policy") || "", /sha256-uuFuPIe\/UGEKjbsPlRQuxXMTIfmir0I0tLrqjaRtvVg=/);

console.log("Verified SEO metadata, headings, anchors, schema, crawl files, assets, and security headers");
