import { CONTACTO } from "@/lib/contacto";
import styles from "./AyudaPedido.module.css";

// Línea discreta de ayuda en carrito y checkout (lee de lib/contacto.ts). No cambia nada del flujo.
export function AyudaPedido() {
  const { telefono, horario } = CONTACTO;
  return (
    <p className={styles.ayuda}>
      ¿Dudas con tu pedido? Llámanos al{" "}
      <a href={telefono.href} aria-label={`Llamar al ${telefono.texto}`}>
        {telefono.texto}
      </a>
      . {horario}.
    </p>
  );
}
