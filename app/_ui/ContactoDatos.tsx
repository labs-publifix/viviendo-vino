import { CONTACTO } from "@/lib/contacto";
import { Icon } from "./Icon";
import styles from "./ContactoDatos.module.css";

// Datos de contacto (pie y /contacto), leídos de lib/contacto.ts. Teléfono y WhatsApp van en una sola línea con sus
// dos acciones; el domicilio abre Google Maps en otra pestaña.
export function ContactoDatos() {
  const { telefono, whatsapp, correo, domicilio, horario } = CONTACTO;
  return (
    <address className={styles.list}>
      <div className={styles.item}>
        <Icon name="phone" size={20} />
        <div className={styles.body}>
          <span className={styles.label}>Teléfono y WhatsApp</span>
          <span className={styles.number}>{telefono.texto}</span>
          <span className={styles.actions}>
            <a href={telefono.href} className={styles.action} aria-label={`Llamar al ${telefono.texto}`}>
              <Icon name="phone" size={16} /> Llamar
            </a>
            <a href={whatsapp.href} className={styles.action} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp al ${whatsapp.texto} (se abre en otra pestaña)`}>
              <Icon name="whatsapp" size={16} /> WhatsApp
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
