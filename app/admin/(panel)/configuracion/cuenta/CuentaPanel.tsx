"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/app/_ui/Button";
import { TextField } from "@/app/_ui/Field";
import { Icon } from "@/app/_ui/Icon";
import { Notice } from "@/app/_ui/Notice";
import { PASSWORD_MIN } from "@/lib/admin/rules";
import { cambiarContrasena, cerrarOtrasSesiones, confirmar2fa, desactivar2fa, guardarNombre, iniciar2fa, type CuentaState, type TotpState } from "./actions";
import styles from "../config.module.css";

type Props = { nombre: string; email: string; rol: string; totpDesde: string | null; otrasSesiones: number };

export function CuentaPanel({ nombre, email, rol, totpDesde, otrasSesiones }: Props) {
  return (
    <div className={styles.stack}>
      <Datos nombre={nombre} email={email} rol={rol} />
      <Contrasena email={email} />
      <DosPasos activoDesde={totpDesde} />
      <Sesiones otras={otrasSesiones} />
    </div>
  );
}

function Section({ title, text, children, aside }: { title: string; text?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <header className={styles.sectionHead}>
        <div>
          <h2>{title}</h2>
          {text && <p>{text}</p>}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

function Datos({ nombre, email, rol }: { nombre: string; email: string; rol: string }) {
  const [state, action, pending] = useActionState<CuentaState, FormData>(guardarNombre, {});
  const [valor, setValor] = useState(nombre);
  return (
    <Section title="Tus datos">
      <form action={action} className={styles.form} noValidate>
        {state.ok && state.message && <Notice kind="ok">{state.message}</Notice>}
        {state.error && !state.field && <Notice kind="error">{state.error}</Notice>}
        <TextField name="nombre" label="Nombre" value={valor} onChange={(e) => setValor(e.target.value)} autoComplete="name" required error={state.field === "nombre" ? state.error : undefined} />
        <dl className={styles.facts}>
          <div>
            <dt>Correo</dt>
            <dd>{email}</dd>
          </div>
          <div>
            <dt>Rol</dt>
            <dd>{rol}</dd>
          </div>
        </dl>
        <p className={styles.hint}>Para cambiar tu correo o tu rol, pídeselo a otra persona administradora.</p>
        <div className={styles.actions}>
          <Button type="submit" variant="secondary" loading={pending}>
            Guardar nombre
          </Button>
        </div>
      </form>
    </Section>
  );
}

function Contrasena({ email }: { email: string }) {
  const [state, action, pending] = useActionState<CuentaState, FormData>(cambiarContrasena, {});
  const err = (f: string) => (state.field === f ? state.error : undefined);
  return (
    <Section title="Contraseña" text="Al cambiarla cerramos tus sesiones en otros dispositivos.">
      {/* key: al guardar bien, el formulario se vacía */}
      <form key={state.ok ? "ok" : "form"} action={action} className={styles.form} noValidate>
        {state.ok && state.message && <Notice kind="ok">{state.message}</Notice>}
        {state.error && !state.field && <Notice kind="error">{state.error}</Notice>}
        <input type="text" name="username" autoComplete="username" defaultValue={email} hidden readOnly />
        <TextField name="actual" type="password" label="Contraseña actual" autoComplete="current-password" required error={err("actual")} />
        <div className={styles.twoCols}>
          <TextField name="nueva" type="password" label="Contraseña nueva" autoComplete="new-password" minLength={PASSWORD_MIN} hint={`Al menos ${PASSWORD_MIN} caracteres. Una frase corta funciona bien.`} required error={err("nueva")} />
          <TextField name="confirm" type="password" label="Escríbela otra vez" autoComplete="new-password" required error={err("confirm")} />
        </div>
        <div className={styles.actions}>
          <Button type="submit" loading={pending}>
            Cambiar contraseña
          </Button>
        </div>
      </form>
    </Section>
  );
}

function DosPasos({ activoDesde }: { activoDesde: string | null }) {
  const [abierto, setAbierto] = useState(false);
  // Al terminar, el formulario se cierra y queda el aviso (la página se refresca con el estado nuevo).
  const [flash, setFlash] = useState<string | null>(null);
  const done = (msg: string) => {
    setAbierto(false);
    setFlash(msg);
  };
  const badge = (
    <span className={styles.badge} data-on={activoDesde ? "true" : "false"}>
      <span className={styles.dot} aria-hidden="true" />
      {activoDesde ? "Activado" : "Desactivado"}
    </span>
  );
  return (
    <Section
      title="Código en dos pasos"
      text="Es opcional. Además de tu contraseña, al entrar te pedimos un código de 6 dígitos de una app como Google Authenticator, 1Password o Authy."
      aside={badge}
    >
      {flash && !abierto && <Notice kind="ok">{flash}</Notice>}
      {activoDesde ? (
        abierto ? (
          <Desactivar onDone={done} onCancel={() => setAbierto(false)} />
        ) : (
          <div className={styles.row}>
            <p className={styles.hint}>Activado desde el {activoDesde}.</p>
            <Button type="button" variant="secondary" onClick={() => (setAbierto(true), setFlash(null))}>
              Desactivar
            </Button>
          </div>
        )
      ) : abierto ? (
        <Activar onDone={done} onCancel={() => setAbierto(false)} />
      ) : (
        <div className={styles.actions}>
          <Button type="button" onClick={() => (setAbierto(true), setFlash(null))}>
            Activar código en dos pasos
          </Button>
        </div>
      )}
    </Section>
  );
}

function Activar({ onDone, onCancel }: { onDone: (msg: string) => void; onCancel: () => void }) {
  // La contraseña se queda en este formulario mientras dura la activación (dos pasos) y se descarta al terminar.
  const [password, setPassword] = useState("");
  const [start, startAction, starting] = useActionState<TotpState, FormData>(iniciar2fa, {});
  const [confirm, confirmAction, confirming] = useActionState<TotpState, FormData>(async (prev, form) => {
    const r = await confirmar2fa(prev, form);
    if (r.ok) onDone(r.message ?? "Listo.");
    return r;
  }, {});
  const qr = confirm.step === "qr" ? confirm : start.step === "qr" ? start : null;

  if (!qr) {
    return (
      <form action={startAction} className={styles.form} noValidate>
        {start.error && start.field !== "password" && <Notice kind="error">{start.error}</Notice>}
        <TextField
          name="password"
          type="password"
          label="Tu contraseña"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="La pedimos para confirmar que eres tú."
          required
          autoFocus
          error={start.field === "password" ? start.error : undefined}
        />
        <div className={styles.actions}>
          <Button type="submit" loading={starting}>
            Continuar
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }
  return (
    <form action={confirmAction} className={styles.form} noValidate>
      {confirm.error && confirm.field !== "codigo" && <Notice kind="error">{confirm.error}</Notice>}
      <ol className={styles.steps}>
        <li>Abre tu app de autenticación y agrega una cuenta nueva.</li>
        <li>Escanea este código QR. Si no puedes, escribe la clave a mano.</li>
        <li>Escribe el código de 6 dígitos que te muestra la app.</li>
      </ol>
      <div className={styles.qrRow}>
        {/* eslint-disable-next-line @next/next/no-img-element -- QR en data URL que genera Supabase */}
        <img src={qr.qr} alt="Código QR para tu app de autenticación" width={176} height={176} className={styles.qr} />
        <div className={styles.secret}>
          <span>Clave para escribir a mano</span>
          <code>{qr.secret?.replace(/(.{4})/g, "$1 ").trim()}</code>
        </div>
      </div>
      <input type="hidden" name="factorId" value={qr.factorId} />
      <input type="hidden" name="qr" value={qr.qr} />
      <input type="hidden" name="secret" value={qr.secret} />
      <input type="hidden" name="password" value={password} />
      <TextField
        name="codigo"
        label="Código de 6 dígitos"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        required
        autoFocus
        error={confirm.field === "codigo" ? confirm.error : undefined}
      />
      <div className={styles.actions}>
        <Button type="submit" loading={confirming}>
          Activar
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function Desactivar({ onDone, onCancel }: { onDone: (msg: string) => void; onCancel: () => void }) {
  const [state, action, pending] = useActionState<CuentaState, FormData>(async (prev, form) => {
    const r = await desactivar2fa(prev, form);
    if (r.ok) onDone(r.message ?? "Listo.");
    return r;
  }, {});
  return (
    <form action={action} className={styles.form} noValidate>
      {state.error && !state.field && <Notice kind="error">{state.error}</Notice>}
      <p className={styles.hint}>Para desactivarlo confirma tu contraseña y el código que muestra tu app ahora.</p>
      <div className={styles.twoCols}>
        <TextField name="password" type="password" label="Tu contraseña" autoComplete="current-password" required autoFocus error={state.field === "password" ? state.error : undefined} />
        <TextField name="codigo" label="Código de 6 dígitos" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required error={state.field === "codigo" ? state.error : undefined} />
      </div>
      <div className={styles.actions}>
        <Button type="submit" variant="secondary" loading={pending}>
          Desactivar
        </Button>
        <Button type="button" variant="link" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function Sesiones({ otras }: { otras: number }) {
  const [msg, setMsg] = useState<CuentaState | null>(null);
  const [pending, start] = useTransition();
  return (
    <Section title="Sesiones" text="Cada sesión dura 12 horas.">
      {msg && <Notice kind={msg.ok ? "ok" : "error"}>{msg.message ?? msg.error}</Notice>}
      <div className={styles.row}>
        <p className={styles.hint}>
          <Icon name="info" size={16} />{" "}
          {otras === 0 ? "Solo tienes abierta esta sesión." : `Tienes ${otras} ${otras === 1 ? "sesión abierta" : "sesiones abiertas"} en otros dispositivos o navegadores.`}
        </p>
        <Button type="button" variant="secondary" disabled={otras === 0} loading={pending} onClick={() => start(async () => setMsg(await cerrarOtrasSesiones()))}>
          Cerrar las demás
        </Button>
      </div>
    </Section>
  );
}
