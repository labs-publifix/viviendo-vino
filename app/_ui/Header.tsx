"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart/store";
import { ButtonLink } from "./Button";
import { Icon } from "./Icon";
import styles from "./Header.module.css";

// Encabezado (Manual · 10.01): logo a la izquierda, navegación corta, "Arma tu kit" y carrito.

const NAV = [
  { href: "/vinos", label: "Vinos" },
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/envios", label: "Envíos" },
];

/** `cartCount` solo para la página de componentes; en la tienda se lee del carrito guardado. */
export function Header({ cartCount: forcedCount }: { cartCount?: number }) {
  const [open, setOpen] = useState(false);
  const { kits } = useCart();
  const cartCount = forcedCount ?? kits.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo} aria-label="Viviendo Vino, inicio">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG maestro del logotipo */}
          <img src="/brand/logo-color.svg" alt="" width={786} height={250} />
        </Link>

        <nav className={`${styles.nav} ${open ? styles.open : ""}`} id="menu-principal" aria-label="Principal">
          <ul>
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={styles.navLink} onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <ButtonLink href="/arma-tu-kit" className={styles.cta}>
            Arma tu kit
          </ButtonLink>
          <Link href="/carrito" className={styles.cart} aria-label={`Carrito, ${cartCount} ${cartCount === 1 ? "kit" : "kits"}`}>
            <Icon name="box" size={22} />
            {cartCount > 0 && <span className={styles.count}>{cartCount}</span>}
          </Link>
          <button
            type="button"
            className={styles.menuBtn}
            aria-expanded={open}
            aria-controls="menu-principal"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? "close" : "menu"} size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}
