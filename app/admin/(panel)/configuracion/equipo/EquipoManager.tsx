"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/app/_ui/Button";
import { TextField } from "@/app/_ui/Field";
import { Notice } from "@/app/_ui/Notice";
import type { Rol } from "@/lib/admin/rules";
import { cambiarAcceso, editarMiembro, invitar, reenviarEnlace, type ActionResult, type EquipoState } from "./actions";
import styles from "../config.module.css";
import { Select } from "../../_ui/Select";

export type Miembro = {
  id: string;
  email: string;
  nombre: string;
  iniciales: string;
  rol: Rol;
  rolLabel: string;
  aliadoId: string | null;
  aliado: string | null;
  estado: "activo" | "pendiente" | "sin-acceso";
  ultimoAcceso: string | null;
  totp: boolean;
};
type RolOpcion = { value: Rol; label: string; desc: string };
type Aliado = { id: string; nombre: string };

const ESTADO: Record<Miembro["estado"], string> = { activo: "Con acceso", pendiente: "Invitación pendiente", "sin-acceso": "Sin acceso" };

export function EquipoManager({ miembros, aliados, roles, yo }: { miembros: Miembro[]; aliados: Aliado[]; roles: RolOpcion[]; yo: string }) {
  const [invitando, setInvitando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const run = (id: string, fn: () => Promise<ActionResult>) => {
    setAviso(null);
    setBusy(id);
    start(async () => {
      setAviso(await fn());
      setBusy(null);
    });
  };

  return (
    <div className={styles.stack}>
      <div className={styles.listHead}>
        <p className={styles.hint}>
          {miembros.filter((m) => m.estado !== "sin-acceso").length} con acceso. Cada persona crea su propia contraseña con el enlace que le llega por correo.
        </p>
        {!invitando && (
          <Button
            type="button"
            onClick={() => {
              setInvitando(true);
              setEditando(null);
              setAviso(null);
            }}
          >
            Invitar persona
          </Button>
        )}
      </div>

      {aviso && (aviso.error || aviso.message) && <Notice kind={aviso.error ? "error" : "ok"}>{aviso.error ?? aviso.message}</Notice>}

      {invitando && (
        <section className={`${styles.section} ${styles.sectionStrong}`}>
          <MiembroForm
            roles={roles}
            aliados={aliados}
            onDone={(r) => {
              setInvitando(false);
              setAviso(r);
            }}
            onCancel={() => setInvitando(false)}
          />
        </section>
      )}

      <ul className={styles.members}>
        {miembros.map((m) => {
          const soyYo = m.id === yo;
          if (editando === m.id) {
            return (
              <li key={m.id} className={`${styles.member} ${styles.memberEditing}`}>
                <MiembroForm
                  miembro={m}
                  roles={roles}
                  aliados={aliados}
                  bloquearRol={soyYo}
                  onDone={(r) => {
                    setEditando(null);
                    setAviso(r);
                  }}
                  onCancel={() => setEditando(null)}
                />
              </li>
            );
          }
          return (
            <li key={m.id} className={`${styles.member} ${m.estado === "sin-acceso" ? styles.memberOff : ""}`} aria-busy={(pending && busy === m.id) || undefined}>
              <span className={styles.avatar} aria-hidden="true">
                {m.iniciales}
              </span>
              <div className={styles.memberBody}>
                <p className={styles.memberName}>
                  {m.nombre}
                  {soyYo && <span className={styles.you}>Tú</span>}
                </p>
                <p className={styles.memberMail}>{m.email}</p>
                <p className={styles.memberMeta}>
                  <span className={styles.badge} data-estado={m.estado}>
                    <span className={styles.dot} aria-hidden="true" />
                    {ESTADO[m.estado]}
                  </span>
                  <span>
                    {m.rolLabel}
                    {m.aliado ? ` · ${m.aliado}` : ""}
                  </span>
                  <span>{m.totp ? "Con código en dos pasos" : "Sin código en dos pasos"}</span>
                  {m.ultimoAcceso && <span>Último acceso: {m.ultimoAcceso}</span>}
                </p>
              </div>
              <div className={styles.memberActions}>
                {confirmando === m.id ? (
                  <div className={styles.confirm} role="group" aria-label={`Confirmar: quitar el acceso a ${m.nombre}`}>
                    <span>¿Quitarle el acceso? Se cierran sus sesiones al momento.</span>
                    <button
                      type="button"
                      className={styles.danger}
                      disabled={pending}
                      onClick={() => {
                        setConfirmando(null);
                        run(m.id, () => cambiarAcceso(m.id, false));
                      }}
                    >
                      Sí, quitar acceso
                    </button>
                    <button type="button" className={styles.textBtn} onClick={() => setConfirmando(null)} autoFocus>
                      Cancelar
                    </button>
                  </div>
                ) : soyYo ? (
                  <a href="/admin/configuracion/cuenta" className={styles.textBtn}>
                    Ir a Mi cuenta
                  </a>
                ) : (
                  <>
                    <button type="button" className={styles.textBtn} disabled={pending} onClick={() => setEditando(m.id)}>
                      Editar<span className="vv-sr-only"> a {m.nombre}</span>
                    </button>
                    {m.estado === "sin-acceso" ? (
                      <button type="button" className={styles.textBtn} disabled={pending} onClick={() => run(m.id, () => cambiarAcceso(m.id, true))}>
                        Devolver acceso<span className="vv-sr-only"> a {m.nombre}</span>
                      </button>
                    ) : (
                      <>
                        <button type="button" className={styles.textBtn} disabled={pending} onClick={() => run(m.id, () => reenviarEnlace(m.id))}>
                          Reenviar enlace<span className="vv-sr-only"> a {m.nombre}</span>
                        </button>
                        <button type="button" className={`${styles.textBtn} ${styles.textDanger}`} disabled={pending} onClick={() => setConfirmando(m.id)}>
                          Quitar acceso<span className="vv-sr-only"> a {m.nombre}</span>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MiembroForm({
  miembro,
  roles,
  aliados,
  bloquearRol,
  onDone,
  onCancel,
}: {
  miembro?: Miembro;
  roles: RolOpcion[];
  aliados: Aliado[];
  bloquearRol?: boolean;
  onDone: (r: ActionResult) => void;
  onCancel: () => void;
}) {
  // Campos controlados: si el servidor regresa un error, lo escrito se conserva (React vacía los no controlados).
  const [rol, setRol] = useState<Rol>(miembro?.rol ?? "atencion");
  const [nombre, setNombre] = useState(miembro?.nombre ?? "");
  const [email, setEmail] = useState("");
  const [aliadoId, setAliadoId] = useState(miembro?.aliadoId ?? "");
  const [state, action, saving] = useActionState<EquipoState, FormData>(async (prev, form) => {
    const r = await (miembro ? editarMiembro : invitar)(prev, form);
    if (r.ok) onDone({ ok: true, message: r.message, error: r.error });
    return r;
  }, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className={styles.form} noValidate>
      <h3 className={styles.formTitle}>{miembro ? `Editar a ${miembro.nombre}` : "Invitar persona"}</h3>
      {state.error && !state.ok && <Notice kind="error">{state.error}</Notice>}
      {miembro && <input type="hidden" name="id" value={miembro.id} />}
      <div className={styles.twoCols}>
        <TextField name="nombre" label="Nombre" value={nombre} onChange={(ev) => setNombre(ev.target.value)} autoComplete="off" required autoFocus error={e.nombre} />
        {miembro ? (
          <div className={styles.readonly}>
            <span>Correo</span>
            <p>{miembro.email}</p>
          </div>
        ) : (
          <TextField
            name="email"
            type="email"
            label="Correo"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
            error={e.email}
            hint="Ahí le llega el enlace para crear su contraseña."
          />
        )}
      </div>
      <fieldset className={styles.roles} disabled={bloquearRol}>
        <legend>Rol</legend>
        {roles.map((r) => (
          <label key={r.value} className={styles.roleCard}>
            <input type="radio" name="rol" value={r.value} checked={rol === r.value} onChange={() => setRol(r.value)} />
            <span>
              <strong>{r.label}</strong>
              <small>{r.desc}</small>
            </span>
          </label>
        ))}
        {bloquearRol && <p className={styles.hint}>No puedes cambiar tu propio rol.</p>}
        {e.rol && <p className={styles.fieldError}>{e.rol}</p>}
      </fieldset>
      {/* Un fieldset deshabilitado no envía sus campos: el rol propio viaja aparte. */}
      {bloquearRol && <input type="hidden" name="rol" value={rol} />}
      {rol === "aliado" &&
        (aliados.length ? (
          <Select name="aliado_id" label="Aliado" value={aliadoId} onChange={setAliadoId} placeholder="Elige un aliado" error={e.aliado_id} options={aliados.map((a) => ({ value: a.id, label: a.nombre }))} />
        ) : (
          <Notice kind="aviso">Todavía no hay aliados dados de alta. Se agregan en Configuración → Aliados.</Notice>
        ))}
      <div className={styles.actions}>
        <Button type="submit" loading={saving}>
          {miembro ? "Guardar cambios" : "Enviar invitación"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
