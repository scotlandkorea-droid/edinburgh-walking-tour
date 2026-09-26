export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    if (method === "GET" || method === "HEAD") {
      if (url.pathname === "/") {
        const indexUrl = new URL("/index.html", url);
        return env.ASSETS.fetch(new Request(indexUrl, request));
      }

      if (url.pathname.endsWith("/")) {
        const indexUrl = new URL(url);
        indexUrl.pathname = url.pathname + "index.html";
        const response = await env.ASSETS.fetch(new Request(indexUrl, request));
        if (response.status !== 404) return response;
      } else {
        const lastSegment = url.pathname.split("/").pop() || "";
        if (!lastSegment.includes(".")) {
          const indexUrl = new URL(url);
          indexUrl.pathname = url.pathname + "/index.html";
          const response = await env.ASSETS.fetch(new Request(indexUrl, request));
          if (response.status !== 404) {
            const redirectUrl = new URL(url);
            redirectUrl.pathname = url.pathname + "/";
            return Response.redirect(redirectUrl.toString(), 308);
          }
        }
      }
    }

    return env.ASSETS.fetch(request);
  }
};
