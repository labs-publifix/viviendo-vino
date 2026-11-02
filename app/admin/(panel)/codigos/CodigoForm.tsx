"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/app/_ui/Button";
import { Checkbox, TextField } from "@/app/_ui/Field";
import { Icon } from "@/app/_ui/Icon";
import { Notice } from "@/app/_ui/Notice";
import { comisionMPEstimada } from "@/lib/admin/pedidos-rules";
import { aplicarDescuento, generarCodigo, normalizarCodigo, type TipoCodigo } from "@/lib/descuentos/rules";
import { formatMXN } from "@/lib/money";
import { cambiarActivoCodigo, guardarCodigo, type CodigoState } from "./actions";
import styles from "../catalogo/catalogo.module.css";
import c from "./codigos.module.css";
import { Select } from "../_ui/Select";

// Crear o editar un código de descuento. A la derecha, el efecto en el margen con los kits prearmados de hoy: el
// descuento sale del margen de Viviendo Vino y el servidor nunca baja de "acordado + comisión de Mercado Pago".

export type CodigoDatosForm = {
  id?: string;
  codigo: string;
  descripcion: string;
  texto_publico: string;
  tipo: TipoCodigo;
  valor: string;
  tope: string;
  inicia: string;
  termina: string;
  usos_max: string;
  usos_por_cliente: string;
  min_kits: string;
  solo_primera_compra: boolean;
  activo: boolean;
  /** Ya hay pedidos con este código: tipo, valor y tope quedan fijos. */
  usado: boolean;
};

type Kit = { nombre: string; subtotal: number; aliado: number };

const TIPO_LABEL: Record<TipoCodigo, string> = { porcentaje: "Porcentaje (%)", monto: "Monto fijo ($)" };

function valorNumerico(tipo: TipoCodigo, valor: string, tope: string) {
  const n = Number(valor.replace(/[$%\s,]/g, ""));
  const t = Number(tope.replace(/[$\s,]/g, ""));
  if (!(n > 0)) return null;
  return tipo === "porcentaje" ? { tipo, valor: Math.round(n * 100), topeCentavos: t > 0 ? Math.round(t * 100) : null } : { tipo, valor: Math.round(n * 100), topeCentavos: null };
}

