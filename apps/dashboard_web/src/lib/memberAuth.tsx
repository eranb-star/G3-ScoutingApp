import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { Capacitor, registerPlugin } from "@capacitor/core";

const G3Push = registerPlugin<{ getToken(): Promise<{ token: string }> }>("G3Push");

export type TeamRole = "member" | "mentor" | "admin";

export type MemberProfile = {
  id: string;
  email: string;
  display_name: string;
  role: TeamRole;
  subteam: string | null;
  subteams: string[];
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

  const loadProfile = async (activeSession: Session | null) => {
    setSession(activeSession);
    setProfile(null);
    setProfileError("");
    if (!activeSession?.user) return;

    const { data, error } = await supabase
      .from("team_members")
      .select("id,email,display_name,role,subteam,subteams,active,must_change_password,language")
      .eq("id", activeSession.user.id)
      .maybeSingle();

    if (error) {
      setProfileError(error.message);
      return;
    }
    if (!data) {
      setProfileError("This account is not connected to an approved G3 team member.");
      return;
    }
    setProfile(data as MemberProfile);
  };

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession();
    await loadProfile(data.session);
  };

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      await loadProfile(data.session);
      if (alive) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(async () => {
        if (!alive) return;
        await loadProfile(nextSession);
        if (alive) setLoading(false);
      }, 0);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!profile?.active || profile.must_change_password || Capacitor.getPlatform() !== "android") return;
    G3Push.getToken().then(({ token }) => supabase.from("push_tokens").upsert({ token, member_id: profile.id, platform: "android", active: true, updated_at: new Date().toISOString() })).catch(() => undefined);
  }, [profile?.id, profile?.active, profile?.must_change_password]);

  const value = useMemo(
    () => ({ loading, session, profile, profileError, refreshProfile }),
    [loading, session, profile, profileError]
  );
  return <MemberAuthContext.Provider value={value}>{children}</MemberAuthContext.Provider>;
}

export function useMemberAuth() {
  const value = useContext(MemberAuthContext);
  if (!value) throw new Error("useMemberAuth must be used inside MemberAuthProvider");
  return value;
}
