import log from "../service/loggingService";

export type Layer = {
  route?: any;
  name?: string;
  handle?: any;
  regexp?: any;
  keys?: Array<{ name: string }>;
};

export function methodsOf(route: any): string[] {
  return Object.keys(route.methods || {})
    .map((m) => m.toUpperCase())
    .sort();
}

function mountPathFromLayer(layer: Layer): string {
  if (layer.regexp && layer.regexp.fast_slash) return "";
  if (!layer.regexp) return "";
  const src = layer.regexp.toString();
  const m =
    src.match(/^\/\^\\\/(.+?)\\\/\?\(\?=\\\/\|\$\)\/i?$/) ||
    src.match(/^\/\^\\\/(.+?)\\\/\?\$\/i?$/) ||
    src.match(/^\/\^\\\/(.+?)\\\/\?\//);
  if (m && m[1]) return "/" + m[1].replace(/\\\//g, "/");
  return "";
}

export function listEndpoints(
  router: any,
  prefix = ""
): Array<{ method: string; path: string }> {
  const out: Array<{ method: string; path: string }> = [];
  const stack: Layer[] = (router.stack || []) as any[];
  for (const layer of stack) {
    if ((layer as any).route) {
      const route = (layer as any).route;
      const fullPath = (prefix + route.path).replace(/\/{2,}/g, "/");
      for (const m of methodsOf(route)) {
        out.push({ method: m, path: fullPath });
      }
    } else if (layer.name === "router" && layer.handle && layer.handle.stack) {
      const mount = mountPathFromLayer(layer);
      const newPrefix = (prefix + mount).replace(/\/{2,}/g, "/");
      out.push(...listEndpoints(layer.handle, newPrefix));
    }
  }
  return out;
}

export function printRoutes(app: any) {
  if (!app._router?.stack) {
    log.warn("[ROUTES] No routes mounted yet.");
    return;
  }
  const endpoints = listEndpoints(app._router);
  if (endpoints.length === 0) {
    log.info("[ROUTES] No endpoints found.");
    return;
  }
  const lines = endpoints
    .sort(
      (a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method)
    )
    .map((e) => `${e.method.padEnd(6)} ${e.path}`);
  log.info("Mounted routes:\n " + lines.join("\n "));
}
/* ----------------------------------------------------------- */
