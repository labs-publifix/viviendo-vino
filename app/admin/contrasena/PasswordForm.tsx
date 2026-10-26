"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/app/_ui/Button";
import { TextField } from "@/app/_ui/Field";
import { Notice } from "@/app/_ui/Notice";
import { PASSWORD_MIN } from "@/lib/admin/rules";
import { setPassword, type PasswordState } from "./actions";
import styles from "../auth.module.css";

export function PasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(setPassword, {});
  if (!token) {
    return (
      <Notice kind="aviso" title="Falta el enlace">
        Abre el enlace que te llegó por correo, o <Link href="/admin/recuperar">pide uno nuevo</Link>.
      </Notice>
    );
  }
  return (
    <form className={styles.form} action={action} noValidate>
      {state.error && !state.field && <Notice kind="error">{state.error}</Notice>}
      <input type="hidden" name="t" value={state.token ?? token} />
      <TextField
        name="password"
        type="password"
        label="Contraseña nueva"
        hint={`Al menos ${PASSWORD_MIN} caracteres. Una frase corta funciona bien.`}
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
        required
        error={state.field === "password" ? state.error : undefined}
      />
      <TextField name="confirm" type="password" label="Escríbela otra vez" autoComplete="new-password" required error={state.field === "confirm" ? state.error : undefined} />
      <Button type="submit" size="lg" block loading={pending}>
        Guardar contraseña
      </Button>
      {state.error && !state.field && (
        <p className={styles.links}>
          <Link href="/admin/recuperar">Pedir un enlace nuevo</Link>
        </p>
      )}
    </form>
  );
}
