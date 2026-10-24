import { SOCIAL } from "@/lib/social";
import { Icon } from "./Icon";
import styles from "./SocialLinks.module.css";

// Íconos de redes (pie y menú móvil). Abren en otra pestaña; el nombre de la red va en el aria-label.
export function SocialLinks({ label = "Redes de Viviendo Vino" }: { label?: string }) {
  return (
    <ul className={styles.list} aria-label={label}>
      {SOCIAL.map((s) => (
        <li key={s.id}>
          <a href={s.href} target="_blank" rel="noopener noreferrer" className={styles.link} aria-label={`${s.name} (se abre en otra pestaña)`}>
            <Icon name={s.id} size={22} />
          </a>
        </li>
      ))}
    </ul>
  );
}
