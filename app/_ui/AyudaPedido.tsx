import { CONTACTO } from "@/lib/contacto";
import styles from "./AyudaPedido.module.css";

// Línea discreta de ayuda en carrito y checkout (lee de lib/contacto.ts). No cambia nada del flujo.
export function AyudaPedido() {
  const { telefono, whatsapp, horario } = CONTACTO;
  return (
    <p className={styles.ayuda}>
      ¿Dudas con tu pedido?{" "}
      <a href={telefono.href} aria-label={`Llámanos al ${telefono.texto}`}>
        Llámanos
      </a>{" "}
      o escríbenos por{" "}
      <a href={whatsapp.href} target="_blank" rel="noopener noreferrer">
        WhatsApp<span className="vv-sr-only"> (se abre en otra pestaña)</span>
      </a>{" "}
      al {telefono.texto}. {horario}.
    </p>
  );
}
