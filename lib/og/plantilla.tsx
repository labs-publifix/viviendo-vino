import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Plantilla de las imágenes de compartir (Open Graph, 1200 × 630) de cada sección y de cada vino.
// Dos variantes con los colores y la tipografía de la marca (Inter):
// - "foto": texto sobre crema a la izquierda y una foto del sitio a la derecha (recortes de public/img/og/,
//   que genera scripts/build-og-images.mjs).
// - "letras": solo texto sobre un color de la marca (vino, acento u oscuro).
// Nunca llevan precios: WhatsApp y las redes guardan la imagen por semanas.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

const COLOR = {
  crema: "#F3ECE4",
  tinta: "#0A0206",
  gris: "#5C5454",
  vino: "#9A2030",
  acento: "#641F53",
  rosa: "#D2A5C8",
};

const FONDOS = {
  vino: { bg: COLOR.vino, fg: COLOR.crema, muted: "rgba(243,236,228,0.86)", detalle: COLOR.crema },
  acento: { bg: COLOR.acento, fg: COLOR.crema, muted: "rgba(243,236,228,0.84)", detalle: COLOR.rosa },
  oscuro: {
    bg: `radial-gradient(ellipse 60% 80% at 100% 0%, rgba(154,32,48,0.5), rgba(10,2,6,0) 70%), ${COLOR.tinta}`,
    fg: COLOR.crema,
    muted: "rgba(243,236,228,0.8)",
    detalle: COLOR.rosa,
  },
} as const;

// Rutas acotadas a su carpeta (fuentes y public/img/og/) para que el compilador no empaquete todo el proyecto.
const fuente = (archivo: string) => readFile(join(process.cwd(), "node_modules/@fontsource/inter/files", archivo));
const og = (archivo: string) => readFile(join(process.cwd(), "public/img/og", archivo));
const dataUri = async (archivo: string, mime: string) => `data:${mime};base64,${(await og(archivo)).toString("base64")}`;

// Fuentes y logos: se leen al cargar el módulo (como en la imagen del blog), así cada imagen se dibuja sin leer
// archivos en la petición y queda pre-generada al compilar.
const [i500, i800, i900, logoColor, logoClaro] = await Promise.all([
  fuente("inter-latin-500-normal.woff"),
  fuente("inter-latin-800-normal.woff"),
  fuente("inter-latin-900-normal.woff"),
  dataUri("logo-color.png", "image/png"),
  dataUri("logo-claro.png", "image/png"),
]);
const fonts = [
  { name: "Inter", data: i500, weight: 500 as const, style: "normal" as const },
  { name: "Inter", data: i800, weight: 800 as const, style: "normal" as const },
  { name: "Inter", data: i900, weight: 900 as const, style: "normal" as const },
];

/** Recorte de public/img/og/ ("inicio.jpg", "vinos/langhe-nebbiolo.jpg") como data URI, o null si no existe
 *  (por ejemplo, un vino nuevo sin recorte todavía). En caché: la imagen se puede pre-generar al compilar. */
export async function fotoOg(archivo: string): Promise<string | null> {
  "use cache";
  if (!/^[a-z0-9-]+(\/[a-z0-9-]+)?\.(jpg|png)$/.test(archivo)) return null;
  try {
    return await dataUri(archivo, archivo.endsWith(".png") ? "image/png" : "image/jpeg");
  } catch {
    return null;
  }
}

type Comun = { etiqueta: string; titulo: string; texto?: string };
export type PlantillaOg =
  | (Comun & { variante: "foto"; foto: string | null; ancho?: number })
  | (Comun & { variante: "letras"; tono: keyof typeof FONDOS; lista?: string[] })
  /** Código de descuento: la cifra en grande ("10 %"), el texto público y el código en una etiqueta. */
  | (Comun & { variante: "promo"; cifra: string; codigo: string; foto: string | null });

const tamTitulo = (t: string) => (t.length > 40 ? 50 : t.length > 26 ? 60 : 72);

