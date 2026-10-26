"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/app/_ui/Button";
import { TextField } from "@/app/_ui/Field";
import { Notice } from "@/app/_ui/Notice";
import { login, type LoginState } from "./actions";
import styles from "../auth.module.css";

export function LoginForm({ next, aviso }: { next?: string; aviso?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  // Correo y contraseña se conservan en el paso del código (se vuelven a enviar con él).
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const codigo = state.step === "codigo";

  return (
    <form className={styles.form} action={action} noValidate>
      {aviso && !state.error && <Notice kind="ok">{aviso}</Notice>}
      {state.error && <Notice kind="error">{state.error}</Notice>}
      <input type="hidden" name="next" value={next ?? ""} />
      <div hidden={codigo}>
        <div className={styles.form}>
          <TextField name="email" type="email" label="Correo" autoComplete="username" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField name="password" type="password" label="Contraseña" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      </div>
      {codigo && (
        <TextField
          name="codigo"
          label="Código de tu app de autenticación"
          hint="Son 6 dígitos y cambian cada 30 segundos."
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          autoFocus
          required
        />
      )}
      <Button type="submit" size="lg" block loading={pending}>
        {codigo ? "Verificar y entrar" : "Entrar"}
      </Button>
      <p className={styles.links}>
        <Link href="/admin/recuperar">Olvidé mi contraseña</Link>
        <Link href="/admin/recuperar?primera=1">Es mi primera vez</Link>
      </p>
    </form>
  );
}
