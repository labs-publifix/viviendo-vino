"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/app/_ui/Button";
import { Checkbox, TextField } from "@/app/_ui/Field";
import { Icon } from "@/app/_ui/Icon";
import { Notice } from "@/app/_ui/Notice";
import styles from "./article.module.css";

// Descarga de una guía: botón que abre una ventana con correo y aceptación. El servidor (/api/guias)
// valida, guarda la solicitud y envía el PDF por correo. "Novedades" es opcional y aparte del aviso.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Status = "idle" | "sending" | "done";

export function GuideDownload({ slug, guide, label, tone = "light" }: { slug: string; guide: string; label: string; tone?: "light" | "dark" }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const startedAt = useRef<number | null>(null);
  const [errors, setErrors] = useState<{ email?: string; consent?: string; form?: string }>({});
  const [status, setStatus] = useState<Status>("idle");
  const [sentTo, setSentTo] = useState("");

  function open() {
    setErrors({});
    if (status !== "sending") setStatus("idle");
    startedAt.current = Date.now();
    dialogRef.current?.showModal();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const next: typeof errors = {};
    if (!EMAIL.test(email)) next.email = "Revisa tu correo: falta algo, como la @ o el dominio.";
    if (data.get("consent") !== "on") next.consent = "Acepta el aviso de privacidad para recibir la guía.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      form.querySelector<HTMLElement>(next.email ? "[name=email]" : "[name=consent]")?.focus();
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/guias", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          email,
          consent: true,
          marketing: data.get("marketing") === "on",
          website: String(data.get("website") ?? ""),
          startedAt: startedAt.current ?? undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "No pudimos enviarte la guía. Intenta de nuevo en un momento.");
      setSentTo(email);
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      setErrors({ form: err instanceof Error ? err.message : "No pudimos enviarte la guía. Intenta de nuevo en un momento." });
    }
  }

  return (
    <>
      <Button type="button" tone={tone} onClick={open}>
        <Icon name="download" size={18} /> {label}
      </Button>
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}>
        <form method="dialog" className={styles.dialogClose}>
          <button type="submit" aria-label="Cerrar">
            <Icon name="close" size={20} />
          </button>
        </form>
        <p className={styles.dialogLabel}>Guía en PDF</p>
        <h2 id={titleId} className={styles.dialogTitle}>
          {guide}
        </h2>
        {status === "done" ? (
          <Notice kind="ok" title="Listo, revisa tu correo">
            Te enviamos la guía a {sentTo}. Si no la ves en unos minutos, busca en spam o en promociones.
          </Notice>
        ) : (
          <>
            <p className={styles.dialogText}>Te la enviamos a tu correo. Sin spam.</p>
            <form className={styles.dialogForm} noValidate onSubmit={onSubmit}>
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
                {status === "sending" ? "Enviando…" : "Enviarme la guía"}
              </Button>
            </form>
          </>
        )}
      </dialog>
    </>
  );
}
