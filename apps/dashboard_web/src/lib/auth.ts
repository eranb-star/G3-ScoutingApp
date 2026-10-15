import { supabase } from "../supabase";
import { unregisterDevicePush } from "./pushRegistration";

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  try { await unregisterDevicePush(); }
  catch (error) { return {error:error instanceof Error?error:new Error('Could not disconnect device notifications. Retry sign out.')}; }
  return supabase.auth.signOut({scope:'local'});
}

export async function getUser() {
  return supabase.auth.getUser();
}