export function CodigoForm({ codigo, kits, siteUrl }: { codigo: CodigoDatosForm; kits: Kit[]; siteUrl: string }) {
  const [state, action, pending] = useActionState<CodigoState, FormData>(guardarCodigo, {});
  const [v, setV] = useState(codigo);
  const [copiado, setCopiado] = useState(false);
  const [estado, setEstado] = useState<CodigoState>({});
  const [cambiando, start] = useTransition();
  const e = state.errors ?? {};
  const nuevo = !codigo.id;
  const set = (k: keyof CodigoDatosForm) => (ev: { target: { value: string } }) => setV((o) => ({ ...o, [k]: ev.target.value }));
  const num = valorNumerico(v.tipo, v.valor, v.tope);
  const enlace = `${siteUrl}/?codigo=${encodeURIComponent(normalizarCodigo(v.codigo) || "CODIGO")}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };
  const alternar = () =>
    start(async () => {
      const r = await cambiarActivoCodigo(codigo.id!, !v.activo);
      setEstado(r);
      if (r.ok) setV((o) => ({ ...o, activo: !o.activo }));
    });

  return (
    <form action={action} className={styles.form} noValidate>
      <div className={styles.formHead}>
        <Link href="/admin/codigos" className={styles.back}>
          <Icon name="arrow" size={16} /> Códigos de descuento
        </Link>
        <h2 className={styles.formTitle}>{nuevo ? "Nuevo código" : codigo.codigo}</h2>
      </div>
      {state.ok && state.message && <Notice kind="ok">{state.message}</Notice>}
      {(estado.message || estado.error) && <Notice kind={estado.ok ? "ok" : "error"}>{estado.message ?? estado.error}</Notice>}
      {state.error && <Notice kind="error">{state.error}</Notice>}
      {Object.keys(e).length > 0 && <Notice kind="error">Revisa los campos marcados.</Notice>}
      {codigo.id && <input type="hidden" name="id" value={codigo.id} />}

      <div className={styles.formGrid}>
        <div className={styles.formMain}>
          <section className={styles.card}>
            <h3>Código</h3>
            {nuevo ? (
              <div className={styles.inline}>
                <TextField name="codigo" label="Código" hint="Letras y números, sin espacios (por ejemplo VERANO10). Sin distinguir mayúsculas." value={v.codigo} onChange={set("codigo")} autoCapitalize="characters" spellCheck={false} maxLength={24} required error={e.codigo} />
                <Button type="button" variant="secondary" onClick={() => setV((o) => ({ ...o, codigo: generarCodigo("VV") }))}>
                  Generar
                </Button>
              </div>
            ) : (
              <p className={c.codigoFijo}>
                <strong>{codigo.codigo}</strong> <span>El código no cambia: puede estar en enlaces y en pedidos.</span>
              </p>
            )}
            <TextField name="texto_publico" label="Condiciones que ve el cliente" hint="Corto y claro, por ejemplo: “10 % en tu compra hasta el 30 de noviembre”." value={v.texto_publico} onChange={set("texto_publico")} maxLength={160} required error={e.texto_publico} />
            <TextField name="descripcion" label="Nota interna" optional hint="Para qué campaña es. No la ve el cliente." value={v.descripcion} onChange={set("descripcion")} maxLength={200} error={e.descripcion} />
          </section>

          <section className={styles.card}>
            <h3>Descuento</h3>
            {codigo.usado && <Notice kind="info">Este código ya se usó: el tipo, el valor y el tope quedan fijos. Para otro valor, duplícalo.</Notice>}
            <div className={styles.twoCols}>
              <Select name="tipo" label="Tipo" value={v.tipo} onChange={(x) => setV((o) => ({ ...o, tipo: x as TipoCodigo }))} options={(["porcentaje", "monto"] as const).map((t) => ({ value: t, label: TIPO_LABEL[t] }))} disabled={codigo.usado} error={e.tipo} />
              <TextField name="valor" label={v.tipo === "porcentaje" ? "Porcentaje" : "Monto por pedido (MXN)"} inputMode="decimal" value={v.valor} onChange={set("valor")} readOnly={codigo.usado} required error={e.valor} />
              {v.tipo === "porcentaje" && (
                <TextField name="tope" label="Tope de descuento (MXN)" optional hint="Lo máximo que descuenta por pedido." inputMode="decimal" value={v.tope} onChange={set("tope")} readOnly={codigo.usado} error={e.tope} />
              )}
            </div>
          </section>

          <section className={styles.card}>
            <h3>Reglas</h3>
            <div className={styles.twoCols}>
              <TextField name="inicia" type="datetime-local" label="Desde (hora de CDMX)" hint="Vacío: desde ahora." value={v.inicia} onChange={set("inicia")} error={e.inicia} />
              <TextField name="termina" type="datetime-local" label="Hasta (hora de CDMX)" optional hint="Vacío: sin fecha de fin." value={v.termina} onChange={set("termina")} error={e.termina} />
              <TextField name="usos_max" label="Usos totales" optional hint="Vacío: sin límite." inputMode="numeric" value={v.usos_max} onChange={set("usos_max")} error={e.usos_max} />
              <TextField name="usos_por_cliente" label="Usos por cliente" optional hint="Se cuenta por correo. Vacío: sin límite." inputMode="numeric" value={v.usos_por_cliente} onChange={set("usos_por_cliente")} error={e.usos_por_cliente} />
              <TextField name="min_kits" label="Compra mínima (kits)" optional hint="Vacío: desde 1 kit." inputMode="numeric" value={v.min_kits} onChange={set("min_kits")} error={e.min_kits} />
            </div>
            <Checkbox name="solo_primera_compra" label="Solo en la primera compra de cada cliente" checked={v.solo_primera_compra} onChange={(ev) => setV((o) => ({ ...o, solo_primera_compra: ev.target.checked }))} />
            <Checkbox name="activo" label="Activo (se puede usar en la tienda)" checked={v.activo} onChange={(ev) => setV((o) => ({ ...o, activo: ev.target.checked }))} />
          </section>
        </div>

        <aside className={styles.formSide}>
          <section className={styles.card} aria-labelledby="ejemplo-titulo">
            <h3 id="ejemplo-titulo">Así queda tu margen</h3>
            <p className={styles.hint}>Con los kits prearmados de hoy. El descuento sale de tu margen; el aliado recibe lo mismo.</p>
            {!num ? (
              <p className={styles.hint}>Escribe el valor del descuento para ver el ejemplo.</p>
            ) : kits.length === 0 ? (
              <p className={styles.hint}>No hay kits prearmados con precio acordado para el ejemplo.</p>
            ) : (
              <ul className={c.ejemplos}>
                {kits.map((k) => {
                  const r = aplicarDescuento(num, k.subtotal, k.aliado);
                  const total = k.subtotal - r.descuento;
                  const neto = total - k.aliado - comisionMPEstimada(total);
                  return (
                    <li key={k.nombre} data-recortado={r.recortado || undefined}>
                      <b>{k.nombre}</b>
                      <span>
                        {formatMXN(k.subtotal)} → <strong>{formatMXN(total)}</strong> (−{formatMXN(r.descuento)})
                      </span>
                      <span>
                        Margen neto {neto < 0 ? `−${formatMXN(-neto)}` : formatMXN(neto)} · {total > 0 ? Math.round((neto * 100) / total) : 0} %
                      </span>
                      {r.recortado && (
                        <small>
                          {r.descuento === 0 ? "Sin margen para descontar: este kit no recibe descuento." : `Se recorta a ${formatMXN(r.descuento)} para no perder dinero.`}
                        </small>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={styles.card} aria-labelledby="enlace-titulo">
            <h3 id="enlace-titulo">Enlace de campaña</h3>
            <p className={c.enlace}>{enlace}</p>
            <p className={styles.hint}>Quien entra con este enlace llega con el código listo para aplicar en el checkout.</p>
            <Button type="button" variant="secondary" onClick={copiar} disabled={!normalizarCodigo(v.codigo)}>
              {copiado ? "¡Copiado!" : "Copiar enlace"}
            </Button>
          </section>

          {codigo.id && (
            <section className={styles.card}>
              <h3>{v.activo ? "Pausar" : "Reactivar"}</h3>
              <p className={styles.hint}>{v.activo ? "Deja de funcionar al momento. Los pedidos que ya lo usaron no cambian." : "Vuelve a funcionar con las mismas reglas."}</p>
              <Button type="button" variant="secondary" onClick={alternar} loading={cambiando}>
                {v.activo ? "Pausar código" : "Reactivar código"}
              </Button>
              <Link href={`/admin/codigos/nuevo?desde=${codigo.id}`} className={c.link}>
                Duplicar con otro valor
              </Link>
            </section>
          )}
        </aside>
      </div>

      <div className={styles.saveBar}>
        <Button type="submit" loading={pending}>
          {nuevo ? "Crear código" : "Guardar cambios"}
        </Button>
        <Link href="/admin/codigos" className={c.link}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
