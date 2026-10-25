import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { PERFILES, PERFIL_IDS, perfilById } from "@/lib/quiz/config";
import { storeEnabled } from "@/lib/catalog/enabled";

// Imágenes del perfil del quiz, generadas aquí sin servicios externos: la tarjeta para historias (1080×1920) y
// la vista previa de los enlaces (1200×630). Bloque oscuro de marca (negro tinto con atmósfera vino y ciruela),
// Inter 900 para el nombre del perfil, etiqueta mono y @viviendovino. next.config.ts incluye las fuentes y el logo.

const fonts = join(process.cwd(), "node_modules/@fontsource");
const [inter500, inter900, mono500, logoSvg] = await Promise.all([
  readFile(join(fonts, "inter/files/inter-latin-500-normal.woff")),
  readFile(join(fonts, "inter/files/inter-latin-900-normal.woff")),
  readFile(join(fonts, "jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff")),
  readFile(join(process.cwd(), "public/brand/logo-fondo-oscuro.svg"), "utf8"),
]);
// Sin los metadatos del archivo (pesan y no se dibujan).
const LOGO = `data:image/svg+xml;base64,${Buffer.from(logoSvg.replace(/<metadata>[\s\S]*?<\/metadata>/, "")).toString("base64")}`;
const LOGO_RATIO = 786 / 250;

const C = { negro: "#0A0206", hueso: "#F3ECE4", carmin: "#CF2C4B", orquidea: "#D2A5C8", tenue: "rgba(243,236,228,0.8)" };
const ATMOSFERA =
  "radial-gradient(ellipse 70% 55% at 100% 0%, rgba(154,32,48,0.55), rgba(10,2,6,0) 70%), radial-gradient(ellipse 60% 45% at 0% 100%, rgba(100,31,83,0.45), rgba(10,2,6,0) 70%), #0A0206";

const FONTS = [
  { name: "Inter", data: inter500, weight: 500 as const, style: "normal" as const },
  { name: "Inter", data: inter900, weight: 900 as const, style: "normal" as const },
  { name: "Mono", data: mono500, weight: 500 as const, style: "normal" as const },
];

export const profileParams = () => (storeEnabled() ? PERFIL_IDS.map((perfil) => ({ perfil })) : [{ perfil: "__tienda-cerrada__" }]);

export async function profileFromParams(params: Promise<{ perfil: string }>) {
  if (!storeEnabled()) return null;
  return perfilById((await params).perfil) ?? null;
}

const notFound = () => new Response("No encontrado", { status: 404 });

/** Tarjeta para Stories y WhatsApp: 1080×1920. */
export function storyCard(perfil: (typeof PERFILES)[number] | null) {
  if (!perfil) return notFound();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "120px 96px", background: ATMOSFERA, color: C.hueso, fontFamily: "Inter" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse dibuja <img>, no next/image */}
        <img src={LOGO} width={420} height={Math.round(420 / LOGO_RATIO)} alt="" />
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", marginBottom: "auto" }}>
          <span style={{ fontFamily: "Mono", fontSize: 34, letterSpacing: 6, textTransform: "uppercase", color: C.orquidea }}>Mi perfil de vino</span>
          <div style={{ display: "flex", width: 96, height: 4, background: C.carmin, margin: "40px 0" }} />
          <span style={{ fontSize: 150, fontWeight: 900, lineHeight: 0.98, letterSpacing: -6 }}>{perfil.nombre}</span>
          <span style={{ marginTop: 56, fontSize: 46, lineHeight: 1.35, color: C.tenue, maxWidth: 860 }}>{perfil.frase}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: 56, fontWeight: 900, letterSpacing: -1 }}>¿Y tú?</span>
          <span style={{ fontSize: 38, color: C.tenue }}>Haz el quiz en viviendovino.com</span>
          <span style={{ fontFamily: "Mono", fontSize: 38, letterSpacing: 2, color: C.carmin }}>@viviendovino</span>
          <span style={{ marginTop: 36, fontSize: 24, color: "rgba(243,236,228,0.6)" }}>Solo para mayores de 18 años. Disfruta con moderación.</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts: FONTS, headers: { "cache-control": "public, max-age=3600, s-maxage=86400" } },
  );
}

/** Vista previa de los enlaces del resultado (Open Graph): 1200×630. */
export function ogCard(perfil: (typeof PERFILES)[number] | null) {
  if (!perfil) return notFound();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: 72, background: ATMOSFERA, color: C.hueso, fontFamily: "Inter" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "Mono", fontSize: 24, letterSpacing: 4, textTransform: "uppercase", color: C.orquidea }}>Perfil de vino · Quiz IA</span>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse dibuja <img>, no next/image */}
          <img src={LOGO} width={260} height={Math.round(260 / LOGO_RATIO)} alt="" />
        </div>
        <span style={{ marginTop: "auto", fontSize: 96, fontWeight: 900, lineHeight: 1, letterSpacing: -4, maxWidth: 1000 }}>{perfil.nombre}</span>
        <span style={{ marginTop: 28, fontSize: 32, lineHeight: 1.35, color: C.tenue, maxWidth: 940 }}>{perfil.frase}</span>
        <span style={{ marginTop: 36, fontFamily: "Mono", fontSize: 26, color: C.carmin }}>¿Y tú? Descubre tu perfil · @viviendovino</span>
      </div>
    ),
    { width: 1200, height: 630, fonts: FONTS, headers: { "cache-control": "public, max-age=3600, s-maxage=86400" } },
  );
}
