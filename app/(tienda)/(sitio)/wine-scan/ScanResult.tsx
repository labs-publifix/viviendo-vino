"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/app/_ui/Button";
import { Icon } from "@/app/_ui/Icon";
import { Price } from "@/app/_ui/Price";
import { NumberedLabel } from "@/app/_ui/Typography";
import type { ScanResponse } from "@/lib/wine-scan/types";
import styles from "./wineScan.module.css";

// Pantalla de resultado, en el orden de wine-scan/knowledge/voice.md: qué es → cómo se siente → cómo servirlo →
// con qué combina → un dato → (si aplica) vino parecido de Viviendo Vino → cierre de consumo responsable.

type Data = Extract<ScanResponse, { ok: true }>;

const NIVELES = {
  cuerpo: ["", "Ligero", "Ligero a medio", "Medio", "Medio-alto", "Pleno"],
  acidez: ["", "Suave", "Moderada", "Media", "Fresca", "Muy fresca"],
  tanino: ["Sin tanino", "Muy suave", "Suave", "Medio", "Firme", "Muy marcado"],
  dulzor: ["", "Seco", "Seco con fruta madura", "Semiseco", "Semidulce", "Dulce"],
} as const;

// Azúcar residual de referencia por nivel de dulzor (escala de wine-scan/knowledge/README.md).
const AZUCAR = ["", "menos de 4 g/L de azúcar residual", "menos de 4 g/L; se siente más dulce por la fruta madura", "4 a 12 g/L de azúcar residual", "12 a 45 g/L de azúcar residual", "más de 45 g/L de azúcar residual"];

const CONFIANZA = {
  alta: { label: "Confianza alta", note: "La etiqueta se leyó con claridad." },
  media: { label: "Confianza media", note: "Algunos datos no se leyeron del todo; tómalos como aproximados." },
  baja: { label: "Confianza baja", note: "La lectura es incierta. Si puedes, toma otra foto de cerca." },
} as const;

const CAMPOS: Record<string, string> = {
  productor: "productor",
  nombre_vino: "nombre",
  denominacion: "denominación",
  anada: "añada",
  uvas: "uva",
  region: "región",
  pais: "país",
  alcohol_pct: "alcohol",
};

function Scale({ label, value, words, min, note }: { label: string; value: number; words: readonly string[]; min: 0 | 1; note?: string }) {
  const filled = Math.max(0, Math.min(5, value));
  return (
    <div className={styles.scaleRow}>
      <span className={styles.scaleLabel}>{label}</span>
      <span className={styles.scaleTrack} role="meter" aria-label={label} aria-valuemin={min} aria-valuemax={5} aria-valuenow={filled} aria-valuetext={words[filled]}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= filled ? styles.segOn : styles.seg} />
        ))}
      </span>
      <span className={styles.scaleValue}>{words[filled]}</span>
      {note && <span className={styles.scaleNote}>{note}</span>}
    </div>
  );
}

