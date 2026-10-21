import styles from "./DataBar.module.css";

// Barra de dato (Manual · 7.05): barra delgada en ciruela con porcentaje. Para el perfil de cada vino
// (cuerpo, acidez…) cuando el aliado entregue los datos.
export function DataBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.track} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <span className={styles.fill} style={{ width: `${pct}%` }} />
      </span>
      <span className={styles.value}>{pct}%</span>
    </div>
  );
}
