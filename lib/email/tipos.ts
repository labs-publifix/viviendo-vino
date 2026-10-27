// Tipos de correo que se registran (correos_enviados). Puro, para usarlo en el panel, el servidor y las pruebas.

export type TipoCorreo = "pedido_confirmado" | "pedido_enviado" | "pedido_entregado" | "pedido_equipo" | "quiz_perfil" | "guia";

export const CORREO_LABEL: Record<TipoCorreo, string> = {
  pedido_confirmado: "Pedido confirmado",
  pedido_enviado: "Va en camino",
  pedido_entregado: "Entregado",
  pedido_equipo: "Nuevo pedido (equipo)",
  quiz_perfil: "Perfil del quiz",
  guia: "Guía del blog",
};
