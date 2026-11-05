import { Heading, NumberedLabel } from "@/app/_ui/Typography";
import type { LegalDoc } from "@/lib/legal";
import { LegalToc } from "./LegalToc";
import styles from "./legal.module.css";

// Página legal: encabezado, índice del documento (fijo a un lado en escritorio, plegable en móvil) y el texto.
export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <article className={styles.page}>
      <header className={styles.head}>
        <NumberedLabel>{doc.etiqueta}</NumberedLabel>
        <Heading level={1} size="section">
          {doc.titulo}
        </Heading>
        <p className={styles.updated}>Última actualización: {doc.actualizado}</p>
      </header>
      <div className={styles.layout}>
        <LegalToc items={doc.toc} />
        <div className={styles.doc} dangerouslySetInnerHTML={{ __html: doc.html }} />
      </div>
    </article>
  );
}
