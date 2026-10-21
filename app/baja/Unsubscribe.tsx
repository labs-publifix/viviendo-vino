"use client";

import { useSearchParams } from "next/navigation";
import styles from "@/app/_waitlist/waitlist.module.css";

export function Unsubscribe() {
  const params = useSearchParams();
  const status = params.get("estado");
  const token = params.get("token");

  if (status === "listo") {
    return (
      <>
        <p className={styles.eyebrow}>Baja confirmada</p>
        <h1 className={styles.title}>Listo.</h1>
        <p className={styles.lede}>Ya no te enviaremos correos de la lista de espera.</p>
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        <p className={styles.eyebrow}>Darme de baja</p>
        <h1 className={styles.title}>Algo salió mal.</h1>
        <p className={styles.lede}>No pudimos darte de baja. Vuelve a abrir el enlace del correo en un momento.</p>
      </>
    );
  }

  if (!token || status === "invalido") {
    return (
      <>
        <p className={styles.eyebrow}>Darme de baja</p>
        <h1 className={styles.title}>Este enlace no funciona.</h1>
        <p className={styles.lede}>Abre el enlace “Darme de baja” directo desde el correo que te enviamos.</p>
      </>
    );
  }

  return (
    <>
      <p className={styles.eyebrow}>Darme de baja</p>
      <h1 className={styles.title}>¿Te damos de baja?</h1>
      <p className={styles.lede}>Dejarás de recibir los correos de la lista de espera de Viviendo Vino.</p>
      <form className={styles.form} method="post" action={`/api/waitlist/unsubscribe?token=${encodeURIComponent(token)}`}>
        <div>
          <button className={styles.btn} type="submit">
            Confirmar baja
          </button>
        </div>
      </form>
    </>
  );
}
