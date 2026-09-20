import { useEffect, useState } from "react";
import { useMemberAuth } from "./memberAuth";
import { supabase } from "../supabase";

// Paid access has no optimistic role fallback. The server remains authoritative.
export function useG3AssistAccess() {
  const { profile } = useMemberAuth();
  const identity = profile?.active ? `${profile.id}:${profile.role}` : "";
  const [state, setState] = useState({ identity: "", allowed: false, loading: true });
  useEffect(() => {
    let active = true;
    let sequence = 0;
    async function refresh() {
      const request = ++sequence;
      setState({ identity, allowed: false, loading: Boolean(identity) });
      if (!identity) return;
      try {
        const { data, error } = await supabase.rpc("has_permission", { requested_permission: "use_g3_assist" });
        if (active && request === sequence) setState({ identity, allowed: !error && data === true, loading: false });
      } catch {
        if (active && request === sequence) setState({ identity, allowed: false, loading: false });
      }
    }
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("g3-permissions-changed", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => { active = false; window.removeEventListener("focus", refresh); window.removeEventListener("g3-permissions-changed", refresh); document.removeEventListener("visibilitychange", visible); };
  }, [identity]);
  return { allowed: Boolean(identity) && state.identity === identity && state.allowed, loading: Boolean(identity) && (state.identity !== identity || state.loading) };
}
