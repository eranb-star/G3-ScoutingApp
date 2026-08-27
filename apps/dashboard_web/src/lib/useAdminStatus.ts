import { useEffect, useState } from "react";
import { useMemberAuth } from "./memberAuth";
import { supabase } from "../supabase";

/** Mirrors the database authority used by RLS instead of trusting a cached role label. */
export function useAdminStatus() {
  const { profile } = useMemberAuth();
  const [isAdmin, setIsAdmin] = useState(profile?.role === "admin");

  useEffect(() => {
    let active = true;
    setIsAdmin(profile?.role === "admin");
    if (profile) {
      supabase.rpc("is_admin").then(({ data }) => {
        if (active) setIsAdmin(Boolean(data) || profile.role === "admin");
      });
    }
    return () => { active = false; };
  }, [profile?.id, profile?.role]);

  return isAdmin;
}
