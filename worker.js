export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    if (method === "GET" || method === "HEAD") {
      if (url.pathname === "/") {
        const indexUrl = new URL("/index.html", url);
        return env.ASSETS.fetch(new Request(indexUrl, request));
      }

      if (url.pathname === "/st-andrews") {
        const redirectUrl = new URL(url);
        redirectUrl.pathname = "/st-andrews/";
        return Response.redirect(redirectUrl.toString(), 308);
      }

      if (url.pathname === "/st-andrews/") {
        const indexUrl = new URL("/st-andrews/index.html", url);
        return env.ASSETS.fetch(new Request(indexUrl, request));
      }
    }

    return env.ASSETS.fetch(request);
  }
};
