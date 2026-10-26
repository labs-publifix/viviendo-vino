"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/app/_ui/Button";
import { TextField } from "@/app/_ui/Field";
import { Notice } from "@/app/_ui/Notice";
import { requestLink, type LinkState } from "./actions";
import styles from "../auth.module.css";

export function RecoverForm() {
  const [state, action, pending] = useActionState<LinkState, FormData>(requestLink, {});
  if (state.sent) {
    return (
      <>
        <Notice kind="ok" title="Revisa tu correo">
          Si ese correo tiene acceso al panel, te enviamos un enlace para crear tu contraseña. Vence en una hora. Si no lo ves, busca en spam.
        </Notice>
        <p className={styles.links}>
          <Link href="/admin/acceso">Volver a entrar</Link>
        </p>
      </>
    );
  }
  return (
    <form className={styles.form} action={action} noValidate>
      {state.error && <Notice kind="error">{state.error}</Notice>}
      <TextField name="email" type="email" label="Correo" autoComplete="username" inputMode="email" required />
      <Button type="submit" size="lg" block loading={pending}>
        Enviarme el enlace
      </Button>
      <p className={styles.links}>
        <Link href="/admin/acceso">Volver a entrar</Link>
      </p>
    </form>
  );
}
