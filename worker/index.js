export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/inquiry") {
      if (request.method !== "POST") {
        return Response.json({ message: "Method not allowed." }, { status: 405, headers: { Allow: "POST" } });
      }

      return Response.json(
        { message: "Email delivery is temporarily unavailable. Please email us directly." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
