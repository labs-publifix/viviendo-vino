import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getArticle, getArticles } from "@/lib/blog/content";
import { AUTHOR, typeLabel, type BlogColor } from "@/lib/blog/meta";
import { storeEnabled } from "@/lib/catalog/enabled";

// Imagen para compartir de cada artículo: el mismo bloque de color, el título y Rafa Aguirre. En Inter.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Artículo del blog de Viviendo Vino";

const fonts = join(process.cwd(), "node_modules/@fontsource/inter/files");
const [inter500, inter900] = await Promise.all([
  readFile(join(fonts, "inter-latin-500-normal.woff")),
  readFile(join(fonts, "inter-latin-900-normal.woff")),
]);
const avatar = `data:image/png;base64,${await readFile(join(process.cwd(), "public/img/rafa-avatar.png"), "base64")}`;

// Mismos colores que app/_ui/blogColors.module.css.
const PALETTE: Record<BlogColor, { bg: string; fg: string; muted: string; cifra: string }> = {
  oscuro: { bg: "#0A0206", fg: "#F3ECE4", muted: "rgba(243,236,228,0.78)", cifra: "#D2A5C8" },
  claro: { bg: "#F3ECE4", fg: "#0A0206", muted: "#5C5454", cifra: "#9A2030" },
  vino: { bg: "#9A2030", fg: "#F3ECE4", muted: "rgba(243,236,228,0.85)", cifra: "#F3ECE4" },
  acento: { bg: "#641F53", fg: "#F3ECE4", muted: "rgba(243,236,228,0.82)", cifra: "#D2A5C8" },
};

export function generateStaticParams() {
  if (!storeEnabled()) return [{ slug: "__tienda-cerrada__" }];
  return getArticles().map((a) => ({ slug: a.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = storeEnabled() ? getArticle(slug) : null;
  const c = PALETTE[a?.color ?? "oscuro"];
  const background =
    a?.color === "oscuro" || !a
      ? "radial-gradient(ellipse 60% 80% at 100% 0%, rgba(154,32,48,0.5), rgba(10,2,6,0) 70%), #0A0206"
      : c.bg;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: 72, background, color: c.fg, fontFamily: "Inter" }}>
        <div style={{ display: "flex", gap: 12, fontSize: 22, letterSpacing: 2, textTransform: "uppercase" }}>
          <span style={{ background: c.fg, color: c.bg === "#F3ECE4" ? "#F3ECE4" : c.bg, padding: "6px 16px", borderRadius: 999 }}>
            {a ? typeLabel(a.tipo) : "Blog"}
          </span>
          <span style={{ border: `2px solid ${c.muted}`, padding: "4px 16px", borderRadius: 999 }}>Viviendo Vino</span>
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 64, fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, maxWidth: 900 }}>
          {a?.titulo ?? "Aprende de vino sin complicarte."}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <img src={avatar} width={72} height={72} alt="" style={{ borderRadius: 999, border: `3px solid ${c.cifra}` }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 28 }}>{AUTHOR.name}</span>
              <span style={{ fontSize: 22, color: c.muted }}>{AUTHOR.role}</span>
            </div>
          </div>
          <span style={{ fontSize: 160, fontWeight: 900, letterSpacing: -8, lineHeight: 0.8, color: c.cifra }}>{a?.cifra ?? ""}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: inter500, weight: 500, style: "normal" },
        { name: "Inter", data: inter900, weight: 900, style: "normal" },
      ],
    },
  );
}
