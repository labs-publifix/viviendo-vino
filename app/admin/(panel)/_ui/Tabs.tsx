"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./panel.module.css";

/** Pestañas de una sección (enlaces). En el celular se desplazan de lado si no caben. */
export function Tabs({ label, items }: { label: string; items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className={styles.tabs} aria-label={label}>
      <ul>
        {items.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <li key={t.href}>
              <Link href={t.href} className={`${styles.tab} ${active ? styles.tabActive : ""}`} aria-current={active ? "page" : undefined}>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
