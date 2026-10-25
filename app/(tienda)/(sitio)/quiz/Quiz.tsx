"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, ButtonLink } from "@/app/_ui/Button";
import { Icon } from "@/app/_ui/Icon";
import { Notice } from "@/app/_ui/Notice";
import { Heading, NumberedLabel } from "@/app/_ui/Typography";
import { loadProfile, saveProfile, sessionId, track, visitOrigin, type SavedProfile } from "@/lib/quiz/client";
import { PREGUNTAS, TEXTOS, perfilById, type PreguntaUI } from "@/lib/quiz/config";
import type { QuizResult } from "@/lib/quiz/result";
import { useHydrated } from "@/lib/use-hydrated";
import { Result } from "./Result";
import styles from "./quiz.module.css";

// Quiz IA: entrada → 8 preguntas (una por pantalla, sin teclear) → comentario opcional → carga → resultado.
// La segunda vez, con el perfil guardado en el navegador, solo pregunta ocasión y presupuesto.
// Cada paso entra al historial del navegador: el "atrás" del teléfono regresa a la pregunta anterior sin
// perder respuestas.

type Answers = Record<string, string | string[]>;
type Phase = "pasos" | "cargando" | "resultado" | "error";
type Outcome = { resultado: QuizResult; compartible: boolean };

const ALL = PREGUNTAS.preguntas as PreguntaUI[];
const REPEAT_IDS = ["ocasion", "presupuesto"];
const AUTO_ADVANCE_MS = 220;
const NETWORK_ERROR = "No hubo conexión. Revisa tu internet e intenta de nuevo.";

