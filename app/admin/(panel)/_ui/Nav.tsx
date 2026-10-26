"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/app/_ui/Icon";
import { NAV_COOKIE, type Seccion } from "@/lib/admin/rules";
import { logout } from "../actions";
import styles from "./panel.module.css";

// Menú del panel. Escritorio: barra lateral que se colapsa a solo íconos (se recuerda en la cookie vv_admin_nav).
// Celular: barra superior compacta y el menú en un <dialog> lateral (atrapa el foco, cierra con Escape o al tocar
// fuera, y el resto de la página queda inerte mientras está abierto).

type Grupo = { label: string; secciones: Seccion[] };
type Props = { groups: Grupo[]; nombre: string; rol: string; iniciales: string; collapsed: boolean };

export function Nav({ groups, nombre, rol, iniciales, collapsed: initialCollapsed }: Props) {
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [tip, setTip] = useState<{ label: string; top: number; left: number } | null>(null);

  // Al navegar se cierra el menú del celular.
  useEffect(() => drawer.current?.close(), [pathname]);
  // Si la pantalla crece a escritorio con el menú abierto, se cierra (ya se ve la barra lateral).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 960px)");
    const onChange = () => mq.matches && drawer.current?.close();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    setTip(null);
    document.cookie = `${NAV_COOKIE}=${next ? "1" : "0"}; path=/admin; max-age=31536000; samesite=lax`;
  }

  // Con la barra colapsada, el nombre de cada sección aparece al pasar el cursor o al enfocar con el teclado.
  // Va en position: fixed para que el scroll de la barra no lo recorte.
  const tipHandlers = (label: string) =>
    collapsed
      ? {
          onMouseEnter: (e: React.MouseEvent<HTMLElement>) => showTip(label, e.currentTarget),
          onFocus: (e: React.FocusEvent<HTMLElement>) => showTip(label, e.currentTarget),
          onMouseLeave: () => setTip(null),
          onBlur: () => setTip(null),
        }
      : {};
  function showTip(label: string, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2, left: r.right + 10 });
  }

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/"));

  const body = (inDrawer: boolean) => (
    <>
      <nav className={styles.navGroups} aria-label="Secciones del panel">
        {groups.map((g) => (
          <div key={g.label} className={styles.group}>
            <p className={styles.groupLabel} id={`${inDrawer ? "d" : "s"}-${g.label}`}>
              {g.label}
            </p>
            <ul className={styles.navList} aria-labelledby={`${inDrawer ? "d" : "s"}-${g.label}`}>
              {g.secciones.map((s) => {
                const active = isActive(s.href);
                return (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      className={`${styles.navItem} ${active ? styles.navActive : ""}`}
                      aria-current={active ? "page" : undefined}
                      {...(inDrawer ? {} : tipHandlers(s.label))}
                    >
                      <Icon name={s.icon} size={20} />
                      <span className={styles.navLabel}>{s.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className={styles.me}>
        <span className={styles.avatar} aria-hidden="true">
          {iniciales}
        </span>
        <div className={styles.meText}>
          <p className={styles.meName}>{nombre}</p>
          <p className={styles.meRol}>{rol}</p>
        </div>
        <form action={logout} className={styles.logoutForm}>
          <button type="submit" className={styles.logout} {...(inDrawer ? {} : tipHandlers("Cerrar sesión"))}>
            <Icon name="logout" size={20} />
            <span className="vv-sr-only">Cerrar sesión</span>
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Celular */}
      <header className={styles.topbar}>
        <Link href="/admin" className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element -- logo SVG de marca */}
          <img src="/brand/logo-color.svg" alt="Viviendo Vino" width={786} height={250} className={styles.logo} />
          <span className={styles.brandTag}>Admin</span>
        </Link>
        <button type="button" className={styles.iconBtn} aria-haspopup="dialog" onClick={() => drawer.current?.showModal()}>
          <Icon name="menu" size={22} />
          <span className="vv-sr-only">Abrir menú</span>
        </button>
      </header>
      <dialog
        ref={drawer}
        className={styles.drawer}
        aria-label="Menú del panel"
        // Tocar el fondo oscuro (fuera del panel) cierra el menú.
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      >
        <div className={styles.drawerPanel}>
          <div className={styles.drawerHead}>
            <Link href="/admin" className={styles.brand}>
              {/* eslint-disable-next-line @next/next/no-img-element -- logo SVG de marca */}
              <img src="/brand/logo-color.svg" alt="Viviendo Vino" width={786} height={250} className={styles.logo} />
              <span className={styles.brandTag}>Admin</span>
            </Link>
            <button type="button" className={styles.iconBtn} onClick={() => drawer.current?.close()} autoFocus>
              <Icon name="close" size={22} />
              <span className="vv-sr-only">Cerrar menú</span>
            </button>
          </div>
          {body(true)}
        </div>
      </dialog>

      {/* Escritorio */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
        <div className={styles.sideHead}>
          <Link href="/admin" className={styles.brand} {...tipHandlers("Inicio")}>
            {collapsed ? (
              // eslint-disable-next-line @next/next/no-img-element -- isotipo SVG de marca
              <img src="/favicon.svg" alt="Viviendo Vino" width={36} height={36} className={styles.isotipo} />
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- logo SVG de marca */}
                <img src="/brand/logo-color.svg" alt="Viviendo Vino" width={786} height={250} className={styles.logo} />
                <span className={styles.brandTag}>Admin</span>
              </>
            )}
          </Link>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.collapseBtn}`}
            aria-pressed={collapsed}
            onClick={toggleCollapsed}
            {...tipHandlers("Expandir menú")}
          >
            <Icon name="sidebar" size={20} />
            <span className="vv-sr-only">{collapsed ? "Expandir menú" : "Colapsar menú"}</span>
          </button>
        </div>
        {body(false)}
      </aside>
      {tip && (
        <div className={styles.tip} style={{ top: tip.top, left: tip.left }} aria-hidden="true">
          {tip.label}
        </div>
      )}
    </>
  );
}
