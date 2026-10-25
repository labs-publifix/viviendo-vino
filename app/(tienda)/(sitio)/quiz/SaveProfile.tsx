"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/app/_ui/Button";
import { Checkbox, TextField } from "@/app/_ui/Field";
import { Icon } from "@/app/_ui/Icon";
import { Notice } from "@/app/_ui/Notice";
import { track } from "@/lib/quiz/client";
import styles from "./quiz.module.css";

// "Guarda tu perfil": el correo se pide solo aquí, después del resultado, y es opcional. El servidor
// (/api/quiz/save-profile) valida, guarda y envía el resumen con la guía en PDF del perfil.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function SaveProfile({ quizId, regalo }: { quizId: string; regalo: boolean }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [errors, setErrors] = useState<{ email?: string; consent?: string; form?: string }>({});
  const startedAt = useRef<number>(0);

  function toggle() {
    if (!open) {
      startedAt.current = Date.now();
      track("guardar", { quiz_id: quizId });
    }
    setOpen((o) => !o);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const next: typeof errors = {};
    if (!EMAIL.test(email)) next.email = "Revisa tu correo: falta algo, como la @ o el dominio.";
    if (data.get("consent") !== "on") next.consent = "Acepta el aviso de privacidad para recibir tu perfil.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      form.querySelector<HTMLElement>(next.email ? "[name=email]" : "[name=consent]")?.focus();
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/quiz/save-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          quiz_id: quizId,
          email,
          consent: true,
          marketing: data.get("marketing") === "on",
          website: String(data.get("website") ?? ""),
          startedAt: startedAt.current || undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "No pudimos enviarte el correo. Intenta de nuevo en un momento.");
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      setErrors({ form: err instanceof Error ? err.message : "No pudimos enviarte el correo. Intenta de nuevo en un momento." });
    }
  }

  if (status === "done") {
    return (
      <Notice kind="ok" title="Listo, revisa tu correo">
        Te enviamos {regalo ? "el perfil" : "tu perfil"}, la caja y la guía en PDF. Si no lo ves en unos minutos, busca en spam o en promociones.
      </Notice>
    );
  }

  return (
    <div className={styles.save}>
      <button type="button" className={styles.saveToggle} aria-expanded={open} aria-controls="guardar-perfil" onClick={toggle}>
        <span>
          <span className={styles.saveTitle}>{regalo ? "Guarda este perfil" : "Guarda tu perfil"}</span>
          <span className={styles.saveText}>y recibe la guía de {regalo ? "este" : "tu"} perfil en PDF.</span>
        </span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} aria-hidden="true">
          <Icon name="chevron" size={18} />
        </span>
      </button>
      {open && (
        <form id="guardar-perfil" className={styles.saveForm} noValidate onSubmit={onSubmit}>
          <TextField name="email" type="email" label="Correo" autoComplete="email" inputMode="email" error={errors.email} />
          <Checkbox
            name="consent"
            label={
              <>
                Acepto el <Link href="/privacidad">aviso de privacidad</Link>.
              </>
            }
            error={errors.consent}
          />
          <Checkbox name="marketing" label="Quiero recibir novedades de Viviendo Vino (opcional)." />
          {/* Campo trampa para bots: invisible para personas. */}
          <div className={styles.trap} aria-hidden="true">
            <label>
              Sitio web
              <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>
          {errors.form && <Notice kind="error">{errors.form}</Notice>}
          <Button type="submit" block size="lg" loading={status === "sending"}>
            {status === "sending" ? "Enviando…" : "Enviarme mi perfil"}
          </Button>
        </form>
      )}
    </div>
  );
}
