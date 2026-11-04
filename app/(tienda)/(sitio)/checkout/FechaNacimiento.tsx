"use client";

import { useId, useState } from "react";
import { Select } from "@/app/_ui/Select";
import { MIN_AGE } from "@/lib/checkout/age";
import styles from "./checkout.module.css";

// Fecha de nacimiento con tres selectores del sitio (día, mes, año) en lugar del calendario del sistema, que en cada
// navegador se ve distinto y obliga a retroceder décadas mes por mes. Envía "AAAA-MM-DD" en un input oculto
// (vacío mientras falte una parte); el servidor vuelve a validar la fecha y la edad.

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const dos = (n: number) => String(n).padStart(2, "0");
const diasDelMes = (y: number | null, m: number | null) =>
  m ? new Date(Date.UTC(y ?? 2000, m, 0)).getUTCDate() : 31;

export function FechaNacimiento({
  name,
  hoy,
  hint,
  error,
  onChange,
}: {
  name: string;
  hoy: string;
  hint: string;
  error?: string;
  onChange: () => void;
}) {
  const id = useId();
  const [d, setD] = useState("");
  const [m, setM] = useState("");
  const [y, setY] = useState("");
  const ultimo = Number(hoy.slice(0, 4)) - MIN_AGE;
  const años = Array.from({ length: 83 }, (_, i) => String(ultimo - i)).map(
    (v) => ({ value: v, label: v }),
  );
  const maxDia = diasDelMes(y ? Number(y) : null, m ? Number(m) : null);
  const dias = Array.from({ length: maxDia }, (_, i) => ({
    value: dos(i + 1),
    label: String(i + 1),
  }));
  const meses = MESES.map((label, i) => ({ value: dos(i + 1), label }));
  const valor = d && m && y ? `${y}-${m}-${d}` : "";

  // Al cambiar mes o año, un día que ya no existe (31 de abril, 29 de febrero) se quita.
  const ajusta = (nm: string, ny: string) => {
    if (
      d &&
      Number(d) > diasDelMes(ny ? Number(ny) : null, nm ? Number(nm) : null)
    )
      setD("");
  };
  const describedBy = error ? `${id}-error` : `${id}-hint`;

  return (
    <div
      className={styles.fecha}
      role="group"
      aria-labelledby={`${id}-label`}
      data-campo={name}
    >
      <span id={`${id}-label`} className={styles.fechaLabel}>
        Fecha de nacimiento
      </span>
      <div className={styles.fechaPartes}>
        <Select
          label="Día de nacimiento"
          hideLabel
          placeholder="Día"
          value={d}
          options={dias}
          invalid={Boolean(error)}
          describedBy={describedBy}
          onChange={(v) => {
            setD(v);
            onChange();
          }}
        />
        <Select
          label="Mes de nacimiento"
          hideLabel
          placeholder="Mes"
          value={m}
          options={meses}
          invalid={Boolean(error)}
          describedBy={describedBy}
          onChange={(v) => {
            setM(v);
            ajusta(v, y);
            onChange();
          }}
        />
        <Select
          label="Año de nacimiento"
          hideLabel
          placeholder="Año"
          value={y}
          options={años}
          invalid={Boolean(error)}
          describedBy={describedBy}
          onChange={(v) => {
            setY(v);
            ajusta(m, v);
            onChange();
          }}
        />
      </div>
      <input type="hidden" name={name} value={valor} />
      {error ? (
        <p className={styles.fechaError} id={`${id}-error`}>
          {error}
        </p>
      ) : (
        <p className={styles.fechaHint} id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}
