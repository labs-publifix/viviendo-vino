"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/app/_ui/Button";
import { TextField } from "@/app/_ui/Field";
import { Icon } from "@/app/_ui/Icon";
import styles from "./checkout.module.css";

// Campo de código de descuento en el resumen del checkout. Solo aparece cuando hay campañas activas (o ya hay un
// código aplicado). Cerrado por defecto: un enlace discreto lo abre. El descuento lo calcula el servidor.

export type CodigoAplicado = { codigo: string; textoPublico: string; descuento: number };

export function CodigoDescuento({
  aplicado,
  error,
  editable,
  onAplicar,
  onQuitar,
}: {
  aplicado: CodigoAplicado | null;
  error: string | null;
  editable: boolean;
  onAplicar: (codigo: string) => Promise<boolean>;
  onQuitar: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [aplicando, setAplicando] = useState(false);

  if (aplicado) {
    return (
      <div className={styles.codigo} aria-live="polite">
        <p className={styles.codigoOk}>
          <Icon name="check" size={16} /> Código <strong>{aplicado.codigo}</strong> aplicado
          {editable && (
            <button type="button" className={styles.linkBtn} onClick={onQuitar}>
              Quitar
            </button>
          )}
        </p>
        {aplicado.textoPublico && <p className={styles.codigoTexto}>{aplicado.textoPublico}</p>}
      </div>
    );
  }
  if (!editable) return null;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setAplicando(true);
    const ok = await onAplicar(texto);
    setAplicando(false);
    if (ok) setTexto("");
  }

  if (!abierto && !error) {
    return (
      <button type="button" className={`${styles.linkBtn} ${styles.codigoAbrir}`} onClick={() => setAbierto(true)} aria-expanded={false}>
        ¿Tienes un código de descuento?
      </button>
    );
  }
  return (
    <form className={styles.codigo} onSubmit={enviar} noValidate>
      <div className={styles.codigoFila}>
        <TextField
          label="Código de descuento"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={24}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "codigo-error" : undefined}
          autoFocus={abierto}
        />
        <Button type="submit" variant="secondary" loading={aplicando} disabled={!texto.trim()}>
          Aplicar
        </Button>
      </div>
      {error && (
        <p id="codigo-error" className={styles.codigoError} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
