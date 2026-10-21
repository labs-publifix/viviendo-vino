import styles from "./BottlePlaceholder.module.css";

// Placeholder de botella mientras no hay fotografía de producto. La forma cambia por categoría
// (borgoñona para blancos y tintos, de espumoso para Prosecco y Rosé). Se reemplaza solo al cargar imageUrl.

const SHAPES = {
  still: "M44 6h12v26c0 6 14 12 14 30v86c0 4-3 6-6 6H36c-3 0-6-2-6-6V62c0-18 14-24 14-30z",
  sparkling: "M44 6h12v20c0 10 18 16 18 38v84c0 4-3 6-6 6H32c-3 0-6-2-6-6V64c0-22 18-28 18-38z",
};

export function BottlePlaceholder({ kind = "still", label }: { kind?: "still" | "sparkling"; label: string }) {
  return (
    <div className={styles.frame} role="img" aria-label={`${label} (foto pendiente)`}>
      <svg viewBox="0 0 100 160" className={styles.bottle} aria-hidden="true">
        <path d={SHAPES[kind]} />
        <path className={styles.label} d="M33 92h34v30H33z" />
      </svg>
    </div>
  );
}
