import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // El blog lee content/blog/*.md y las imágenes para compartir usan Inter y el avatar: se incluyen en el
  // despliegue para cuando una página se regenera en el servidor (las que muestran el catálogo).
  outputFileTracingIncludes: {
    "/": ["./content/blog/**/*"],
    "/inicio": ["./content/blog/**/*"],
    "/blog": ["./content/blog/**/*"],
    "/blog/*": ["./content/blog/**/*"],
    "/blog/*/opengraph-image*": ["./content/blog/**/*", "./node_modules/@fontsource/inter/files/inter-latin-*-normal.woff", "./public/img/rafa-avatar.png"],
  },
  // El preview (dev.viviendovino.com y despliegues de Preview) nunca se indexa,
  // incluidos los archivos estáticos que no pasan por proxy.ts.
  async headers() {
    if (process.env.NEXT_PUBLIC_PREVIEW !== "true") return [];
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] }];
  },
};

export default nextConfig;