export async function imagenOg(p: PlantillaOg): Promise<ImageResponse> {
  if (p.variante === "foto") {
    const anchoFoto = p.foto ? (p.ancho ?? 540) : 0;
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", background: COLOR.crema, fontFamily: "Inter" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "60px 64px", color: COLOR.tinta }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- Satori: imagen dentro del PNG */}
            <img src={logoColor} height={64} style={{ height: 64, width: 201 }} />
            <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", marginBottom: "auto", padding: "24px 0" }}>
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: COLOR.vino }}>{p.etiqueta}</span>
              <span style={{ marginTop: 18, fontSize: tamTitulo(p.titulo), fontWeight: 900, lineHeight: 1.04, letterSpacing: -2 }}>{p.titulo}</span>
              {p.texto ? <span style={{ marginTop: 22, fontSize: 28, fontWeight: 500, lineHeight: 1.3, color: COLOR.gris }}>{p.texto}</span> : null}
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, color: COLOR.vino }}>viviendovino.com</span>
          </div>
          {p.foto ? (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- Satori: imagen dentro del PNG
            <img src={p.foto} width={anchoFoto} height={630} style={{ width: anchoFoto, height: 630, objectFit: "cover" }} />
          ) : null}
        </div>
      ),
      { ...OG_SIZE, fonts },
    );
  }

  if (p.variante === "promo") {
    const largo = p.texto && p.texto.length > 70;
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", background: COLOR.crema, fontFamily: "Inter" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "56px 60px", color: COLOR.tinta }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- Satori: imagen dentro del PNG */}
            <img src={logoColor} height={58} style={{ height: 58, width: 182 }} />
            <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", marginBottom: "auto", padding: "16px 0" }}>
              <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: COLOR.vino }}>{p.etiqueta}</span>
              <span style={{ marginTop: 6, fontSize: 132, fontWeight: 900, lineHeight: 1, letterSpacing: -6, color: COLOR.vino }}>{p.cifra}</span>
              <span style={{ marginTop: 2, fontSize: 40, fontWeight: 900, lineHeight: 1.08, letterSpacing: -1.5 }}>{p.titulo}</span>
              {p.texto ? <span style={{ marginTop: 14, fontSize: largo ? 22 : 25, fontWeight: 500, lineHeight: 1.3, color: COLOR.gris }}>{p.texto}</span> : null}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 18, fontWeight: 500, color: COLOR.gris }}>Código</span>
                <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: 4, color: COLOR.vino, border: `3px dashed ${COLOR.vino}`, borderRadius: 14, padding: "6px 18px" }}>{p.codigo}</span>
              </div>
            </div>
          </div>
          {p.foto ? (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- Satori: imagen dentro del PNG
            <img src={p.foto} width={430} height={630} style={{ width: 430, height: 630, objectFit: "cover" }} />
          ) : null}
        </div>
      ),
      { ...OG_SIZE, fonts },
    );
  }

  const c = FONDOS[p.tono];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "60px 72px", background: c.bg, color: c.fg, fontFamily: "Inter" }}>
        {p.tono === "vino" ? (
          // Sobre el fondo vino, el círculo del logo se perdería: va en una placa crema.
          <div style={{ display: "flex", alignSelf: "flex-start", background: COLOR.crema, borderRadius: 18, padding: "12px 18px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- Satori: imagen dentro del PNG */}
            <img src={logoColor} height={56} style={{ height: 56, width: 176 }} />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- Satori: imagen dentro del PNG
          <img src={logoClaro} height={64} style={{ height: 64, width: 201 }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", marginBottom: "auto", padding: "24px 0" }}>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color: c.detalle }}>{p.etiqueta}</span>
          <span style={{ marginTop: 18, fontSize: tamTitulo(p.titulo) + 6, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2, maxWidth: 1000 }}>{p.titulo}</span>
          {p.texto ? <span style={{ marginTop: 22, fontSize: 30, fontWeight: 500, lineHeight: 1.3, color: c.muted, maxWidth: 940 }}>{p.texto}</span> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {(p.lista ?? []).map((x) => (
              <span key={x} style={{ fontSize: 20, fontWeight: 500, border: `2px solid ${c.muted}`, borderRadius: 999, padding: "6px 16px" }}>
                {x}
              </span>
            ))}
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, color: c.detalle }}>viviendovino.com</span>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
