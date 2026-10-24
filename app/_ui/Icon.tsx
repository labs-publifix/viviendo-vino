// Íconos de trazo fino y uniforme, esquinas redondeadas (Manual · 7). Sin uvas, barricas ni corchos.
// Decorativos por defecto (aria-hidden); el texto vecino o el aria-label del botón da el significado.

const PATHS = {
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  close: "M6 6l12 12M18 6L6 18",
  check: "M5 12.5l4.5 4.5L19 7.5",
  arrow: "M5 12h14M13 6l6 6-6 6",
  menu: "M4 7h16M4 12h16M4 17h16",
  // Caja de 6
  box: "M3.5 8.5L12 4l8.5 4.5v8L12 21l-8.5-4.5v-8zM3.5 8.5L12 13l8.5-4.5M12 13v8",
  // Envío
  truck: "M3 6.5h11v9H3zM14 9.5h3.5l3 3v3h-6.5M6.5 18.5a1.5 1.5 0 1 0 0-.01M17 18.5a1.5 1.5 0 1 0 0-.01",
  // Copa
  glass: "M7.5 3.5h9c0 5-1.8 8-4.5 8.5-2.7-.5-4.5-3.5-4.5-8.5zM12 12v8M8.5 20.5h7",
  chat: "M4.5 19.5l1.2-3.6A7.5 7.5 0 1 1 8.6 18.6z",
  info: "M12 11v5M12 7.5v.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  pause: "M9 6v12M15 6v12",
  play: "M8 5.5v13l10.5-6.5z",
  // Redes sociales, en el mismo trazo fino que el resto del set.
  instagram: "M7.5 3.5h9a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17 6.9v.01",
  facebook: "M15.5 3.5h-2A3.5 3.5 0 0 0 10 7v13.5M7 10.5h7.5",
  tiktok: "M13.5 3.5v11.75a3.25 3.25 0 1 1-3.25-3.25M13.5 3.5c.4 2.6 2.2 4.4 5 4.6",
  youtube: "M4.2 7.2c.2-1.5 1.3-2.5 2.8-2.6 1.6-.1 3.3-.1 5-.1s3.4 0 5 .1c1.5.1 2.6 1.1 2.8 2.6.2 1.6.2 3.2.2 4.8s0 3.2-.2 4.8c-.2 1.5-1.3 2.5-2.8 2.6-1.6.1-3.3.1-5 .1s-3.4 0-5-.1c-1.5-.1-2.6-1.1-2.8-2.6C4 15.2 4 13.6 4 12s0-3.2.2-4.8zM10.3 9.2v5.6l4.8-2.8z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
