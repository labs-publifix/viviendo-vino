"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/app/_ui/Button";
import { Checkbox, SelectField, TextField } from "@/app/_ui/Field";
import { Icon } from "@/app/_ui/Icon";
import { Notice } from "@/app/_ui/Notice";
import { centavosATexto, pesos, precioACentavos, TIPOS } from "@/lib/admin/catalogo-rules";
import { guardarVino, type VinoState } from "../actions";
import styles from "../catalogo.module.css";

export type VinoDatos = {
  id?: string;
  slug?: string;
  aliadoId: string;
  nombre_oficial: string;
  productor: string;
  categoria_slug: string;
  grupo_id: string;
  tipo: string;
  uva: string;
  region: string;
  denominacion: string;
  anada: string;
  volumen_ml: string;
  grado_alcohol: string;
  precioCentavos: number | null;
  premio: string;
  descripcion: string;
  descripcion_aliado: string;
  imagen: string | null;
  activo: boolean;
  kits: string[];
};
type Opcion = { id: string; nombre: string; aliadoId?: string };

const TIPO_LABEL: Record<string, string> = { blanco: "Blanco", rosado: "Rosado", tinto: "Tinto", espumoso: "Espumoso" };
// Mismo formato que las 19 fotos actuales de la tienda.
const FOTO_W = 880;
const FOTO_H = 1184;

/** Recorta al centro a 880×1184 y la convierte a WebP (o JPG si el navegador no sabe WebP). */
async function prepararFoto(file: File): Promise<File> {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = FOTO_W;
  canvas.height = FOTO_H;
  const ctx = canvas.getContext("2d")!;
  const escala = Math.max(FOTO_W / bmp.width, FOTO_H / bmp.height);
  const w = bmp.width * escala;
  const h = bmp.height * escala;
  ctx.drawImage(bmp, (FOTO_W - w) / 2, (FOTO_H - h) / 2, w, h);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.86));
  const final = blob && blob.type === "image/webp" ? blob : await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.88));
  if (!final) throw new Error("No se pudo preparar la foto.");
  return new File([final], final.type === "image/webp" ? "foto.webp" : "foto.jpg", { type: final.type });
}

