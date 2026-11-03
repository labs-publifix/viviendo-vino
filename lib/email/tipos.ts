// Tipos de correo que se registran (correos_enviados). Puro, para usarlo en el panel, el servidor y las pruebas.

export type TipoCorreo = "pedido_confirmado" | "pedido_enviado" | "pedido_entregado" | "pedido_equipo" | "pedido_pago_rechazado" | "quiz_perfil" | "guia" | "inventario_pocas" | "inventario_agotado";

export const CORREO_LABEL: Record<TipoCorreo, string> = {
  pedido_confirmado: "Pedido confirmado",
  pedido_enviado: "Va en camino",
  pedido_entregado: "Entregado",
  pedido_equipo: "Nuevo pedido (equipo)",
  pedido_pago_rechazado: "Pago no aprobado",
  quiz_perfil: "Perfil del quiz",
  guia: "Guía del blog",
  inventario_pocas: "Pocas existencias (equipo)",
  inventario_agotado: "Vino agotado (equipo)",
};
