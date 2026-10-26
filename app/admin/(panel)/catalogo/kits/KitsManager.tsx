"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/app/_ui/Button";
import { Checkbox, SelectField, TextField } from "@/app/_ui/Field";
import { Icon } from "@/app/_ui/Icon";
import { Notice } from "@/app/_ui/Notice";
import type { KitPanel } from "@/lib/admin/catalogo";
import { KIT_BOTELLAS, pesos } from "@/lib/admin/catalogo-rules";
import { guardarKit, type KitState } from "../actions";
import styles from "../catalogo.module.css";

type Vino = { id: string; nombre: string; grupoId: string; aliadoId: string; precioCentavos: number; activo: boolean; disponible: boolean };
type Grupo = { id: string; nombre: string; aliadoId: string };

export function KitsManager({ kits, vinos, grupos, aliados }: { kits: KitPanel[]; vinos: Vino[]; grupos: Grupo[]; aliados: { id: string; nombre: string }[] }) {
  const [editando, setEditando] = useState<string | "nuevo" | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const porId = useMemo(() => new Map(vinos.map((v) => [v.id, v])), [vinos]);
  const grupoDe = (k: KitPanel) => grupos.find((g) => g.id === porId.get(k.items[0]?.productoId ?? "")?.grupoId);

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <p className={styles.hint}>Kits de {KIT_BOTELLAS} botellas del mismo grupo, listos para agregar al carrito. El precio es la suma de sus botellas.</p>
        {editando !== "nuevo" && (
          <Button type="button" onClick={() => (setEditando("nuevo"), setAviso(null))}>
            Agregar kit
          </Button>
        )}
      </div>
      {aviso && <Notice kind="ok">{aviso}</Notice>}
      {editando === "nuevo" && (
        <div className={`${styles.card} ${styles.cardStrong}`}>
          <KitForm vinos={vinos} grupos={grupos} aliados={aliados} onDone={(m) => (setEditando(null), setAviso(m))} onCancel={() => setEditando(null)} />
        </div>
      )}
      <ul className={styles.kits}>
        {kits.map((k) => {
          const total = k.items.reduce((s, i) => s + i.cantidad * (porId.get(i.productoId)?.precioCentavos ?? 0), 0);
          const agotado = k.items.some((i) => !porId.get(i.productoId)?.disponible);
          const oculto = !k.activo || k.items.some((i) => !porId.get(i.productoId)?.activo);
          return (
            <li key={k.id} className={`${styles.card} ${editando === k.id ? styles.cardStrong : ""}`}>
              {editando === k.id ? (
                <KitForm kit={k} vinos={vinos} grupos={grupos} aliados={aliados} onDone={(m) => (setEditando(null), setAviso(m))} onCancel={() => setEditando(null)} />
              ) : (
                <div className={styles.kit}>
                  <div className={styles.kitHead}>
                    <div>
                      <h3>{k.nombre}</h3>
                      <p className={styles.meta}>
                        {grupoDe(k)?.nombre ?? "Sin grupo"} · {pesos(total)}
                      </p>
                    </div>
                    <span className={styles.status} data-tono={oculto ? "muted" : agotado ? "aviso" : "ok"}>
                      <span aria-hidden="true" />
                      {oculto ? "Oculto en la tienda" : agotado ? "Con una botella agotada" : "Visible"}
                    </span>
                  </div>
                  {k.descripcion && <p className={styles.kitDesc}>{k.descripcion}</p>}
                  <ul className={styles.kitItems}>
                    {k.items.map((i) => (
                      <li key={i.productoId}>
                        <strong>{i.cantidad}×</strong> {porId.get(i.productoId)?.nombre ?? "Vino eliminado"}
                      </li>
                    ))}
                  </ul>
                  <div>
                    <button type="button" className={styles.edit} onClick={() => (setEditando(k.id), setAviso(null))}>
                      Editar<span className="vv-sr-only"> {k.nombre}</span>
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function KitForm({ kit, vinos, grupos, aliados, onDone, onCancel }: { kit?: KitPanel; vinos: Vino[]; grupos: Grupo[]; aliados: { id: string; nombre: string }[]; onDone: (m: string) => void; onCancel: () => void }) {
  const porId = new Map(vinos.map((v) => [v.id, v]));
  const [aliadoId, setAliadoId] = useState(kit?.aliadoId ?? (aliados.find((a) => grupos.some((g) => g.aliadoId === a.id)) ?? aliados[0])?.id ?? "");
  const [grupoId, setGrupoId] = useState(porId.get(kit?.items[0]?.productoId ?? "")?.grupoId ?? "");
  const [nombre, setNombre] = useState(kit?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(kit?.descripcion ?? "");
  const [activo, setActivo] = useState(kit?.activo ?? true);
  const [cant, setCant] = useState<Record<string, number>>(Object.fromEntries((kit?.items ?? []).map((i) => [i.productoId, i.cantidad])));
  const [state, action, saving] = useActionState<KitState, FormData>(async (prev, form) => {
    const r = await guardarKit(prev, form);
    if (r.ok) onDone(r.message ?? "Listo.");
    return r;
  }, {});
  const e = state.errors ?? {};
  const delGrupo = vinos.filter((v) => v.grupoId === grupoId && v.aliadoId === aliadoId && v.activo);
  const total = delGrupo.reduce((s, v) => s + (cant[v.id] ?? 0), 0);
  const precio = delGrupo.reduce((s, v) => s + (cant[v.id] ?? 0) * v.precioCentavos, 0);
  const items = delGrupo.filter((v) => (cant[v.id] ?? 0) > 0).map((v) => ({ productoId: v.id, cantidad: cant[v.id] }));
  const mover = (id: string, d: number) => setCant((c) => ({ ...c, [id]: Math.max(0, Math.min(KIT_BOTELLAS, (c[id] ?? 0) + d)) }));

  return (
    <form action={action} className={styles.form} noValidate>
      <h3 className={styles.formTitle}>{kit ? `Editar ${kit.nombre}` : "Agregar kit"}</h3>
      {state.error && <Notice kind="error">{state.error}</Notice>}
      {kit && <input type="hidden" name="id" value={kit.id} />}
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      {!kit && aliados.length > 1 && (
        <SelectField name="aliado_id" label="Aliado" value={aliadoId} onChange={(ev) => (setAliadoId(ev.target.value), setGrupoId(""), setCant({}))}>
          {aliados.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </SelectField>
      )}
      {!kit && aliados.length <= 1 && <input type="hidden" name="aliado_id" value={aliadoId} />}
      <div className={styles.twoCols}>
        <TextField name="nombre" label="Nombre del kit" value={nombre} onChange={(ev) => setNombre(ev.target.value)} required error={e.nombre} />
        <SelectField label="Grupo" value={grupoId} onChange={(ev) => (setGrupoId(ev.target.value), setCant({}))} hint="Un kit lleva vinos de un solo grupo.">
          <option value="">Elige el grupo</option>
          {grupos
            .filter((g) => g.aliadoId === aliadoId)
            .map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
        </SelectField>
      </div>
      <TextField name="descripcion" label="Descripción" optional value={descripcion} onChange={(ev) => setDescripcion(ev.target.value)} error={e.descripcion} />

      {grupoId && (
        <fieldset className={styles.picker}>
          <legend>
            Botellas <span className={total === KIT_BOTELLAS ? styles.okCount : styles.count}>{total} de {KIT_BOTELLAS}</span>
            <span className={styles.pickerTotal}>{pesos(precio)}</span>
          </legend>
          <ul>
            {delGrupo.map((v) => (
              <li key={v.id}>
                <span className={styles.pickName}>
                  {v.nombre}
                  <small>
                    {pesos(v.precioCentavos)}
                    {!v.disponible && " · agotado"}
                  </small>
                </span>
                <span className={styles.stepper}>
                  <button type="button" onClick={() => mover(v.id, -1)} disabled={!cant[v.id]} aria-label={`Quitar una de ${v.nombre}`}>
                    <Icon name="minus" size={16} />
                  </button>
                  <output aria-live="polite">{cant[v.id] ?? 0}</output>
                  <button type="button" onClick={() => mover(v.id, 1)} disabled={total >= KIT_BOTELLAS} aria-label={`Agregar una de ${v.nombre}`}>
                    <Icon name="plus" size={16} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {e.items && <p className={styles.err}>{e.items}</p>}
        </fieldset>
      )}
      <Checkbox name="activo" label="Mostrar en la tienda" checked={activo} onChange={(ev) => setActivo(ev.target.checked)} />
      <div className={styles.actions}>
        <Button type="submit" loading={saving} disabled={total !== KIT_BOTELLAS}>
          {kit ? "Guardar kit" : "Agregar kit"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
