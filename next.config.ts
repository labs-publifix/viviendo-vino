import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // El preview (dev.viviendovino.com y despliegues de Preview) nunca se indexa,
  // incluidos los archivos estáticos que no pasan por proxy.ts.
  async headers() {
    if (process.env.NEXT_PUBLIC_PREVIEW !== "true") return [];
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] }];
  },
};

export default nextConfig;