export function Quiz() {
  const hydrated = useHydrated();
  const saved = useMemo<SavedProfile | null>(() => (hydrated ? loadProfile() : null), [hydrated]);
  const [mode, setMode] = useState<"completo" | "repetir">("completo");
  // pos 0 = entrada; 1..n = preguntas; n + 1 = comentario.
  const [pos, setPos] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [comment, setComment] = useState("");
  const [phase, setPhase] = useState<Phase>("pasos");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const advanceTimer = useRef<number | undefined>(undefined);
  const origin = useRef<string | undefined>(undefined);

  const steps = mode === "repetir" ? ALL.filter((q) => REPEAT_IDS.includes(q.id)) : ALL;
  const n = steps.length;
  const regalo = answers.ocasion === "regalo";

  // Historial: cada paso es una entrada; "atrás" vuelve al paso anterior con las respuestas intactas.
  useEffect(() => {
    origin.current = visitOrigin();
    window.history.replaceState({ ...(window.history.state ?? {}), quiz: 0 }, "");
    const onPop = (e: PopStateEvent) => {
      const to = typeof e.state?.quiz === "number" ? e.state.quiz : 0;
      window.clearTimeout(advanceTimer.current);
      setPhase((p) => (p === "cargando" ? p : "pasos"));
      setPos(to);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Foco al título de cada pantalla, para lectores de pantalla y teclado.
  useEffect(() => {
    if (pos > 0 || phase !== "pasos") titleRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [pos, phase]);

  useEffect(() => {
    if (phase !== "cargando") return;
    const t = window.setInterval(() => setLoadingStep((s) => s + 1), 1600);
    return () => window.clearInterval(t);
  }, [phase]);

  function go(to: number) {
    window.clearTimeout(advanceTimer.current);
    window.history.pushState({ ...(window.history.state ?? {}), quiz: to }, "");
    setPhase("pasos");
    setPos(to);
    if (to >= 1 && to <= n) track("pregunta", { pregunta: ALL.findIndex((q) => q.id === steps[to - 1].id) + 1 });
    if (to === n + 1) track("pregunta", { pregunta: 9 });
  }

  function start(repeat: boolean) {
    setMode(repeat ? "repetir" : "completo");
    if (repeat && saved) setAnswers({ ...saved.respuestas });
    else setAnswers({});
    setComment("");
    setOutcome(null);
    track(repeat ? "repetir_perfil" : "inicio", { origen: origin.current });
    if (repeat) track("inicio", { origen: origin.current });
    window.clearTimeout(advanceTimer.current);
    window.history.pushState({ ...(window.history.state ?? {}), quiz: 1 }, "");
    setPhase("pasos");
    setPos(1);
  }

  function pick(q: PreguntaUI, id: string) {
    if (q.tipo === "unica") {
      setAnswers((a) => ({ ...a, [q.id]: id }));
      advanceTimer.current = window.setTimeout(() => go(pos + 1), AUTO_ADVANCE_MS);
      return;
    }
    setAnswers((a) => {
      const current = (a[q.id] as string[] | undefined) ?? [];
      const option = q.opciones.find((o) => o.id === id)!;
      let next: string[];
      if (current.includes(id)) next = current.filter((x) => x !== id);
      else if (option.exclusiva) next = [id];
      else next = [...current.filter((x) => !q.opciones.find((o) => o.id === x)?.exclusiva), id].slice(-(q.max ?? 99));
      return { ...a, [q.id]: next };
    });
  }

  async function submit(withComment: boolean) {
    setPhase("cargando");
    setLoadingStep(0);
    setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25_000);
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          respuestas: answers,
          comentario: withComment && comment.trim() ? comment.trim() : undefined,
          session_id: sessionId(),
          origen: origin.current,
          repeticion: mode === "repetir",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!data) throw new Error(NETWORK_ERROR);
      if (!data.ok) throw new Error(data.error ?? NETWORK_ERROR);
      saveProfile(data.perfil_guardado);
      setOutcome({ resultado: data.resultado, compartible: data.compartible });
      track("resultado", { quiz_id: data.compartible ? data.resultado.id : undefined });
      window.history.pushState({ ...(window.history.state ?? {}), quiz: n + 2 }, "");
      setPos(n + 2);
      setPhase("resultado");
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setError(aborted ? "Armar tu caja tardó más de lo normal. Intenta de nuevo." : err instanceof Error ? err.message : NETWORK_ERROR);
      setPhase("error");
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function repeat() {
    track("repetir", { quiz_id: outcome?.compartible ? outcome.resultado.id : undefined });
    start(Boolean(loadProfile()));
  }

  if (phase === "cargando") {
    const msgs = regalo ? TEXTOS.carga_regalo : TEXTOS.carga;
    return (
      <div className={styles.loading} role="status" aria-live="polite">
        <ol className={styles.slots} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} style={{ animationDelay: `${i * 0.35}s` }} />
          ))}
        </ol>
        <h2 ref={titleRef} tabIndex={-1} className={styles.loadingText}>
          {msgs[Math.min(loadingStep, msgs.length - 1)]}
        </h2>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className={styles.stack}>
        <h2 ref={titleRef} tabIndex={-1} className={styles.srOnly}>
          No se pudo armar tu caja
        </h2>
        <Notice kind="error" title="No se pudo armar tu caja">
          {error}
        </Notice>
        <Button type="button" size="lg" block onClick={() => submit(true)}>
          <Icon name="refresh" size={18} /> Intentar de nuevo
        </Button>
        <ButtonLink href="/arma-tu-kit" variant="secondary" block>
          Armar mi caja yo mismo
        </ButtonLink>
      </div>
    );
  }

  if (phase === "resultado" && outcome && pos === n + 2) {
    return <Result result={outcome.resultado} compartible={outcome.compartible} mode="propio" onRepeat={repeat} titleRef={titleRef} />;
  }

  if (pos === 0) return <Intro saved={hydrated ? saved : null} onStart={start} />;

  // Comentario libre.
  if (pos === n + 1) {
    const max = PREGUNTAS.comentario.max;
    return (
      <div className={styles.stack}>
        <StepBar label="Último paso" value={n} total={n} onBack={() => window.history.back()} />
        <div className={styles.question}>
          <h2 ref={titleRef} tabIndex={-1} className={styles.qTitle}>
            {regalo ? PREGUNTAS.comentario.titulo_regalo : PREGUNTAS.comentario.titulo}
          </h2>
          <p className={styles.qHelp} id="comentario-ayuda">
            {PREGUNTAS.comentario.ayuda}
          </p>
        </div>
        <div className={styles.field}>
          <label htmlFor="comentario" className={styles.srOnly}>
            Comentario opcional
          </label>
          <textarea
            id="comentario"
            className={styles.textarea}
            value={comment}
            maxLength={max}
            rows={4}
            aria-describedby="comentario-ayuda comentario-cuenta"
            onChange={(e) => setComment(e.target.value)}
          />
          <p id="comentario-cuenta" className={styles.count} aria-live="polite">
            {comment.length} de {max}
          </p>
        </div>
        <Button type="button" size="lg" block onClick={() => { if (comment.trim()) track("comentario"); void submit(true); }}>
          {regalo ? "Ver la caja" : "Ver mi caja"}
        </Button>
        {!comment.trim() && <p className={styles.skipNote}>Puedes dejarlo vacío.</p>}
      </div>
    );
  }

  const q = steps[pos - 1];
  if (!q) return <Intro saved={hydrated ? saved : null} onStart={start} />;
  const value = answers[q.id];
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const full = q.tipo === "multiple" && q.max !== undefined && selected.length >= q.max;
  const titulo = regalo && q.titulo_regalo ? q.titulo_regalo : q.titulo;
  const ayuda = regalo && q.ayuda_regalo ? q.ayuda_regalo : q.ayuda;

  return (
    <div className={styles.stack}>
      <StepBar label={`Pregunta ${pos} de ${n}`} value={pos - 1} total={n} onBack={() => window.history.back()} />
      <div className={styles.question}>
        <h2 ref={titleRef} tabIndex={-1} className={styles.qTitle} id={`q-${q.id}`}>
          {titulo}
        </h2>
        {ayuda && <p className={styles.qHelp}>{ayuda}</p>}
      </div>
      <div className={styles.options} role={q.tipo === "unica" ? "radiogroup" : "group"} aria-labelledby={`q-${q.id}`}>
        {q.opciones.map((o) => {
          const on = selected.includes(o.id);
          const disabled = !on && full && !o.exclusiva;
          return (
            <button
              key={o.id}
              type="button"
              role={q.tipo === "unica" ? "radio" : "checkbox"}
              aria-checked={on}
              aria-disabled={disabled || undefined}
              className={`${styles.option} ${on ? styles.on : ""}`}
              onClick={() => !disabled && pick(q, o.id)}
            >
              <span className={styles.optionText}>
                <span className={styles.optionLabel}>{regalo && o.texto_regalo ? o.texto_regalo : o.texto}</span>
                {o.detalle && <span className={styles.optionDetail}>{o.detalle}</span>}
              </span>
              <span className={styles.mark} aria-hidden="true">
                {on && <Icon name="check" size={16} />}
              </span>
            </button>
          );
        })}
      </div>
      {(q.tipo === "multiple" || selected.length > 0) && (
        <Button type="button" size="lg" block disabled={selected.length === 0} onClick={() => go(pos + 1)}>
          Siguiente
        </Button>
      )}
    </div>
  );
}

