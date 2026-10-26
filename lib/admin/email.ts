import "server-only";
import { Resend } from "resend";
import { renderBrandEmail } from "@/lib/email/brand-layout";

// Correo con el enlace para crear o recuperar la contraseña del panel, con la plantilla de marca.

export async function sendPasswordLink(to: string, nombre: string, url: string, primera: boolean) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Faltan RESEND_API_KEY o EMAIL_FROM");
  const subject = primera ? "Crea tu contraseña del panel de Viviendo Vino" : "Crea una contraseña nueva para el panel";
  const { html, text } = renderBrandEmail({
    title: subject,
    preheader: "El enlace vence en una hora.",
    eyebrow: "Panel de administración",
    heading: primera ? `Hola, ${nombre}` : "Contraseña nueva",
    paragraphs: [
      primera ? "Ya tienes acceso al panel de Viviendo Vino. Crea tu contraseña con el botón de abajo." : "Pediste crear una contraseña nueva para el panel. Usa el botón de abajo.",
      "El enlace vence en una hora y solo funciona una vez. Si no lo pediste, ignora este correo: tu contraseña actual no cambia.",
    ],
    cta: { label: "Crear mi contraseña", url },
    reason: "Recibes este correo porque tienes acceso al panel de administración de viviendovino.com.",
  });
  const { error } = await new Resend(apiKey).emails.send({ from, to, subject, html, text });
  if (error) throw new Error(`${error.name}: ${error.message}`);
}
