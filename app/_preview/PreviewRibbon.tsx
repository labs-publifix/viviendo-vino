import styles from "./ribbon.module.css";

// Cinta fija del preview privado, para que nadie confunda una captura con la tienda pública.
export function PreviewRibbon() {
  return (
    <p className={styles.ribbon} role="note">
      Vista previa privada · no es la tienda pública
    </p>
  );
}
