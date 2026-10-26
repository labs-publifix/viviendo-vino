import { Icon } from "@/app/_ui/Icon";
import styles from "./panel.module.css";

/** Sección aún en construcción: qué se va a poder hacer y qué día llega (docs/ADMIN.md, calendario). */
export function Soon({ when, items, note }: { when: string; items: string[]; note?: string }) {
  return (
    <section className={styles.soon} aria-labelledby="soon-title">
      <div className={styles.soonHead}>
        <h2 id="soon-title" className={styles.soonTitle}>
          Lo que vas a poder hacer aquí
        </h2>
        <span className={styles.when}>
          <Icon name="clock" size={16} />
          Llega el {when}
        </span>
      </div>
      <ul className={styles.soonList}>
        {items.map((i) => (
          <li key={i}>
            <Icon name="check" size={18} />
            <span>{i}</span>
          </li>
        ))}
      </ul>
      {note && <p className={styles.soonNote}>{note}</p>}
    </section>
  );
}
