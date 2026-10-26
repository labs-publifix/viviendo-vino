"use server";

import { redirect } from "next/navigation";
import { endSession } from "@/lib/admin/session";

export async function logout() {
  await endSession();
  redirect("/admin/acceso?aviso=salida");
}
