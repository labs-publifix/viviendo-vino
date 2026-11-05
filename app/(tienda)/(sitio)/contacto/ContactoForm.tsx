"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/app/_ui/Button";
import { Checkbox, TextArea, TextField } from "@/app/_ui/Field";
import { Notice } from "@/app/_ui/Notice";
import { Select } from "@/app/_ui/Select";
import { CONTACTO } from "@/lib/contacto";
import { MENSAJE_MAX, MOTIVOS, contactoSchema, erroresContacto, type ContactoCampo, type ContactoErrores, type MotivoId } from "@/lib/contacto-form";
import styles from "./contacto.module.css";

// Formulario de contacto: valida en el navegador con el mismo esquema que el servidor, envía a /api/contacto y muestra
// el resultado en la misma página (con el foco en el aviso). Campo oculto "sitio" y hora de inicio para frenar bots.

const ORDEN: ContactoCampo[] = ["nombre", "correo", "telefono", "motivo", "mensaje", "privacidad"];
const NO_SE_ENVIO = `No pudimos enviar tu mensaje. Llámanos al ${CONTACTO.telefono.texto} o escríbenos a ${CONTACTO.correo.texto}.`;

type Estado = { tipo: "ok" } | { tipo: "error"; texto: string } | null;

export function ContactoForm({ motivoInicial }: { motivoInicial: MotivoId | "" }) {
  const formRef = useRef<HTMLFormElement>(null);
  const avisoRef = useRef<HTMLDivElement>(null);
  const inicio = useRef(0);
  const [motivo, setMotivo] = useState<string>(motivoInicial);
  const [errores, setErrores] = useState<ContactoErrores>({});
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<Estado>(null);
  const [largo, setLargo] = useState(0);

  useEffect(() => {
    inicio.current = Date.now();
  }, []);
  useEffect(() => {
    if (estado) avisoRef.current?.focus();
  }, [estado]);

  const limpiar = (k: ContactoCampo) => () => errores[k] && setErrores((e) => ({ ...e, [k]: undefined }));

  function enfocar(errs: ContactoErrores) {
    const k = ORDEN.find((c) => errs[c]);
    if (!k) return;
    const form = formRef.current;
    (form?.querySelector<HTMLElement>(`[data-campo="${k}"] [role="combobox"]`) ?? form?.querySelector<HTMLElement>(`[name="${k}"]`))?.focus();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado(null);
    const f = new FormData(e.currentTarget);
    const datos = {
      nombre: String(f.get("nombre") ?? ""),
      correo: String(f.get("correo") ?? ""),
      telefono: String(f.get("telefono") ?? ""),
      motivo: String(f.get("motivo") ?? ""),
      mensaje: String(f.get("mensaje") ?? ""),
      privacidad: f.get("privacidad") === "on",
    };
    const local = contactoSchema.safeParse(datos);
    if (!local.success) {
      const errs = erroresContacto(local.error);
      setErrores(errs);
      enfocar(errs);
      return;
    }
    setErrores({});
    setEnviando(true);
    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...datos, sitio: String(f.get("sitio") ?? ""), inicio: inicio.current }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; fieldErrors?: ContactoErrores } | null;
      if (body?.ok) {
        formRef.current?.reset();
        setMotivo("");
        setLargo(0);
        inicio.current = Date.now();
        setEstado({ tipo: "ok" });
        return;
      }
      if (body?.fieldErrors && Object.keys(body.fieldErrors).length > 0) {
        setErrores(body.fieldErrors);
        enfocar(body.fieldErrors);
        return;
      }
      setEstado({ tipo: "error", texto: body?.error ?? NO_SE_ENVIO });
    } catch {
      setEstado({ tipo: "error", texto: NO_SE_ENVIO });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={styles.formCol}>
      <div ref={avisoRef} tabIndex={-1} className={styles.aviso} aria-live="polite">
        {estado?.tipo === "ok" && (
          <Notice kind="ok" title="Recibimos tu mensaje">
            Te enviamos una confirmación por correo. Te respondemos en nuestro horario de atención: {CONTACTO.horario.toLowerCase()}.
          </Notice>
        )}
        {estado?.tipo === "error" && (
          <Notice kind="error" title="No se envió tu mensaje">
            {estado.texto}
          </Notice>
        )}
      </div>

      <form ref={formRef} className={styles.form} noValidate onSubmit={onSubmit}>
        <TextField name="nombre" label="Nombre" autoComplete="name" maxLength={120} error={errores.nombre} onInput={limpiar("nombre")} />
        <div className={styles.pair}>
          <TextField name="correo" label="Correo" type="email" autoComplete="email" inputMode="email" maxLength={254} error={errores.correo} onInput={limpiar("correo")} />
          <TextField name="telefono" label="Teléfono" optional type="tel" autoComplete="tel" inputMode="tel" maxLength={30} error={errores.telefono} onInput={limpiar("telefono")} />
        </div>
        <div data-campo="motivo">
          <Select
            name="motivo"
            label="Motivo"
            placeholder="Elige el motivo"
            value={motivo}
            options={MOTIVOS.map((m) => ({ value: m.id, label: m.texto }))}
            error={errores.motivo}
            onChange={(v) => {
              setMotivo(v);
              limpiar("motivo")();
            }}
          />
        </div>
        <TextArea
          name="mensaje"
          label="Mensaje"
          rows={6}
          maxLength={MENSAJE_MAX}
          error={errores.mensaje}
          hint={`${largo} de ${MENSAJE_MAX} caracteres`}
          onInput={(e) => {
            setLargo(e.currentTarget.value.length);
            limpiar("mensaje")();
          }}
        />
        {/* Campo trampa: invisible para las personas; los bots lo llenan. */}
        <div className={styles.trampa} aria-hidden="true">
          <label>
            Sitio web
            <input type="text" name="sitio" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <Checkbox
          name="privacidad"
          label={
            <>
              He leído el <Link href="/privacidad">Aviso de privacidad</Link>.
            </>
          }
          error={errores.privacidad}
          onChange={limpiar("privacidad")}
        />
        <div>
          <Button type="submit" size="lg" loading={enviando} disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar mensaje"}
          </Button>
        </div>
      </form>
    </div>
  );
}
