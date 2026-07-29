export const SUPABASE_URL = "https://ueqdkiwouxhhdhdmjlsl.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_nLAyyfVIBq_eM3TzZQHb-g_EV-knjl-";

export function createBackend(supabase = window.supabase) {
  if (!supabase?.createClient) return null;
  return supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}
