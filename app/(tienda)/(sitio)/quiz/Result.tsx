"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Button, ButtonLink } from "@/app/_ui/Button";
import { Icon } from "@/app/_ui/Icon";
import { Notice } from "@/app/_ui/Notice";
import { Price } from "@/app/_ui/Price";
import { Heading, MonoTag, NumberedLabel } from "@/app/_ui/Typography";
import { track } from "@/lib/quiz/client";
import { TEXTOS } from "@/lib/quiz/config";
import type { QuizResult, ResultKit } from "@/lib/quiz/result";
import { formatMXN } from "@/lib/money";
import { SaveProfile } from "./SaveProfile";
import styles from "./quiz.module.css";

// Resultado del quiz. "propio": quien lo acaba de hacer (agregar al carrito, compartir, guardar, repetir).
// "compartido": quien abre el enlace de otra persona (ve el perfil y la caja, y la invitación a hacer el quiz).

export function Result({
  result,
  compartible,
  mode,
  onRepeat,
  titleRef,
}: {
  result: QuizResult;
  compartible: boolean;
  mode: "propio" | "compartido";
  onRepeat?: () => void;
  titleRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const own = mode === "propio";
  const quizId = compartible ? result.id : undefined;
  const { kit } = result;

  useEffect(() => {
    if (!own) track("visita_compartida", { quiz_id: result.id });
  }, [own, result.id]);

  return (
    <div className={styles.result}>
      <header className={styles.profile}>
        <NumberedLabel>{own ? (result.regalo ? "El perfil para tu regalo" : "Tu perfil") : "Perfil de vino"}</NumberedLabel>
        <h1 ref={titleRef} tabIndex={-1} className={styles.profileName}>
          {result.perfil.nombre}
        </h1>
        <p className={styles.profileText}>{own ? result.perfil.frase : result.perfil.fraseCorta}</p>
      </header>

      {own && result.avisos.length > 0 && (
        <div className={styles.stackSm}>
          {result.avisos.map((a) => (
            <Notice key={a} kind="info">
              {a}
            </Notice>
          ))}
        </div>
      )}

      {kit ? (
        <section className={styles.kit} aria-labelledby="kit-title">
          <div className={styles.kitHead}>
            <Heading level={2} size="subtitle" id="kit-title">
              {own ? (result.regalo ? "La caja para regalar" : "Tu caja de 6") : "Su caja de 6"}
            </Heading>
            <div className={styles.kitMeta}>
              {kit.grupoNombre && <MonoTag>{kit.grupoNombre}</MonoTag>}
              <Price cents={kit.totalCentavos} size="md" />
            </div>
            <p className={styles.small}>6 botellas, envío incluido. En el armador puedes cambiar las que quieras.</p>
          </div>
          {own && result.notaOcasion && <p className={styles.occasion}>{result.notaOcasion}</p>}

          <KitLines kit={kit} withReasons />

          {result.invitacionReto && (
            <aside className={styles.reto}>
              <p className={styles.retoLabel}>{TEXTOS.roles.reto}</p>
              <p>{result.invitacionReto}</p>
            </aside>
          )}

          {!kit.disponible && (
            <Notice kind="aviso">Una de estas botellas se agotó desde que se armó la caja. En el armador puedes cambiarla por otra de su grupo.</Notice>
          )}
          <div className={styles.actions}>
            <ButtonLink href={kit.armadorUrl} size="lg" block onClick={() => track("carrito", { quiz_id: quizId })}>
              <Icon name="cart" size={20} /> {own ? "Agregar mi kit al carrito" : "Agregar este kit al carrito"}
            </ButtonLink>
            {!own && (
              <ButtonLink href="/quiz?origen=compartido" variant="secondary" size="lg" block>
                Haz el quiz y descubre tu perfil
              </ButtonLink>
            )}
          </div>
        </section>
      ) : (
        <div className={styles.actions}>
          <ButtonLink href="/arma-tu-kit" size="lg" block>
            Armar mi caja en el armador
          </ButtonLink>
        </div>
      )}

      {result.prearmado && (
        <section className={styles.alt} aria-labelledby="prearmado-title">
          <p className={styles.altLabel}>También te queda</p>
          <h2 id="prearmado-title" className={styles.altTitle}>
            {result.prearmado.nombre}
          </h2>
          <p className={styles.small}>{result.prearmado.descripcion}</p>
          <div className={styles.altFoot}>
            <Price cents={result.prearmado.totalCentavos} size="sm" />
            <ButtonLink href={`/arma-tu-kit?kit=${result.prearmado.slug}&agregar=1`} variant="secondary" onClick={() => track("prearmado", { quiz_id: quizId })}>
              Agregar este kit
            </ButtonLink>
          </div>
        </section>
      )}

      {result.alterno && <SecondKit kit={result.alterno} quizId={quizId} />}

      {own && (
        <section className={styles.more} aria-label="Más opciones">
          {compartible && <Share result={result} />}
          {compartible && <SaveProfile quizId={result.id} regalo={result.regalo} />}
          {onRepeat && (
            <Button type="button" variant="secondary" block onClick={onRepeat}>
              <Icon name="refresh" size={18} /> Repetir con otra ocasión
            </Button>
          )}
        </section>
      )}

      <p className={styles.legal}>Disfruta con moderación. Venta y consumo solo para mayores de 18 años.</p>
    </div>
  );
}

function KitLines({ kit, withReasons }: { kit: ResultKit; withReasons: boolean }) {
  return (
    <ul className={styles.lines}>
      {kit.lineas.map((l) => (
        <li key={l.slug} className={styles.line}>
          <div className={styles.photo}>
            {l.imagen ? (
              // eslint-disable-next-line @next/next/no-img-element -- fotos ya optimizadas del catálogo
              <img src={l.imagen} alt={`Botella de ${l.nombre}`} width={880} height={1184} loading="lazy" decoding="async" />
            ) : (
              <Icon name="glass" size={28} />
            )}
          </div>
          <div className={styles.lineBody}>
            <p className={`${styles.role} ${styles[l.rol]}`}>{TEXTOS.roles[l.rol]}</p>
            <h3 className={styles.lineName}>
              <Link href={`/vinos/${l.slug}`}>{l.nombre}</Link>
            </h3>
            <p className={styles.lineQty}>
              {l.cantidad} × {formatMXN(l.precioCentavos)}
              {!l.disponible && <span className={styles.soldOut}> · Agotado por ahora</span>}
            </p>
            {withReasons && l.motivo && <p className={styles.reason}>{l.motivo}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function SecondKit({ kit, quizId }: { kit: ResultKit; quizId?: string }) {
  const [open, setOpen] = useState(false);
  const name = TEXTOS.familias[kit.familia];
  return (
    <section className={styles.alt} aria-labelledby="alterno-title">
      <p className={styles.altLabel}>Otra opción</p>
      <h2 id="alterno-title" className={styles.altTitle}>
        Tu caja de {name}
      </h2>
      <div className={styles.altFoot}>
        <Price cents={kit.totalCentavos} size="sm" />
        <button
          type="button"
          className={styles.textBtn}
          aria-expanded={open}
          onClick={() => {
            setOpen((o) => !o);
            if (!open) track("segundo_kit", { quiz_id: quizId });
          }}
        >
          {open ? "Ocultar" : "Ver las 6 botellas"}
        </button>
      </div>
      {open && (
        <>
          <KitLines kit={kit} withReasons={false} />
          <ButtonLink href={kit.armadorUrl} variant="secondary" block onClick={() => track("carrito", { quiz_id: quizId })}>
            Agregar esta caja al carrito
          </ButtonLink>
        </>
      )}
    </section>
  );
}

function Share({ result }: { result: QuizResult }) {
  const [status, setStatus] = useState<"" | "copiado" | "error">("");
  const card = useRef<File | null>(null);
  const url = () => `${window.location.origin}/quiz/r/${result.id}?origen=compartido`;
  const cardUrl = `/quiz/tarjeta/${result.perfil.id}`;
  const text = `Soy ${result.perfil.nombre}. ¿Y tú? Descubre tu perfil de vino en Viviendo Vino.`;

  // La tarjeta se descarga antes del clic: Web Share con archivos exige que la llamada sea inmediata.
  useEffect(() => {
    let alive = true;
    fetch(cardUrl)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (alive && b) card.current = new File([b], `perfil-${result.perfil.id}.png`, { type: "image/png" });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [cardUrl, result.perfil.id]);

  async function share() {
    const link = url();
    try {
      const files = card.current ? [card.current] : [];
      if (files.length && navigator.canShare?.({ files })) {
        await navigator.share({ files, text: `${text} ${link}` });
        track("compartido", { quiz_id: result.id });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: result.perfil.nombre, text, url: link });
        track("compartido", { quiz_id: result.id });
        return;
      }
      await copy();
    } catch (err) {
      // Cerrar la hoja de compartir no es un error.
      if (err instanceof DOMException && err.name === "AbortError") return;
      await copy();
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      setStatus("copiado");
      track("copiado", { quiz_id: result.id });
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={styles.share}>
      <Button type="button" variant="secondary" block onClick={share}>
        <Icon name="share" size={18} /> Compartir mi perfil
      </Button>
      <div className={styles.shareLinks}>
        <button type="button" className={styles.textBtn} onClick={copy}>
          Copiar enlace
        </button>
        <a className={styles.textBtn} href={cardUrl} download={`perfil-${result.perfil.id}.png`} onClick={() => track("tarjeta", { quiz_id: result.id })}>
          Descargar tarjeta para historias
        </a>
      </div>
      <p className={styles.small} role="status" aria-live="polite">
        {status === "copiado" ? "Enlace copiado." : status === "error" ? `Copia este enlace: ${url()}` : ""}
      </p>
    </div>
  );
}
