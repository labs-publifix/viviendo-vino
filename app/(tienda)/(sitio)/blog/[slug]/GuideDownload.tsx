"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/app/_ui/Button";
import { Checkbox, TextField } from "@/app/_ui/Field";
import { Icon } from "@/app/_ui/Icon";
import { Notice } from "@/app/_ui/Notice";
import { IS_PREVIEW } from "@/lib/about";
import styles from "./article.module.css";

// Descarga de una guía: botón que abre una ventana con correo y aceptación. Solo parte visual y
// validación; el envío por correo se conecta en la fase de funcionalidades (no envía ni guarda nada).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function GuideDownload({ guide, label, tone = "light" }: { guide: string; label: string; tone?: "light" | "dark" }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [errors, setErrors] = useState<{ email?: string; consent?: string }>({});
  const [done, setDone] = useState(false);

  function open() {
    setErrors({});
    setDone(false);
    dialogRef.current?.showModal();
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const next: typeof errors = {};
    if (!EMAIL.test(email)) next.email = "Revisa tu correo: falta algo, como la @ o el dominio.";
    if (data.get("consent") !== "on") next.consent = "Acepta el aviso de privacidad para recibir la guía.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      e.currentTarget.querySelector<HTMLElement>(next.email ? "[name=email]" : "[name=consent]")?.focus();
      return;
    }
    setDone(true);
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
        <p className={styles.dialogText}>Te la enviamos a tu correo. Sin spam.</p>
        {done ? (
          <Notice kind="aviso" title={IS_PREVIEW ? "Función pendiente de conectar" : "Muy pronto"}>
            {IS_PREVIEW
              ? "El envío de la guía por correo se conecta en la fase de funcionalidades. No se envió ni se guardó nada."
              : "Muy pronto podrás recibir la guía en tu correo."}
          </Notice>
        ) : (
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
            <Button type="submit" block size="lg">
              Enviarme la guía
            </Button>
          </form>
        )}
      </dialog>
    </>
  );
}
