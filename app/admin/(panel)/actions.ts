"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/admin/audit";
import { endSession, getAdmin } from "@/lib/admin/session";

export async function logout() {
  const user = await getAdmin();
  if (user) await audit(user, "salir", "sesion", user.id);
  await endSession();
  redirect("/admin/acceso?aviso=salida");
}
