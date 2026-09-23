"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOut() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="ml-auto shrink-0 rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:text-slate-200"
      title="Cerrar sesión"
    >
      Salir
    </button>
  );
}
