"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/app/_ui/Button";
import { TextField } from "@/app/_ui/Field";
import { Notice } from "@/app/_ui/Notice";
import { guardarAliado, pausarAliado, type AliadoState } from "./actions";
import styles from "../config.module.css";

export type AliadoRow = {
  id: string;
  nombre: string;
  ciudad: string;
  estado: string;
  comision: string;
  activo: boolean;
  vinos: number;
  personas: number;
  plazo_dias: string;
  plazo_texto: string;
  razon_social: string;
  rfc: string;
  contacto_nombre: string;
  contacto_telefono: string;
  contacto_email: string;
  clabe: string;
  notas: string;
};
type Campos = Omit<AliadoRow, "id" | "activo" | "vinos" | "personas">;
const VACIO: Campos = { nombre: "", ciudad: "", estado: "", comision: "10", plazo_dias: "", plazo_texto: "", razon_social: "", rfc: "", contacto_nombre: "", contacto_telefono: "", contacto_email: "", clabe: "", notas: "" };

export function AliadosManager({ aliados }: { aliados: AliadoRow[] }) {
  const [nuevo, setNuevo] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ ok?: boolean; message?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className={styles.stack}>
      <div className={styles.listHead}>
        <p className={styles.hint}>Cada aliado es una empresa que vende en la tienda. Sus vinos se cargan en Catálogo y su gente se invita en Equipo.</p>
        {!nuevo && (
          <Button type="button" onClick={() => (setNuevo(true), setEditando(null), setAviso(null))}>
            Agregar aliado
          </Button>
        )}
      </div>
      {aviso && (aviso.message || aviso.error) && <Notice kind={aviso.error ? "error" : "ok"}>{aviso.error ?? aviso.message}</Notice>}
      {nuevo && (
        <section className={`${styles.section} ${styles.sectionStrong}`}>
          <AliadoForm onDone={(m) => (setNuevo(false), setAviso({ ok: true, message: m }))} onCancel={() => setNuevo(false)} />
        </section>
      )}
      <ul className={styles.members}>
        {aliados.map((a) =>
          editando === a.id ? (
            <li key={a.id} className={`${styles.member} ${styles.memberEditing}`}>
              <AliadoForm aliado={a} onDone={(m) => (setEditando(null), setAviso({ ok: true, message: m }))} onCancel={() => setEditando(null)} />
            </li>
          ) : (
            <li key={a.id} className={`${styles.member} ${a.activo ? "" : styles.memberOff}`}>
              <span className={styles.avatar} aria-hidden="true">
                {a.nombre.slice(0, 2).toUpperCase()}
              </span>
              <div className={styles.memberBody}>
                <p className={styles.memberName}>{a.nombre}</p>
                <p className={styles.memberMail}>{[a.ciudad, a.estado].filter(Boolean).join(", ") || "Sin ubicación"}</p>
                <p className={styles.memberMeta}>
                  <span className={styles.badge} data-estado={a.activo ? "activo" : "sin-acceso"}>
                    <span className={styles.dot} aria-hidden="true" />
                    {a.activo ? "Activo" : "En pausa"}
                  </span>
                  <span>Comisión {a.comision} %</span>
                  <span>
                    {a.vinos} {a.vinos === 1 ? "vino" : "vinos"} en la tienda
                  </span>
                  <span>
                    {a.personas} {a.personas === 1 ? "persona" : "personas"} en el panel
                  </span>
                </p>
              </div>
              <div className={styles.memberActions}>
                {confirmando === a.id ? (
                  <div className={styles.confirm} role="group" aria-label={`Confirmar: pausar a ${a.nombre}`}>
                    <span>¿Pausarlo? Sus {a.vinos} vinos y sus kits dejan de verse en la tienda.</span>
                    <button
                      type="button"
                      className={styles.danger}
                      disabled={pending}
                      onClick={() => {
                        setConfirmando(null);
                        start(async () => setAviso(await pausarAliado(a.id, false)));
                      }}
                    >
                      Sí, pausar
                    </button>
                    <button type="button" className={styles.textBtn} onClick={() => setConfirmando(null)} autoFocus>
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <button type="button" className={styles.textBtn} disabled={pending} onClick={() => (setEditando(a.id), setNuevo(false), setAviso(null))}>
                      Editar<span className="vv-sr-only"> {a.nombre}</span>
                    </button>
                    {a.activo ? (
                      <button type="button" className={`${styles.textBtn} ${styles.textDanger}`} disabled={pending} onClick={() => setConfirmando(a.id)}>
                        Pausar<span className="vv-sr-only"> {a.nombre}</span>
                      </button>
                    ) : (
                      <button type="button" className={styles.textBtn} disabled={pending} onClick={() => start(async () => setAviso(await pausarAliado(a.id, true)))}>
                        Reactivar<span className="vv-sr-only"> {a.nombre}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function AliadoForm({ aliado, onDone, onCancel }: { aliado?: AliadoRow; onDone: (message: string) => void; onCancel: () => void }) {
  // Controlados: si el servidor regresa un error, lo escrito se conserva.
  const [v, setV] = useState<Campos>(aliado ?? VACIO);
  const [state, action, saving] = useActionState<AliadoState, FormData>(async (prev, form) => {
    const r = await guardarAliado(prev, form);
    if (r.ok) onDone(r.message ?? "Listo.");
    return r;
  }, {});
  const e = state.errors ?? {};
  const f = (k: keyof Campos) => ({ name: k, value: v[k], onChange: (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((o) => ({ ...o, [k]: ev.target.value })), error: e[k] });

  return (
    <form action={action} className={styles.form} noValidate>
      <h3 className={styles.formTitle}>{aliado ? `Editar ${aliado.nombre}` : "Agregar aliado"}</h3>
      {state.error && <Notice kind="error">{state.error}</Notice>}
      {aliado && <input type="hidden" name="id" value={aliado.id} />}

      <fieldset className={styles.group}>
        <legend>Empresa</legend>
        <TextField label="Nombre de la empresa" autoComplete="organization" required autoFocus {...f("nombre")} />
        <div className={styles.twoCols}>
          <TextField label="Ciudad" optional autoComplete="address-level2" {...f("ciudad")} />
          <TextField label="Estado" optional autoComplete="address-level1" {...f("estado")} />
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend>Condiciones</legend>
        <div className={styles.twoCols}>
          <TextField label="Comisión de Viviendo Vino (%)" inputMode="decimal" required hint="Sobre el neto de cada venta. Un cambio aplica a las ventas nuevas." {...f("comision")} />
          <TextField label="Días para preparar un pedido" optional inputMode="numeric" {...f("plazo_dias")} />
        </div>
        <TextField label="Texto de entrega" optional hint="Por ejemplo: “Sale en 2 días hábiles desde Córdoba, Veracruz”." {...f("plazo_texto")} />
        <p className={styles.hint}>El envío va incluido en el precio y los kits son de 6 botellas, igual para todos los aliados.</p>
      </fieldset>

      <fieldset className={styles.group}>
        <legend>Datos privados</legend>
        <p className={styles.hint}>Solo los ve un administrador. Sirven para facturas y transferencias.</p>
        <div className={styles.twoCols}>
          <TextField label="Razón social" optional {...f("razon_social")} />
          <TextField label="RFC" optional autoCapitalize="characters" {...f("rfc")} />
          <TextField label="Nombre de contacto" optional {...f("contacto_nombre")} />
          <TextField label="Teléfono de contacto" optional type="tel" inputMode="tel" {...f("contacto_telefono")} />
          <TextField label="Correo de contacto" optional type="email" inputMode="email" {...f("contacto_email")} />
          <TextField label="CLABE para transferencias" optional inputMode="numeric" maxLength={18} hint="18 dígitos." {...f("clabe")} />
        </div>
        <TextField label="Notas" optional {...f("notas")} />
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit" loading={saving}>
          {aliado ? "Guardar cambios" : "Agregar aliado"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
