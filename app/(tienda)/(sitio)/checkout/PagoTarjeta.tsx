"use client";

import { useEffect, useRef, useState } from "react";
import { Notice } from "@/app/_ui/Notice";
import styles from "./checkout.module.css";

// Formulario de tarjeta de Mercado Pago (Card Payment Brick) dentro del checkout. MercadoPago.js cifra la tarjeta en el
// navegador y entrega un token de un solo uso; nunca pasa el número de tarjeta por nuestro servidor. Solo crédito y
// débito, siempre a un solo pago. El monto lo vuelve a tomar el servidor del pedido (aquí solo se muestra).

type Brick = { unmount: () => void };
type MPWindow = Window & { MercadoPago?: new (key: string, opts: { locale: string }) => { bricks: () => { create: (t: string, id: string, s: unknown) => Promise<Brick> } } };

const SDK = "https://sdk.mercadopago.com/js/v2";
let cargando: Promise<void> | null = null;

function cargarSdk(): Promise<void> {
  const w = window as MPWindow;
  if (w.MercadoPago) return Promise.resolve();
  if (!cargando) {
    cargando = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SDK;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        cargando = null;
        reject(new Error("sdk"));
      };
      document.head.appendChild(s);
    });
  }
  return cargando;
}

export type DatosBrick = { token: string; payment_method_id: string; payment_type_id: string; installments: number; payer?: { identification?: { type: string; number: string } } };

export function PagoTarjeta({
  publicKey,
  montoCentavos,
  email,
  onPagar,
}: {
  publicKey: string;
  montoCentavos: number;
  email: string;
  /** Manda la tarjeta al servidor; resuelve cuando hay respuesta (sea cual sea). */
  onPagar: (datos: DatosBrick) => Promise<void>;
}) {
  const id = "pago-tarjeta-brick";
  const brick = useRef<Brick | null>(null);
  const pagar = useRef(onPagar);
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  // Motivo técnico del error del formulario (p. ej. "get_payment_methods_failed"), para poder diagnosticarlo.
  const [causa, setCausa] = useState<string | null>(null);
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    pagar.current = onPagar;
  }, [onPagar]);

  useEffect(() => {
    let vivo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refleja que se vuelve a montar el formulario de Mercado Pago
    setEstado("cargando");
    setCausa(null);
    // Si en 25 s el formulario no está listo, se avisa en lugar de dejar "Cargando…" para siempre.
    const espera = setTimeout(() => {
      if (!vivo) return;
      setCausa("tiempo_de_espera");
      setEstado("error");
    }, 25_000);
    cargarSdk()
      .then(async () => {
        if (!vivo) return;
        const MP = (window as MPWindow).MercadoPago!;
        const bricks = new MP(publicKey, { locale: "es-MX" }).bricks();
        const b = await bricks.create("cardPayment", id, {
          initialization: { amount: montoCentavos / 100, payer: { email } },
          // Solo lo mínimo y documentado: un pago. (Sin exclusiones ni estilos propios: un valor que el SDK no
          // reconoce detiene el formulario.)
          customization: { paymentMethods: { minInstallments: 1, maxInstallments: 1 } },
          callbacks: {
            onReady: () => {
              if (!vivo) return;
              clearTimeout(espera);
              setEstado("listo");
            },
            onError: (e: { type?: string; cause?: string; message?: string } | undefined) => {
              console.error("mercadopago: error del formulario", e);
              // Los errores "critical" impiden mostrar o usar el formulario.
              if (vivo && e?.type === "critical") {
                clearTimeout(espera);
                setCausa(String(e.cause ?? e.message ?? "desconocido").slice(0, 80));
                setEstado("error");
              }
            },
            onSubmit: (formData: DatosBrick, additional?: { paymentTypeId?: string }) =>
              pagar.current({ ...formData, payment_type_id: additional?.paymentTypeId ?? formData.payment_type_id, installments: 1 }),
          },
        });
        if (!vivo) b.unmount();
        else brick.current = b;
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        clearTimeout(espera);
        setCausa(e instanceof Error && e.message === "sdk" ? "no_cargo_el_sdk" : "no_se_creo_el_formulario");
        setEstado("error");
      });
    return () => {
      vivo = false;
      clearTimeout(espera);
      brick.current?.unmount();
      brick.current = null;
    };
  }, [publicKey, montoCentavos, email, vuelta]);

  return (
    <div className={styles.brick}>
      {estado === "cargando" && (
        <p className={styles.muted} role="status">
          Cargando el formulario de pago seguro…
        </p>
      )}
      {estado === "error" && (
        <Notice kind="error" title="No pudimos cargar el formulario de pago.">
          Revisa tu conexión e intenta de nuevo. No se hizo ningún cargo.{" "}
          <button type="button" className={styles.linkBtn} onClick={() => setVuelta((n) => n + 1)}>
            Intentar de nuevo
          </button>
          {causa && <span className={styles.causa}>Código: {causa}</span>}
        </Notice>
      )}
      <div id={id} key={vuelta} />
      <p className={styles.payNote}>Pago seguro con Mercado Pago. Tus datos de tarjeta no pasan por nuestro sitio. En tu estado de cuenta aparece como VIVIENDOVINO.</p>
    </div>
  );
}

/** Reto 3-D Secure: la página de tu banco dentro del checkout. Avisa cuando el cliente termina. */
export function Reto3DS({ url, onTermino }: { url: string; onTermino: () => void }) {
  const fin = useRef(onTermino);
  useEffect(() => {
    fin.current = onTermino;
  }, [onTermino]);
  useEffect(() => {
    const escuchar = (e: MessageEvent) => {
      // Solo mensajes de Mercado Pago (la página del reto vive en su dominio).
      let host = "";
      try {
        host = new URL(e.origin).hostname;
      } catch {
        return;
      }
      if (!/(^|\.)mercadopago\.com(\.[a-z]{2})?$/.test(host) && !/(^|\.)mercadolibre\.com$/.test(host)) return;
      if ((e.data as { status?: string } | null)?.status === "COMPLETE") fin.current();
    };
    window.addEventListener("message", escuchar);
    return () => window.removeEventListener("message", escuchar);
  }, []);
  return (
    <div className={styles.reto}>
      <p className={styles.retoTexto}>Tu banco pide confirmar que eres tú. Sigue los pasos aquí abajo; tus botellas siguen apartadas.</p>
      <iframe src={url} title="Confirmación de tu banco" className={styles.retoFrame} />
      <button type="button" className={styles.linkBtn} onClick={() => fin.current()}>
        Ya terminé con mi banco
      </button>
    </div>
  );
}
