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
assert.match(html, /<link rel="icon" type="image\/png" sizes="512x512" href="\/assets\/bytewave-favicon-512\.png">/);
assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="\/assets\/apple-touch-icon\.png">/);
assert.match(html, /mailto:Aziq@bytewave-digitalbrunei\.com/);
assert.doesNotMatch(html, /Aziq\.bytewavedigital@gmail\.com/i);

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
assert.equal(jsonLd["@graph"][2].hasOfferCatalog.itemListElement.length, 4);
assert.match(html, /id="brunei-solutions"/);
assert.match(html, /Who can build a website for my business in Brunei\?/);
assert.match(html, /Does ByteWave provide web design and UI\/UX design in Brunei\?/);
assert.match(html, /How can AI automation help a local business\?/);
assert.match(html, /<form class="inquiry-form reveal" action="https:\/\/api\.web3forms\.com\/submit" method="post" novalidate>/);
assert.match(html, /name="access_key" value="c6847f68-6d23-4717-bd32-699167d6ecc4"/);
assert.match(html, /name="botcheck"/);

const robots = await readFile(new URL("robots.txt", clientRoot), "utf8");
assert.match(robots, /Allow: \/$/m);
assert.match(robots, /Sitemap: https:\/\/bytewave-digitalbrunei\.com\/sitemap\.xml/);

const sitemap = await readFile(new URL("sitemap.xml", clientRoot), "utf8");
assert.equal((sitemap.match(/<url>/g) || []).length, 1);
assert.match(sitemap, /<loc>https:\/\/bytewave-digitalbrunei\.com\/<\/loc>/);
assert.doesNotMatch(sitemap, /#/);

for (const asset of ["assets/preview-desktop.png", "assets/bytewave-logo-transparent.webp", "assets/bytewave-favicon-512.png", "assets/apple-touch-icon.png", "assets/sidequest-tourism/sidequest-master-overview.png"]) {
  await access(new URL(asset, clientRoot));
}

const { default: worker } = await import("../dist/server/index.js");
const response = await worker.fetch(new Request("https://bytewave.example/"), {
  ASSETS: { fetch: async () => new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } }) },
});
assert.equal(response.status, 200);
assert.match(response.headers.get("content-security-policy") || "", /sha256-OGV9K1beDQ7en0Q70ZMYKvIb9PX9\+RHctf\+LPuo\+PuM=/);
assert.match(response.headers.get("content-security-policy") || "", /connect-src[^;]*https:\/\/api\.web3forms\.com/);
assert.match(response.headers.get("content-security-policy") || "", /form-action[^;]*https:\/\/api\.web3forms\.com/);

console.log("Verified SEO metadata, headings, anchors, schema, crawl files, assets, and security headers");
