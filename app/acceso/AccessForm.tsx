"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import styles from "./acceso.module.css";

const ERRORS: Record<string, string> = {
  clave: "Esa contraseña no es. Revísala e inténtalo otra vez.",
  intentos: "Demasiados intentos. Espera unos minutos y vuelve a probar.",
};

export function AccessForm() {
  const params = useSearchParams();
  const error = ERRORS[params.get("error") ?? ""] ?? "";
  const [sending, setSending] = useState(false);

  return (
    <form className={styles.form} method="post" action="/api/acceso" onSubmit={() => setSending(true)}>
      <input type="hidden" name="next" value={params.get("next") ?? "/"} />
      <label className={styles.label} htmlFor="password">
        Contraseña
      </label>
      <div className={styles.row}>
        <input
          id="password"
          className={styles.input}
          type="password"
          name="password"
          autoComplete="current-password"
          required
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "acceso-error" : undefined}
        />
        <button className={styles.btn} type="submit" disabled={sending}>
          {sending ? "Entrando…" : "Entrar"}
        </button>
      </div>
      {error && (
        <p className={styles.error} id="acceso-error" role="alert">
          {error}
        </p>
      )}
      <p className={styles.note}>La sesión dura 7 días en este navegador.</p>
    </form>
  );
}
