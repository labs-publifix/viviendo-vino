import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import QRCode from "qrcode";
import { Icon } from "@/app/_ui/Icon";
import { Heading, NumberedLabel } from "@/app/_ui/Typography";
import { storeEnabled } from "@/lib/catalog/enabled";
import { SITE_URL } from "@/lib/site";
import { Scanner } from "./Scanner";
import styles from "./wineScan.module.css";

// Wine Scan: en el celular, foto de la etiqueta → guía. En escritorio solo se muestra un QR para abrirlo en el
// celular (la decisión de qué vista se ve es de CSS: puntero táctil y ancho, sin parpadeo al cargar).

export const metadata: Metadata = {
  title: "Wine Scan · Viviendo Vino",
  description: "Toma una foto de la etiqueta de cualquier vino y recibe una guía: qué es, cómo se siente, cómo servirlo y con qué combina.",
  alternates: { canonical: `${SITE_URL}/wine-scan` },
};

const HOST = /^[a-z0-9.-]+(:\d{2,5})?$/i;

// El QR apunta al mismo sitio donde se abre (dev o producción). Se genera aquí, sin servicios externos.
async function DesktopQr() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  const url = HOST.test(host) ? `${host.startsWith("localhost") ? "http" : "https"}://${host}/wine-scan` : `${SITE_URL}/wine-scan`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0a0206", light: "#00000000" } });
  return <div className={styles.qrCode} role="img" aria-label="Código QR para abrir Wine Scan en tu celular" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function WineScanPage() {
  if (!storeEnabled()) notFound();
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <NumberedLabel>Wine Scan</NumberedLabel>
        <Heading level={1} size="section">
          Fotografía la etiqueta. Entérate de todo.
        </Heading>
        <p className={styles.lede}>
          Toma una foto de la etiqueta de cualquier vino y recibe una guía: qué es, cómo se siente, cómo servirlo y con qué combina.
        </p>
      </header>

      <div className={styles.mobile}>
        <Scanner />
      </div>

      <section className={styles.desktop} aria-labelledby="qr-title">
        <div className={styles.qrCard}>
          <Suspense fallback={<div className={styles.qrCode} aria-hidden="true" />}>
            <DesktopQr />
          </Suspense>
          <div className={styles.qrText}>
            <h2 id="qr-title" className={styles.qrTitle}>
              Ábrelo desde tu celular
            </h2>
            <p>Escanea este código con la cámara de tu celular. Wine Scan usa la cámara para leer la etiqueta, así que funciona solo en el celular.</p>
            <p className={styles.qrSteps}>
              <Icon name="camera" size={16} /> Gratis · sin registro · la foto no se guarda
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
