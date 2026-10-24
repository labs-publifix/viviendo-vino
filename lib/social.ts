// Redes de Viviendo Vino, en el orden en que se muestran (pie, menú móvil y sección de la portada).
// Instagram es el canal principal: ahí vive la comunidad (más de 30 mil seguidores, oct 2026).

export type SocialNetwork = { id: "instagram" | "facebook" | "tiktok" | "youtube"; name: string; href: string; handle?: string; note?: string };

export const SOCIAL: SocialNetwork[] = [
  { id: "instagram", name: "Instagram", href: "https://www.instagram.com/viviendovino/", handle: "@viviendovino", note: "+30 mil seguidores" },
  { id: "facebook", name: "Facebook", href: "https://www.facebook.com/profile.php?id=61594856856437" },
  { id: "tiktok", name: "TikTok", href: "https://www.tiktok.com/@viviendovino", handle: "@viviendovino" },
  { id: "youtube", name: "YouTube", href: "https://www.youtube.com/channel/UCgGlNMCqdpJNPzWtmXrJmHg" },
];
