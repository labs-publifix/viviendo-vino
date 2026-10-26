"use client";

import { useActionState, useState, useTransition } from "react";
import { AnnouncementBar } from "@/app/_ui/AnnouncementBar";
import { Button } from "@/app/_ui/Button";
import { TextField } from "@/app/_ui/Field";
import { Icon } from "@/app/_ui/Icon";
import { Notice } from "@/app/_ui/Notice";
import { TEXTO_MAX, type Anuncio, type AnuncioPublico, type Estado } from "@/lib/anuncios";
import { deleteAnuncio, moveAnuncio, saveAnuncio, toggleAnuncio, type FormState } from "./actions";
import styles from "./anuncios.module.css";

export type Item = Anuncio & { estado: Estado; detalle: string | null; inicioLocal: string; finLocal: string };

const ESTADO_LABEL: Record<Estado, string> = { visible: "Visible", programado: "Programado", terminado: "Terminó", apagado: "Apagado" };

export function AnunciosManager({ items, preview, max }: { items: Item[]; preview: AnuncioPublico[]; max: number }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = (id: string, fn: () => Promise<{ error?: string }>) => {
    setError(null);
    setBusyId(id);
    start(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
      setBusyId(null);
    });
  };

  return (
    <div className={styles.page}>
      <section className={styles.preview} aria-labelledby="preview-title">
        <h2 id="preview-title" className={styles.h2}>
          Así se ve ahora en la tienda
        </h2>
        {preview.length > 0 ? (
          <div className={styles.frame}>
            <AnnouncementBar items={preview} />
          </div>
        ) : (
          <p className={styles.emptyBar}>No hay mensajes visibles en este momento, así que la barra no aparece en la tienda.</p>
        )}
      </section>

      <section aria-labelledby="list-title">
        <div className={styles.listHead}>
          <div>
            <h2 id="list-title" className={styles.h2}>
              Mensajes
            </h2>
            <p className={styles.sub}>
              Corren en este orden. {items.length} de {max}.
            </p>
          </div>
          {!adding && items.length < max && (
            <Button
              type="button"
              onClick={() => {
                setAdding(true);
                setEditing(null);
              }}
            >
              Agregar mensaje
            </Button>
          )}
        </div>

        {error && (
          <div className={styles.notice}>
            <Notice kind="error">{error}</Notice>
          </div>
        )}

        {adding && (
          <div className={styles.newCard}>
            <AnuncioForm onDone={() => setAdding(false)} />
          </div>
        )}

        {items.length === 0 && !adding ? (
          <div className={styles.empty}>
            <Icon name="megaphone" size={24} />
            <p>No hay mensajes. Agrega el primero y aparece en la barra de la tienda.</p>
          </div>
        ) : (
          <ol className={styles.list}>
            {items.map((a, i) => {
              const busy = pending && busyId === a.id;
              if (editing === a.id) {
                return (
                  <li key={a.id} className={`${styles.row} ${styles.rowEditing}`}>
                    <AnuncioForm item={a} onDone={() => setEditing(null)} />
                  </li>
                );
              }
              return (
                <li key={a.id} className={`${styles.row} ${a.estado !== "visible" ? styles.rowMuted : ""}`} aria-busy={busy || undefined}>
                  <div className={styles.order}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      disabled={i === 0 || pending}
                      onClick={() => run(a.id, () => moveAnuncio(a.id, "up"))}
                    >
                      <Icon name="chevron" size={18} />
                      <span className="vv-sr-only">Subir “{a.texto}”</span>
                    </button>
                    <span className={styles.pos} aria-hidden="true">
                      {i + 1}
                    </span>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      disabled={i === items.length - 1 || pending}
                      onClick={() => run(a.id, () => moveAnuncio(a.id, "down"))}
                    >
                      <Icon name="chevron" size={18} />
                      <span className="vv-sr-only">Bajar “{a.texto}”</span>
                    </button>
                  </div>

                  <div className={styles.body}>
                    <p className={styles.texto}>{a.texto}</p>
                    {a.enlace && (
                      <p className={styles.enlace}>
                        <Icon name="arrow" size={14} />
                        {a.enlace}
                      </p>
                    )}
                    <p className={styles.estado} data-estado={a.estado}>
                      <span className={styles.dot} aria-hidden="true" />
                      <span className={styles.estadoLabel}>{ESTADO_LABEL[a.estado]}</span>
                      {a.detalle && <span className={styles.detalle}>{a.detalle}</span>}
                    </p>
                  </div>

                  <div className={styles.actions}>
                    {confirming === a.id ? (
                      <div className={styles.confirm} role="group" aria-label="Confirmar eliminación">
                        <span>¿Eliminar este mensaje?</span>
                        <button
                          type="button"
                          className={styles.danger}
                          disabled={pending}
                          onClick={() => {
                            setConfirming(null);
                            run(a.id, () => deleteAnuncio(a.id));
                          }}
                        >
                          Sí, eliminar
                        </button>
                        <button type="button" className={styles.textBtn} onClick={() => setConfirming(null)} autoFocus>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={a.activo}
                          className={styles.switch}
                          disabled={pending}
                          onClick={() => run(a.id, () => toggleAnuncio(a.id, !a.activo))}
                        >
                          <span className={styles.track} aria-hidden="true">
                            <span className={styles.thumb} />
                          </span>
                          <span>{a.activo ? "Encendido" : "Apagado"}</span>
                          <span className="vv-sr-only">: {a.texto}</span>
                        </button>
                        <button
                          type="button"
                          className={styles.textBtn}
                          disabled={pending}
                          onClick={() => {
                            setEditing(a.id);
                            setAdding(false);
                          }}
                        >
                          Editar<span className="vv-sr-only"> “{a.texto}”</span>
                        </button>
                        <button type="button" className={styles.iconBtn} disabled={pending} onClick={() => setConfirming(a.id)}>
                          <Icon name="close" size={18} />
                          <span className="vv-sr-only">Eliminar “{a.texto}”</span>
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

function AnuncioForm({ item, onDone }: { item?: Item; onDone: () => void }) {
  const [state, action, saving] = useActionState<FormState, FormData>(async (prev, form) => {
    const r = await saveAnuncio(prev, form);
    if (r.ok) onDone();
    return r;
  }, {});
  const [texto, setTexto] = useState(item?.texto ?? "");
  const [fechas, setFechas] = useState(Boolean(item?.iniciaAt || item?.terminaAt));
  // Controlados: si el servidor regresa un error, lo escrito se conserva.
  const [enlace, setEnlace] = useState(item?.enlace ?? "");
  const [inicia, setInicia] = useState(item?.inicioLocal ?? "");
  const [termina, setTermina] = useState(item?.finLocal ?? "");
  const e = state.errors ?? {};

  return (
    <form action={action} className={styles.form} noValidate>
      <h3 className={styles.formTitle}>{item ? "Editar mensaje" : "Mensaje nuevo"}</h3>
      {state.error && <Notice kind="error">{state.error}</Notice>}
      {item && <input type="hidden" name="id" value={item.id} />}
      <TextField
        name="texto"
        label="Mensaje"
        value={texto}
        onChange={(ev) => setTexto(ev.target.value)}
        maxLength={TEXTO_MAX}
        required
        autoFocus
        error={e.texto}
        hint={`${texto.length} de ${TEXTO_MAX} caracteres. Corto y directo: la barra corre.`}
      />
      <TextField
        name="enlace"
        label="Enlace"
        optional
        value={enlace}
        onChange={(ev) => setEnlace(ev.target.value)}
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        placeholder="/arma-tu-kit"
        error={e.enlace}
        hint="Si lo llenas, el mensaje se vuelve liga. Una página de la tienda (/arma-tu-kit) o un enlace https."
      />
      <fieldset className={styles.fieldset}>
        <legend>Cuándo se ve</legend>
        <label className={styles.radio}>
          <input type="radio" name="programacion" value="siempre" checked={!fechas} onChange={() => setFechas(false)} />
          <span>Siempre, mientras esté encendido</span>
        </label>
        <label className={styles.radio}>
          <input type="radio" name="programacion" value="fechas" checked={fechas} onChange={() => setFechas(true)} />
          <span>Solo entre fechas</span>
        </label>
        {fechas && (
          <div className={styles.dates}>
            <TextField name="inicia" type="datetime-local" label="Desde" optional value={inicia} onChange={(ev) => setInicia(ev.target.value)} error={e.inicia} />
            <TextField name="termina" type="datetime-local" label="Hasta" optional value={termina} onChange={(ev) => setTermina(ev.target.value)} error={e.termina} />
            <p className={styles.sub}>Hora de la Ciudad de México. Deja uno vacío si no tiene límite.</p>
          </div>
        )}
      </fieldset>
      <div className={styles.formActions}>
        <Button type="submit" loading={saving}>
          {item ? "Guardar cambios" : "Agregar mensaje"}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