function StepBar({ label, value, total, onBack }: { label: string; value: number; total: number; onBack: () => void }) {
  return (
    <div className={styles.stepBar}>
      <div className={styles.stepTop}>
        <button type="button" className={styles.back} onClick={onBack}>
          <span className={styles.backIcon} aria-hidden="true">
            <Icon name="arrow" size={16} />
          </span>
          Anterior
        </button>
        <span className={styles.stepLabel}>{label}</span>
      </div>
      <ol className={styles.segments} aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <li key={i} className={i < value ? styles.done : i === value ? styles.current : undefined} />
        ))}
      </ol>
    </div>
  );
}

function Intro({ saved, onStart }: { saved: SavedProfile | null; onStart: (repeat: boolean) => void }) {
  const perfil = saved ? perfilById(saved.perfil) : undefined;
  return (
    <div className={styles.intro}>
      <header className={styles.introHead}>
        <NumberedLabel>Quiz IA</NumberedLabel>
        <Heading level={1} size="section">
          Dinos cómo eres. Te armamos tu caja.
        </Heading>
        <p className={styles.lede}>
          Ocho preguntas sobre café, limonada y ocasiones, no sobre uvas. Al final, una caja de 6 botellas lista para el carrito, con el porqué de cada vino.
        </p>
        <p className={styles.detail}>
          <Icon name="clock" size={16} /> Toma unos 90 segundos.
        </p>
      </header>

      {perfil ? (
        <div className={styles.savedCard}>
          <p className={styles.savedLabel}>Tu perfil de la última vez</p>
          <p className={styles.savedName}>{perfil.nombre}</p>
          <p className={styles.savedText}>Solo te preguntamos para qué es la caja y cuánto quieres invertir.</p>
          <Button type="button" size="lg" block onClick={() => onStart(true)}>
            Usar mi perfil de la última vez
          </Button>
          <Button type="button" variant="secondary" block onClick={() => onStart(false)}>
            Empezar de cero
          </Button>
        </div>
      ) : (
        <Button type="button" size="lg" block onClick={() => onStart(false)}>
          Empezar
        </Button>
      )}
      <p className={styles.legal}>Al empezar confirmas que tienes 18 años o más. Usamos tus respuestas para armar tu caja; el correo nunca se pide antes del resultado.</p>
    </div>
  );
}
