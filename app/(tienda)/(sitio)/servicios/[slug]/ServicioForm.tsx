"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/app/_ui/Button";
import { Checkbox, TextArea, TextField } from "@/app/_ui/Field";
import { Notice } from "@/app/_ui/Notice";
import { CONTACTO } from "@/lib/contacto";
import { MENSAJE_MAX, contactoSchema, erroresContacto, type ContactoCampo, type ContactoErrores, type MotivoId } from "@/lib/contacto-form";
import styles from "./servicio.module.css";

// Formulario de contacto de cada servicio: nombre, empresa, correo, teléfono y mensaje. Usa el mismo envío que
// /contacto (/api/contacto, con Resend y la plantilla de marca) y manda como motivo el servicio de la página.

const ORDEN: ContactoCampo[] = ["nombre", "empresa", "correo", "telefono", "mensaje", "privacidad"];
const NO_SE_ENVIO = `No pudimos enviar tu mensaje. Llámanos al ${CONTACTO.telefono.texto} o escríbenos a ${CONTACTO.correo.texto}.`;

export function ServicioForm({ motivo, servicio }: { motivo: Exclude<MotivoId, "pedido" | "etiquetas" | "otro">; servicio: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const avisoRef = useRef<HTMLDivElement>(null);
  const inicio = useRef(0);
  const [errores, setErrores] = useState<ContactoErrores>({});
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<{ tipo: "ok" } | { tipo: "error"; texto: string } | null>(null);

  useEffect(() => {
    inicio.current = Date.now();
  }, []);
  useEffect(() => {
    if (estado) avisoRef.current?.focus();
  }, [estado]);

  const limpiar = (k: ContactoCampo) => () => errores[k] && setErrores((e) => ({ ...e, [k]: undefined }));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado(null);
    const f = new FormData(e.currentTarget);
    const datos = {
      nombre: String(f.get("nombre") ?? ""),
      empresa: String(f.get("empresa") ?? ""),
      correo: String(f.get("correo") ?? ""),
      telefono: String(f.get("telefono") ?? ""),
      motivo,
      mensaje: String(f.get("mensaje") ?? ""),
      privacidad: f.get("privacidad") === "on",
    };
    const local = contactoSchema.safeParse(datos);
    if (!local.success) {
      const errs = erroresContacto(local.error);
      setErrores(errs);
      const k = ORDEN.find((c) => errs[c]);
      if (k) formRef.current?.querySelector<HTMLElement>(`[name="${k}"]`)?.focus();
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
        inicio.current = Date.now();
        setEstado({ tipo: "ok" });
        return;
      }
      if (body?.fieldErrors && Object.keys(body.fieldErrors).length > 0) {
        setErrores(body.fieldErrors);
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
      <form ref={formRef} className={styles.form} noValidate onSubmit={onSubmit} aria-label={`Contacto: ${servicio}`}>
        <div className={styles.pair}>
          <TextField name="nombre" label="Nombre" autoComplete="name" maxLength={120} error={errores.nombre} onInput={limpiar("nombre")} />
          <TextField name="empresa" label="Empresa" optional autoComplete="organization" maxLength={120} error={errores.empresa} onInput={limpiar("empresa")} />
        </div>
        <div className={styles.pair}>
          <TextField name="correo" label="Correo" type="email" autoComplete="email" inputMode="email" maxLength={254} error={errores.correo} onInput={limpiar("correo")} />
          <TextField name="telefono" label="Teléfono" optional type="tel" autoComplete="tel" inputMode="tel" maxLength={30} error={errores.telefono} onInput={limpiar("telefono")} />
        </div>
        <TextArea name="mensaje" label="Mensaje" rows={5} maxLength={MENSAJE_MAX} error={errores.mensaje} onInput={limpiar("mensaje")} />
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
