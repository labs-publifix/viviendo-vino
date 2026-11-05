import { CONTACTO } from "@/lib/contacto";
import { Icon } from "./Icon";
import styles from "./ContactoDatos.module.css";

// Datos de contacto (pie y /contacto), leídos de lib/contacto.ts: teléfono (con "Llamar" y "WhatsApp"), correo, domicilio (abre
// Google Maps en otra pestaña) y horario. "franja": los cuatro en fila (pie); "lista": uno debajo de otro (/contacto).
export function ContactoDatos({ variante = "lista" }: { variante?: "lista" | "franja" }) {
  const { telefono, whatsapp, correo, domicilio, horario } = CONTACTO;
  return (
    <address className={`${styles.list} ${variante === "franja" ? styles.franja : ""}`}>
      <div className={styles.item}>
        <Icon name="phone" size={20} />
        <div className={styles.body}>
          <span className={styles.label}>Teléfono y WhatsApp</span>
          <span className={styles.number}>{telefono.texto}</span>
          <span className={styles.actions}>
            <a href={telefono.href} className={styles.action} aria-label={`Llamar al ${telefono.texto}`}>
              <Icon name="phone" size={14} />
              Llamar
            </a>
            <a href={whatsapp.href} className={styles.action} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp al ${whatsapp.texto} (se abre en otra pestaña)`}>
              <Icon name="whatsapp" size={14} />
              WhatsApp
            </a>
          </span>
        </div>
      </div>
      <div className={styles.item}>
        <Icon name="mail" size={20} />
        <div className={styles.body}>
          <span className={styles.label}>Correo</span>
          <a href={correo.href} className={styles.link}>
            {correo.texto}
          </a>
        </div>
      </div>
      <div className={styles.item}>
        <Icon name="pin" size={20} />
        <div className={styles.body}>
          <span className={styles.label}>Domicilio</span>
          <a href={domicilio.mapa} className={styles.link} target="_blank" rel="noopener noreferrer">
            {domicilio.texto}
            <span className="vv-sr-only"> (ver en el mapa, se abre en otra pestaña)</span>
          </a>
        </div>
      </div>
      <div className={styles.item}>
        <Icon name="clock" size={20} />
        <div className={styles.body}>
          <span className={styles.label}>Horario</span>
          <span>{horario}</span>
        </div>
      </div>
    </address>
  );
}
