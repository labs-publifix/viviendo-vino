"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/app/_ui/Icon";
import { logout } from "../actions";
import styles from "./panel.module.css";

// Menú lateral del panel. En el celular se abre con el botón de la barra superior.

export function Nav({ items, nombre, rol }: { items: { href: string; label: string }[]; nombre: string; rol: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Al navegar, el menú del celular se cierra.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reacciona a la navegación (sistema externo)
  useEffect(() => setOpen(false), [pathname]);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <>
      <div className={styles.topbar}>
        <Link href="/admin" className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element -- logo SVG de marca */}
          <img src="/brand/logo-color.svg" alt="Viviendo Vino" width={786} height={250} />
          <span>Admin</span>
        </Link>
        <button type="button" className={styles.menuBtn} aria-expanded={open} aria-controls="admin-nav" onClick={() => setOpen((o) => !o)}>
          <Icon name={open ? "close" : "menu"} size={22} />
          <span className="vv-sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span>
        </button>
      </div>
      <nav id="admin-nav" className={`${styles.nav} ${open ? styles.navOpen : ""}`} aria-label="Secciones del panel">
        <Link href="/admin" className={`${styles.brand} ${styles.brandDesk}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- logo SVG de marca */}
          <img src="/brand/logo-color.svg" alt="Viviendo Vino" width={786} height={250} />
          <span>Admin</span>
        </Link>
        <ul className={styles.navList}>
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className={`${styles.navItem} ${active(i.href) ? styles.navActive : ""}`} aria-current={active(i.href) ? "page" : undefined}>
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className={styles.me}>
          <p className={styles.meName}>{nombre}</p>
          <p className={styles.meRol}>{rol}</p>
          <form action={logout}>
            <button type="submit" className={styles.logout}>
              Cerrar sesión
            </button>
          </form>
        </div>
      </nav>
    </>
  );
}
