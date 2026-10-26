import { Icon } from "@/app/_ui/Icon";
import styles from "./panel.module.css";

/** Encabezado de una lista: qué es y su exportación (enlace normal: el navegador descarga el CSV). */
export function ListHead({ text, exportHref }: { text: string; exportHref?: string }) {
  return (
    <div className={styles.listHead}>
      <p>{text}</p>
      {exportHref && (
        <a href={exportHref} className={styles.export} download>
          <Icon name="download" size={18} />
          Exportar CSV
        </a>
      )}
    </div>
  );
}
