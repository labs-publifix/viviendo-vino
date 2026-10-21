"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { giftEnd, launch } from "@/lib/launch";
import { EMAIL_ERROR } from "@/lib/messages";
import { WINE_TYPES, WINE_TYPE_LABELS, wineTypesNote, type WineType } from "@/lib/wine-types";
import styles from "./waitlist.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GENERIC_ERROR = "No pudimos registrarte. Revisa tu conexión e intenta de nuevo.";

export function SignupForm() {
  const [selected, setSelected] = useState<WineType[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<WineType[] | null>(null);
  const startedAt = useRef<number | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  function toggle(type: WineType) {
    setSelected((current) => {
      if (current.includes(type)) return current.filter((t) => t !== type);
      if (type === "todo") return ["todo"];
      return [...current.filter((t) => t !== "todo"), type];
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError(EMAIL_ERROR);
      emailRef.current?.focus();
      return;
    }
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: value,
          wineTypes: selected,
          source: new URLSearchParams(window.location.search).get("src"),
          website: honeypotRef.current?.value ?? "",
          startedAt: startedAt.current ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setError(data?.error || GENERIC_ERROR);
        return;
      }
      setDone(selected);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setDone(null);
    setSelected([]);
    setEmail("");
    startedAt.current = Date.now();
    requestAnimationFrame(() => emailRef.current?.focus());
  }

  if (done) {
    const note = wineTypesNote(done);
    return (
      <section className={styles.thanks} aria-live="polite">
        <h2>Listo, ya estás en la lista.</h2>
        <p>
          Tu regalo sorpresa va en tu primer kit si compras entre el {launch.day} y el {giftEnd.day}. Compra con este
          mismo correo.
        </p>
        {note && <p className={styles.picked}>{note}</p>}
        <button className={styles.link} type="button" onClick={reset}>
          Registrar otro correo
        </button>
      </section>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          ¿Qué te gusta tomar? <span>(opcional)</span>
        </legend>
        <div className={styles.chips}>
          {WINE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={styles.chip}
              aria-pressed={selected.includes(type)}
              onClick={() => toggle(type)}
            >
              <span className={styles.dot} aria-hidden="true" />
              {WINE_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className={styles.row}>
        <input
          ref={emailRef}
          className={styles.input}
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          aria-label="Correo electrónico"
          aria-describedby="signup-error"
          aria-invalid={error ? true : undefined}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError("");
          }}
        />
        <button className={styles.btn} type="submit" disabled={sending}>
          {sending ? "Enviando…" : "Quiero mi regalo sorpresa"}
        </button>
      </div>

      {/* Campo trampa para bots: invisible para personas. */}
      <div className={styles.trap} aria-hidden="true">
        <label>
          Sitio web
          <input ref={honeypotRef} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <p className={styles.error} id="signup-error" role="alert">
        {error}
      </p>

      <p className={styles.fine}>
        Compra con el mismo correo con el que te registras. El regalo aplica a compras hechas del {launch.day},{" "}
        {launch.time}, al {giftEnd.day}, {giftEnd.time} (hora centro de México). Un regalo por persona.
      </p>
      <p className={styles.legal}>
        Al registrarte confirmas que eres mayor de edad y aceptas recibir correos de Viviendo Vino.
      </p>
    </form>
  );
}
