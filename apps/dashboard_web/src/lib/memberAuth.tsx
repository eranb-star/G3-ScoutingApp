import { getQaTestSession } from "./qaTestSession";
import { QaTestBanner } from "../components/QaTestAccounts";
import { Fragment, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { Capacitor } from "@capacitor/core";
import {registerDevicePush} from "./pushRegistration";



export type TeamRole = "member" | "team_leader" | "mentor" | "limited_mentor" | "admin";

export type MemberProfile = {
  id: string;
  email: string;
  display_name: string;
  role: TeamRole;
  subteam: string | null;
  subteams: string[];
  leader_subteams: string[];
  active: boolean;
  must_change_password: boolean;
  language?: "en" | "he";
};

type MemberAuthState = {
  loading: boolean;
  session: Session | null;
  profile: MemberProfile | null;
  profileError: string;
  refreshProfile: () => Promise<void>;
};

const MemberAuthContext = createContext<MemberAuthState | null>(null);

export function MemberAuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [profileError, setProfileError] = useState("");
  const profileRef = useRef<MemberProfile | null>(null);
  const requestRef = useRef(0);

  const loadProfile = async (activeSession: Session | null, clearExisting = false) => {
    const requestId = ++requestRef.current;
    setSession(activeSession);
    setProfileError("");
    if (!activeSession?.user) {
      profileRef.current = null;
      setProfile(null);
      setLoading(false);
      return;
    }
    const qa = getQaTestSession();
    if (qa && activeSession.user.id !== qa.targetId) {
      setProfile(null);
      setProfileError('QA session identity mismatch. Return to admin and start again.');
      setLoading(false);
      return;
    }
    if (clearExisting || profileRef.current?.id !== activeSession.user.id) {
      profileRef.current = null;
      setProfile(null);
    }

    const { data, error } = await supabase
      .from("team_members")
      .select("id,email,display_name,role,subteam,subteams,leader_subteams,active,must_change_password,language")
      .eq("id", activeSession.user.id)
      .maybeSingle();

    if (requestId !== requestRef.current) return;
    if (error) {
      setProfileError(error.message);
      setLoading(false);
      return;
    }
    if (!data) {
      setProfileError("This account is not connected to an approved G3 team member.");
      setLoading(false);
      return;
    }
    // Admin-issued QA login does not use or change the account's temporary password.
    profileRef.current = { ...data, must_change_password: qa ? false : data.must_change_password } as MemberProfile;
    setProfile(profileRef.current);
    setLoading(false);
  };

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession();
    await loadProfile(data.session);
  };

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      await loadProfile(data.session, true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      window.setTimeout(async () => {
        if (!alive) return;
        if (event === "SIGNED_OUT") {
          // Remove private build drafts from shared workshop devices on explicit logout.
          try {
            for (const key of Object.keys(sessionStorage)) {
              if (key.startsWith("g3-build-scope-draft:") || key.startsWith("g3-build-preparation-draft:") || key.startsWith("g3-software-review-draft:")) sessionStorage.removeItem(key);
            }
          } catch { /* Storage may be disabled by the browser. */ }
          await loadProfile(null, true);
        }
        else await loadProfile(nextSession, event === "SIGNED_IN" && profileRef.current?.id !== nextSession?.user.id);
      }, 0);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (getQaTestSession() || !profile?.active || profile.must_change_password || Capacitor.getPlatform() !== "android") return;
    const id=profile.id;const register=()=>{if(document.visibilityState==="visible")void registerDevicePush(id);};
    register();document.addEventListener("visibilitychange",register);
    return()=>document.removeEventListener("visibilitychange",register);
  }, [profile?.id, profile?.active, profile?.must_change_password]);

  useEffect(() => {
    if (!profile?.active) return;
    const channel=supabase.channel('g3-own-membership:'+profile.id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'team_members',filter:'id=eq.'+profile.id},()=>void refreshProfile()).subscribe();
    const refresh=()=>{if(document.visibilityState==='visible')void refreshProfile();};
    document.addEventListener('visibilitychange',refresh);
    return()=>{void supabase.removeChannel(channel);document.removeEventListener('visibilitychange',refresh);};
  },[profile?.id,profile?.active]);

  useEffect(() => {
    if (!profile?.active) return;
    const url = new URL(window.location.href), actionId = url.searchParams.get("g3Action");
    if (!actionId) return;
    const now = new Date().toISOString();
    void supabase.from("team_action_states").upsert({ action_id: actionId, member_id: profile.id, status: "acknowledged", acknowledged_at: now, snoozed_until: null, updated_at: now }, { onConflict: "action_id,member_id" }).then(() => window.dispatchEvent(new Event("g3-actions-changed")));
    url.searchParams.delete("g3Action");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [profile?.id, profile?.active]);

  const value = useMemo(
    () => ({ loading, session, profile, profileError, refreshProfile }),
    [loading, session, profile, profileError]
  );
  // Drop mounted private results when identity, role or team scope changes.
  const scopeKey=JSON.stringify([profile?.id,profile?.role,profile?.active,profile?.subteam,profile?.subteams,profile?.leader_subteams]);
  return <MemberAuthContext.Provider value={value}><QaTestBanner /><Fragment key={scopeKey}>{children}</Fragment></MemberAuthContext.Provider>;
}

export function useMemberAuth() {
  const value = useContext(MemberAuthContext);
  if (!value) throw new Error("useMemberAuth must be used inside MemberAuthProvider");
  return value;
}
