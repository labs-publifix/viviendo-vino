"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/app/_ui/Button";
import { TextField } from "@/app/_ui/Field";
import { Notice } from "@/app/_ui/Notice";
import { formatMXNExacto as formatMXN } from "@/lib/money";
import { borrarTransferencia, registrarTransferencia, type TransferenciaState } from "./actions";
import s from "./finanzas.module.css";

export type TransferenciaItem = { id: string; fecha: string; monto: number; referencia: string; nota: string };

const fechaLarga = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`)).replace(/\./g, "");

/** Lista de transferencias al aliado; el admin además registra y borra (con confirmación). */
export function Transferencias({ aliadoId, aliado, items, editable, hoy, sugerido }: { aliadoId: string; aliado: string; items: TransferenciaItem[]; editable: boolean; hoy: string; sugerido: number }) {
  const [abierto, setAbierto] = useState(false);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<TransferenciaState | null>(null);
  const [pending, start] = useTransition();

  return (
    <section className={s.card} aria-labelledby="transferencias">
      <div className={s.cardHead}>
        <h2 id="transferencias">Transferencias {editable ? `a ${aliado}` : "recibidas"}</h2>
        {editable && !abierto && (
          <Button type="button" variant="secondary" onClick={() => (setAbierto(true), setAviso(null))}>
            Registrar transferencia
          </Button>
        )}
      </div>
      {aviso && (aviso.message || aviso.error) && <Notice kind={aviso.error ? "error" : "ok"}>{aviso.error ?? aviso.message}</Notice>}
      {editable && abierto && <Formulario aliadoId={aliadoId} hoy={hoy} sugerido={sugerido} onDone={(m) => (setAbierto(false), setAviso({ ok: true, message: m }))} onCancel={() => setAbierto(false)} />}
      {items.length === 0 ? (
        <p className={s.muted}>{editable ? "Todavía no hay transferencias registradas para este aliado." : "Todavía no hay transferencias."}</p>
      ) : (
        <ul className={s.transfers}>
          {items.map((t) => (
            <li key={t.id}>
              <div className={s.tMain}>
                <strong>{formatMXN(t.monto)}</strong>
                <span>
                  {fechaLarga(t.fecha)}
                  {t.referencia ? ` · ${t.referencia}` : ""}
                </span>
                {t.nota && <span className={s.tNote}>{t.nota}</span>}
              </div>
              {editable &&
                (confirmando === t.id ? (
                  <div className={s.confirm} role="group" aria-label="Confirmar: borrar transferencia">
                    <span>¿Borrarla?</span>
                    <button
                      type="button"
                      className={s.danger}
                      disabled={pending}
                      onClick={() => {
                        setConfirmando(null);
                        start(async () => setAviso(await borrarTransferencia(t.id)));
                      }}
                    >
                      Sí, borrar
                    </button>
                    <button type="button" className={s.textBtn} onClick={() => setConfirmando(null)} autoFocus>
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button type="button" className={`${s.textBtn} ${s.textDanger}`} disabled={pending} onClick={() => setConfirmando(t.id)}>
                    Borrar<span className="vv-sr-only"> transferencia de {formatMXN(t.monto)}</span>
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Formulario({ aliadoId, hoy, sugerido, onDone, onCancel }: { aliadoId: string; hoy: string; sugerido: number; onDone: (m: string) => void; onCancel: () => void }) {
  const [v, setV] = useState({ monto: sugerido > 0 ? (sugerido / 100).toFixed(2) : "", fecha: hoy, referencia: "", nota: "" });
  const [state, action, saving] = useActionState<TransferenciaState, FormData>(async (prev, form) => {
    const r = await registrarTransferencia(prev, form);
    if (r.ok) onDone(r.message ?? "Listo.");
    return r;
  }, {});
  const e = state.errors ?? {};
  const f = (k: keyof typeof v) => ({ name: k, value: v[k], onChange: (ev: React.ChangeEvent<HTMLInputElement>) => setV((o) => ({ ...o, [k]: ev.target.value })), error: e[k] });
  return (
    <form action={action} className={s.form} noValidate>
      {state.error && <Notice kind="error">{state.error}</Notice>}
      <input type="hidden" name="aliado_id" value={aliadoId} />
      <div className={s.twoCols}>
        <TextField label="Monto (MXN)" inputMode="decimal" required autoFocus hint={sugerido > 0 ? "Sugerido: el saldo por transferir." : undefined} {...f("monto")} />
        <TextField label="Fecha" type="date" max={hoy} required {...f("fecha")} />
        <TextField label="Referencia" optional hint="Clave de rastreo SPEI o folio del banco." {...f("referencia")} />
        <TextField label="Nota" optional maxLength={300} {...f("nota")} />
      </div>
      <div className={s.row}>
        <Button type="submit" loading={saving}>
          Registrar transferencia
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