export function VinoForm({ vino, categorias, grupos, aliados }: { vino: VinoDatos; categorias: { slug: string; nombre: string }[]; grupos: Opcion[]; aliados: Opcion[] }) {
  const router = useRouter();
  const nuevo = !vino.id;
  const [v, setV] = useState({ ...vino, precio: vino.precioCentavos ? centavosATexto(vino.precioCentavos) : "" });
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(vino.imagen);
  const [fotoError, setFotoError] = useState<string | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [state, action, saving] = useActionState<VinoState, FormData>(async (prev, form) => {
    if (foto) form.set("foto", foto);
    const r = await guardarVino(prev, form);
    if (r.ok && nuevo && r.id) router.replace(`/admin/catalogo/vinos/${r.id}?guardado=1`);
    if (r.ok) setFoto(null);
    return r;
  }, {});
  useEffect(() => () => void (preview?.startsWith("blob:") && URL.revokeObjectURL(preview)), [preview]);

  const e = state.errors ?? {};
  const set = (k: string) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((o) => ({ ...o, [k]: ev.target.value }));
  const gruposAliado = grupos.filter((g) => g.aliadoId === v.aliadoId);
  const precioNuevo = precioACentavos(v.precio);
  const cambioPrecio = !nuevo && vino.precioCentavos !== null && precioNuevo !== null && precioNuevo !== vino.precioCentavos;

  return (
    <form action={action} className={styles.form} noValidate>
      <div className={styles.formHead}>
        <Link href="/admin/catalogo/vinos" className={styles.back}>
          <Icon name="arrow" size={16} /> Vinos
        </Link>
        <h2 className={styles.formTitle}>{nuevo ? "Agregar vino" : vino.nombre_oficial}</h2>
      </div>
      {state.ok && state.message && <Notice kind="ok">{state.message}</Notice>}
      {state.error && <Notice kind="error">{state.error}</Notice>}
      {Object.keys(e).length > 0 && <Notice kind="error">Revisa los campos marcados.</Notice>}
      {vino.id && <input type="hidden" name="id" value={vino.id} />}

      <div className={styles.formGrid}>
        <div className={styles.formMain}>
          <section className={styles.card}>
            <h3>Datos del vino</h3>
            {nuevo && aliados.length > 1 && (
              <SelectField name="aliado_id" label="Aliado" value={v.aliadoId} onChange={(ev) => setV((o) => ({ ...o, aliadoId: ev.target.value, grupo_id: "" }))} error={e.aliado_id}>
                {aliados.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </SelectField>
            )}
            {nuevo && aliados.length <= 1 && <input type="hidden" name="aliado_id" value={v.aliadoId} />}
            {gruposAliado.length === 0 && (
              <Notice kind="aviso">Este aliado todavía no tiene grupos de botellas. Pide que los demos de alta para poder cargar sus vinos.</Notice>
            )}
            <TextField name="nombre_oficial" label="Nombre (como en la etiqueta)" value={v.nombre_oficial} onChange={set("nombre_oficial")} required error={e.nombre_oficial} />
            <div className={styles.twoCols}>
              <TextField name="productor" label="Productor" value={v.productor} onChange={set("productor")} required error={e.productor} />
              <SelectField name="tipo" label="Tipo" value={v.tipo} onChange={set("tipo")} error={e.tipo}>
                <option value="">Elige</option>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </option>
                ))}
              </SelectField>
              <SelectField name="categoria_slug" label="Categoría" value={v.categoria_slug} onChange={set("categoria_slug")} error={e.categoria_slug}>
                <option value="">Elige</option>
                {categorias.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.nombre}
                  </option>
                ))}
              </SelectField>
              <SelectField
                name="grupo_id"
                label="Grupo"
                value={v.grupo_id}
                onChange={set("grupo_id")}
                error={e.grupo_id}
                hint={vino.kits.length ? `Está en ${vino.kits.join(", ")}; para cambiarlo de grupo, quítalo antes del kit.` : "Solo se mezclan en un kit los vinos del mismo grupo."}
              >
                <option value="">Elige</option>
                {gruposAliado.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </SelectField>
              <TextField name="uva" label="Uva" optional value={v.uva} onChange={set("uva")} error={e.uva} />
              <TextField name="region" label="Región" optional value={v.region} onChange={set("region")} error={e.region} />
              <TextField name="denominacion" label="Denominación" optional value={v.denominacion} onChange={set("denominacion")} hint="DOC, DOCG, IGT…" error={e.denominacion} />
              <TextField name="anada" label="Añada" optional inputMode="numeric" maxLength={4} value={v.anada} onChange={set("anada")} error={e.anada} />
              <TextField name="volumen_ml" label="Volumen (ml)" inputMode="numeric" value={v.volumen_ml} onChange={set("volumen_ml")} error={e.volumen_ml} />
              <TextField name="grado_alcohol" label="Alcohol (%)" optional inputMode="decimal" value={v.grado_alcohol} onChange={set("grado_alcohol")} error={e.grado_alcohol} />
            </div>
            <TextField name="premio" label="Premio" optional value={v.premio} onChange={set("premio")} hint="Solo premios confirmados, con concurso y año." error={e.premio} />
          </section>

          <section className={styles.card}>
            <h3>Textos</h3>
            <label className={styles.textarea}>
              <span>Descripción para la tienda</span>
              <textarea name="descripcion" rows={4} value={v.descripcion} onChange={set("descripcion")} aria-invalid={e.descripcion ? true : undefined} />
              <small className={e.descripcion ? styles.err : undefined}>{e.descripcion ?? `${v.descripcion.length} de 600 caracteres. Un dato y una opinión, en voz de marca.`}</small>
            </label>
            <label className={styles.textarea}>
              <span>
                Texto del aliado <em>(interno, no se publica)</em>
              </span>
              <textarea name="descripcion_aliado" rows={3} value={v.descripcion_aliado} onChange={set("descripcion_aliado")} />
              {e.descripcion_aliado && <small className={styles.err}>{e.descripcion_aliado}</small>}
            </label>
          </section>
        </div>

        <aside className={styles.formSide}>
          <section className={styles.card}>
            <h3>Precio</h3>
            <TextField name="precio" label="Precio por botella (MXN)" inputMode="decimal" value={v.precio} onChange={set("precio")} required error={e.precio} hint="Con envío incluido. Un kit de 6 suma 6 botellas." />
            {precioNuevo && (
              <p className={styles.small}>
                Kit de 6 de este vino: <strong>{pesos(precioNuevo * 6)}</strong>
              </p>
            )}
            {cambioPrecio && (
              <Notice kind="aviso">
                Antes {pesos(vino.precioCentavos!)}. {vino.kits.length ? `También cambia el total de ${vino.kits.join(", ")}.` : ""} Las personas que ya tienen este vino en su carrito verán el precio nuevo.
              </Notice>
            )}
          </section>

          <section className={styles.card}>
            <h3>Foto</h3>
            <div className={styles.photo}>
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- vista previa local o del almacenamiento
                <img src={preview} alt="Vista previa de la foto" width={FOTO_W} height={FOTO_H} />
              ) : (
                <span>Sin foto: la tienda muestra la silueta de la botella.</span>
              )}
            </div>
            <label className={styles.file}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={async (ev) => {
                  const f = ev.target.files?.[0];
                  setFotoError(null);
                  if (!f) return;
                  setPreparando(true);
                  try {
                    const lista = await prepararFoto(f);
                    setFoto(lista);
                    setPreview(URL.createObjectURL(lista));
                  } catch {
                    setFotoError("No pudimos leer esa imagen. Prueba con un JPG o PNG.");
                  } finally {
                    setPreparando(false);
                  }
                }}
              />
              <span>{preparando ? "Preparando foto…" : preview ? "Cambiar foto" : "Subir foto"}</span>
            </label>
            <p className={styles.small}>Vertical, botella al centro. La recortamos a 880 × 1184 como las demás.</p>
            {(fotoError || e.foto) && <p className={styles.err}>{fotoError ?? e.foto}</p>}
            {foto && <p className={styles.small}>La foto nueva se guarda al guardar los cambios.</p>}
          </section>

          <section className={styles.card}>
            <h3>En la tienda</h3>
            <Checkbox name="activo" label="Mostrar en la tienda" checked={v.activo} onChange={(ev) => setV((o) => ({ ...o, activo: ev.target.checked }))} hint="Si lo apagas, el vino deja de verse y no se puede comprar." />
            {vino.kits.length > 0 && <p className={styles.small}>Está en: {vino.kits.join(", ")}. Si lo ocultas, esos kits dejan de verse.</p>}
            {vino.slug && (
              <a href={`/vinos/${vino.slug}`} target="_blank" rel="noopener noreferrer" className={styles.storeLink}>
                Ver en la tienda <Icon name="arrow" size={14} />
              </a>
            )}
          </section>
        </aside>
      </div>

      <div className={styles.saveBar}>
        <Button type="submit" size="lg" loading={saving} disabled={preparando}>
          {nuevo ? "Agregar vino" : "Guardar cambios"}
        </Button>
        <Link href="/admin/catalogo/vinos" className={styles.cancel}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
