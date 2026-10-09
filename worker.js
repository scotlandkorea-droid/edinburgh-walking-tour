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

      if (
        url.pathname === "/travel/st-andrews.html" ||
        url.pathname === "/travel/st-andrews" ||
        url.pathname === "/travel/st-andrews/"
      ) {
        const redirectUrl = new URL(url);
        redirectUrl.pathname = "/st-andrews/";
        redirectUrl.hash = "";
        return Response.redirect(redirectUrl.toString(), 301);
      }

      if (url.pathname === "/edinburgh/places/adam-smith-grave.html") {
        const redirectUrl = new URL(url);
        redirectUrl.pathname = "/places/canongate-adam-smith.html";
        redirectUrl.hash = "";
        return Response.redirect(redirectUrl.toString(), 301);
      }

      const legacyRedirects = {
        "/edinburgh/places/city-chambers.html": "/places/royal-mile-city-chambers.html",
        "/edinburgh/places/mercat-cross.html": "/places/royal-mile-mercat-cross.html",
        "/places/canongate-overview.html": "/places/canongate.html",
        "/places/royal-mile-overview.html": "/places/royal-mile.html",
        "/places/canongate-horatius-bonar.html": "/places/canongate-kirkyard-stories.html",
        "/places/canongate-scrooge.html": "/places/canongate-kirkyard-stories.html",
        "/places/canongate-holyrood-end.html": "/places/canongate.html",
        "/scotland/places/melrose-abbey.html": "/scotland/places/melrose.html",
        "/assets/city-chambers-courtyard-18363.png": "/assets/city-chambers-courtyard-18363.jpg",
        "/assets/city-chambers-front-18362.png": "/assets/city-chambers-front-18362.jpg",
        "/assets/new-college/john-knox-statue-final.png": "/assets/new-college/john-knox-statue-final.jpg",
        "/assets/new-college/new-college-courtyard.png": "/assets/new-college/new-college-courtyard.jpg"
      };
      if (legacyRedirects[url.pathname]) {
        const redirectUrl = new URL(url);
        redirectUrl.pathname = legacyRedirects[url.pathname];
        redirectUrl.hash = "";
        return Response.redirect(redirectUrl.toString(), 301);
      }

      if (
        url.pathname === "/scotland" ||
        url.pathname === "/scotland/" ||
        url.pathname === "/scotland/index.html"
      ) {
        const redirectUrl = new URL(url);
        redirectUrl.pathname = "/edinburgh/places.html";
        redirectUrl.hash = "scotland";
        return Response.redirect(redirectUrl.toString(), 301);
      }
    }

    const response = await env.ASSETS.fetch(request);

    // Shared UI assets change frequently while the site is being refined.
    // Keep browser caches from pinning an older CSS/navigation system behind
    // a page that still carries an earlier ?v= query string.
    const revalidateAssets = new Set([
      "/assets/site.css",
      "/assets/site-header.js",
      "/assets/navigation-system.js",
      "/assets/navigation-data.js",
      "/assets/tour-course-data.js",
      "/assets/search-data.js",
      "/assets/tour-map.js"
    ]);
    if (revalidateAssets.has(url.pathname)) {
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "public, max-age=0, must-revalidate");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    return response;
  }
};