export function ScanResult({ data, preview, onScanAgain }: { data: Data; preview: string | null; onScanAgain: () => void }) {
  const { guia: g, recomendacion: rec, scan_id } = data;
  const id = g.identificacion;
  const [vote, setVote] = useState<1 | -1 | null>(null);
  const [shared, setShared] = useState<string | null>(null);

  const title = id.nombre_vino ?? id.denominacion ?? id.productor ?? "Tu vino";
  const meta = [id.productor !== title ? id.productor : null, id.denominacion !== title ? id.denominacion : null, id.anada, id.region, id.pais].filter(Boolean);
  const [tmin, tmax] = g.servicio.temperatura_c;
  const leidos = id.campos_leidos.map((c) => CAMPOS[c]).filter(Boolean);
  const conTanino = id.grupo === "tinto" || id.grupo === "naranja" || id.grupo === "fortificado";

  async function sendVote(valor: 1 | -1) {
    setVote(valor);
    try {
      await fetch("/api/wine-scan/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scan_id, valor }),
      });
    } catch {
      // La opinión es opcional: si falla, no interrumpe a la persona.
    }
  }

  async function share() {
    const url = `${window.location.origin}/wine-scan`;
    const text = `${title}: ${g.resumen_perfil} Sírvelo entre ${tmin} y ${tmax} °C. Guía de Wine Scan de Viviendo Vino.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} · Wine Scan`, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShared("Copiado. Pégalo donde quieras compartirlo.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setShared("No se pudo compartir desde este navegador.");
    }
  }

  return (
    <article className={styles.result} aria-labelledby="scan-title">
      {/* 1. Qué es */}
      <header className={styles.what}>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:), no se sube a ningún lado
          <img src={preview} alt="" className={styles.thumb} />
        )}
        <div className={styles.whatText}>
          <NumberedLabel n={1}>Qué es</NumberedLabel>
          <h2 id="scan-title" className={styles.wineName}>
            {title}
          </h2>
          {meta.length > 0 && <p className={styles.meta}>{meta.join(" · ")}</p>}
          <ul className={styles.chips}>
            <li className={`${styles.confidence} ${styles[id.confianza]}`}>{CONFIANZA[id.confianza].label}</li>
            {id.uvas_nombres.map((u) => (
              <li key={u}>{u}</li>
            ))}
            {id.alcohol_pct && <li>{id.alcohol_pct}% alc.</li>}
          </ul>
          <p className={styles.small}>
            {CONFIANZA[id.confianza].note}
            {leidos.length > 0 && ` Leído en la etiqueta: ${leidos.join(", ")}.`}
          </p>
        </div>
      </header>

      {/* 2. Cómo se siente */}
      <section className={styles.block} aria-labelledby="perfil-title">
        <NumberedLabel n={2}>Cómo se siente</NumberedLabel>
        <h3 id="perfil-title" className={styles.blockTitle}>
          Perfil estimado
        </h3>
        <p>{g.resumen_perfil}</p>
        <div className={styles.scales}>
          <Scale label="Cuerpo" value={g.perfil_estimado.cuerpo} words={NIVELES.cuerpo} min={1} />
          <Scale label="Acidez" value={g.perfil_estimado.acidez} words={NIVELES.acidez} min={1} />
          {conTanino && <Scale label="Tanino" value={g.perfil_estimado.tanino} words={NIVELES.tanino} min={0} />}
          <Scale label="Dulzor" value={g.perfil_estimado.dulzor} words={NIVELES.dulzor} min={1} note={AZUCAR[g.perfil_estimado.dulzor]} />
        </div>
        <p className={styles.small}>Es una estimación por la uva, la región y el estilo, no una cata de esta botella.</p>
      </section>

      {/* 3. Cómo servirlo */}
      <section className={styles.block} aria-labelledby="servir-title">
        <NumberedLabel n={3}>Cómo servirlo</NumberedLabel>
        <h3 id="servir-title" className={styles.temp}>
          {tmin === tmax ? tmin : `${tmin} a ${tmax}`}
          <span> °C</span>
        </h3>
        <dl className={styles.serve}>
          <div>
            <dt>Copa</dt>
            <dd>{g.servicio.copa}</dd>
          </div>
          <div>
            <dt>Abrirlo antes</dt>
            <dd>{g.servicio.decantar}</dd>
          </div>
        </dl>
        <p>{g.servicio.texto}</p>
        <p className={styles.small}>{g.cuando_tomarlo}</p>
      </section>

      {/* 4. Con qué combina */}
      <section className={styles.block} aria-labelledby="maridaje-title">
        <NumberedLabel n={4}>Con qué combina</NumberedLabel>
        <h3 id="maridaje-title" className="vv-sr-only">
          Con qué combina
        </h3>
        <ul className={styles.pairings}>
          {g.maridajes.map((m) => (
            <li key={m.principio_id}>
              {m.principio && <p className={styles.principle}>{m.principio}</p>}
              <p className={styles.dish}>{m.tipo_de_plato}</p>
              <p>{m.porque}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. Un dato */}
      <section className={styles.block} aria-labelledby="dato-title">
        <NumberedLabel n={5}>Un dato</NumberedLabel>
        <h3 id="dato-title" className="vv-sr-only">
          Un dato
        </h3>
        <p className={styles.fact}>{g.dato}</p>
      </section>

      {/* 6. Vino parecido de Viviendo Vino (solo si el código encontró uno) */}
      {rec && (
        <section className={styles.rec} aria-labelledby="rec-title">
          <p className={styles.recLabel}>Un vino parecido de Viviendo Vino</p>
          <div className={styles.recBody}>
            {rec.imagen_url && (
              // eslint-disable-next-line @next/next/no-img-element -- foto del catálogo ya optimizada
              <img src={rec.imagen_url} alt={`Botella de ${rec.nombre}`} width={880} height={1184} loading="lazy" className={styles.recImg} />
            )}
            <div>
              <h3 id="rec-title" className={styles.recName}>
                {rec.nombre}
              </h3>
              <p className={styles.recPrice}>
                <Price cents={rec.precio_centavos} size="sm" /> <span>por botella</span>
              </p>
              <p>{rec.argumento}</p>
              <p className={styles.small}>
                <strong>Por qué se parece:</strong> {rec.razon}
              </p>
              {rec.estilo_distinto && <p className={styles.note}>Estilo distinto: más frutal y ligero.</p>}
              {rec.aviso_nobile && (
                <p className={styles.note}>
                  Ojo: el Vino Nobile di Montepulciano es de Sangiovese, en la Toscana. El Montepulciano d’Abruzzo es otra uva y otra región.
                </p>
              )}
            </div>
          </div>
          <ButtonLink href={rec.enlace} variant="secondary" block>
            Agregar a mi kit
          </ButtonLink>
        </section>
      )}

      {/* Acciones */}
      <div className={styles.actions}>
        <Button type="button" size="lg" block onClick={onScanAgain}>
          <Icon name="camera" size={20} /> Escanear otro
        </Button>
        <Button type="button" variant="secondary" block onClick={share}>
          <Icon name="share" size={18} /> Compartir
        </Button>
        {shared && (
          <p className={styles.small} role="status">
            {shared}
          </p>
        )}
      </div>

      <div className={styles.feedback}>
        {vote === null ? (
          <>
            <p id="feedback-q">¿Te sirvió esta guía?</p>
            <div role="group" aria-labelledby="feedback-q" className={styles.votes}>
              <button type="button" onClick={() => sendVote(1)} aria-label="Sí, me sirvió">
                <Icon name="thumbUp" size={22} />
              </button>
              <button type="button" onClick={() => sendVote(-1)} aria-label="No me sirvió">
                <Icon name="thumbDown" size={22} />
              </button>
            </div>
          </>
        ) : (
          <p role="status">Gracias por tu opinión.</p>
        )}
      </div>

      {/* Cierre (voice.md) */}
      <p className={styles.closing}>Disfruta con moderación. Este contenido es solo para mayores de edad.</p>
    </article>
  );
}
