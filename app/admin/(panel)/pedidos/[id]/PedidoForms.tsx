"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/app/_ui/Button";
import { TextField } from "@/app/_ui/Field";
import { Notice } from "@/app/_ui/Notice";
import { ACCION_LABEL, PAQUETERIAS, type AccionPedido } from "@/lib/admin/pedidos-rules";
import { Select } from "../../_ui/Select";
import type { TipoCorreo } from "@/lib/email/tipos";
import { agregarNota, moverPedido, reenviarCorreo, type PedidoState } from "../actions";
import s from "../pedidos.module.css";

// Siguiente paso del pedido. Avanzar es un botón; enviar pide paquetería y guía; cancelar pide el motivo y
// una segunda confirmación. El servidor vuelve a revisar todo (moverPedido).

const AYUDA: Partial<Record<AccionPedido, string>> = {
  preparar: "Avísale al equipo que ya se está armando la caja.",
  entregar: "Cuando la paquetería confirme la entrega.",
  marcar_pagado: "Solo para pedidos de prueba: simula el pago aprobado.",
};

export function Acciones({ id, acciones }: { id: string; acciones: AccionPedido[] }) {
  const [state, action, pending] = useActionState<PedidoState, FormData>(moverPedido, {});
  const [abierta, setAbierta] = useState<AccionPedido | null>(null);
  const [paqueteria, setPaqueteria] = useState("");
  const [guia, setGuia] = useState("");
  const [motivo, setMotivo] = useState("");
  const e = state.errors ?? {};
  const avanzar = acciones.filter((a) => a !== "cancelar");

  return (
    <div className={s.actions}>
      {state.ok && state.message && <Notice kind="ok">{state.message}</Notice>}
      {state.error && <Notice kind="error">{state.error}</Notice>}

      {avanzar.map((a) =>
        a === "enviar" ? (
          <form key={a} action={action} className={s.actionForm} noValidate>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="accion" value="enviar" />
            <Select label="Paquetería" name="paqueteria" value={paqueteria} onChange={setPaqueteria} options={PAQUETERIAS.map((x) => ({ value: x, label: x }))} placeholder="Elige la paquetería" error={e.paqueteria} />
            <TextField label="Número de guía" name="guia" value={guia} onChange={(ev) => setGuia(ev.target.value)} autoCapitalize="characters" autoComplete="off" spellCheck={false} error={e.guia} />
            <Button type="submit" block loading={pending}>
              {ACCION_LABEL.enviar}
            </Button>
          </form>
        ) : (
          <form key={a} action={action} className={s.actionForm}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="accion" value={a} />
            <Button type="submit" block loading={pending}>
              {ACCION_LABEL[a]}
            </Button>
            {AYUDA[a] && <p className={s.help}>{AYUDA[a]}</p>}
          </form>
        ),
      )}

      {acciones.includes("cancelar") &&
        (abierta === "cancelar" ? (
          <form action={action} className={`${s.actionForm} ${s.cancelForm}`} noValidate>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="accion" value="cancelar" />
            <TextField label="¿Por qué se cancela?" name="motivo" value={motivo} onChange={(ev) => setMotivo(ev.target.value)} hint="Queda en el historial. Si ya se pagó, recuerda hacer la devolución." error={e.motivo} autoFocus />
            <div className={s.row}>
              <button type="submit" className={s.danger} disabled={pending}>
                Sí, cancelar pedido
              </button>
              <button type="button" className={s.textBtn} onClick={() => setAbierta(null)}>
                No, regresar
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className={`${s.textBtn} ${s.textDanger}`} onClick={() => setAbierta("cancelar")}>
            Cancelar pedido
          </button>
        ))}
    </div>
  );
}

export function NotaForm({ id }: { id: string }) {
  const [nota, setNota] = useState("");
  const [state, action, pending] = useActionState<PedidoState, FormData>(async (prev, form) => {
    const r = await agregarNota(prev, form);
    if (r.ok) setNota("");
    return r;
  }, {});
  return (
    <form action={action} className={s.notaForm} noValidate>
      <input type="hidden" name="id" value={id} />
      <TextField label="Agregar una nota" name="nota" value={nota} onChange={(ev) => setNota(ev.target.value)} hint="La ve todo el equipo que puede ver este pedido." maxLength={300} error={state.errors?.nota} />
      {state.error && <Notice kind="error">{state.error}</Notice>}
      <Button type="submit" variant="secondary" loading={pending}>
        Guardar nota
      </Button>
    </form>
  );
}

/** Reenviar al cliente un correo de su pedido (en el historial). Si falló, el botón se destaca. */
export function Reenviar({ id, tipo, fallo }: { id: string; tipo: TipoCorreo; fallo: boolean }) {
  const [pending, start] = useTransition();
  const [r, setR] = useState<PedidoState | null>(null);
  if (r?.ok) return <p className={s.evOk}>{r.message}</p>;
  return (
    <div className={s.resend}>
      <button type="button" className={fallo ? s.danger : s.textBtn} disabled={pending} onClick={() => start(async () => setR(await reenviarCorreo(id, tipo)))}>
        {pending ? "Reenviando…" : fallo ? "Reintentar envío" : "Reenviar al cliente"}
      </button>
      {r?.error && <p className={s.evErr}>{r.error}</p>}
    </div>
  );
}
