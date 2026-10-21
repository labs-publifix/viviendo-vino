import Link from "next/link";

// 404 único del sitio. No menciona la tienda: con la tienda cerrada, sus rutas caen aquí sin pistas.
export default function NotFound() {
  return (
    <main style={{ minHeight: "100svh", maxWidth: 560, margin: "0 auto", padding: "96px 16px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
      <h1 style={{ margin: 0, fontSize: "clamp(32px, 6vw, 44px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
        Esta página no existe.
      </h1>
      <p style={{ margin: 0, color: "var(--muted)" }}>
        <Link href="/" style={{ color: "var(--accent)" }}>Ir a viviendovino.com</Link>
      </p>
    </main>
  );
}
