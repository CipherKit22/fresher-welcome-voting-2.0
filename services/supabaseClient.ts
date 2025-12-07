import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Helper to safely get environment variables in various environments (Vite, CRA, Next.js)
const getEnvVar = (key: string) => {
  // 1. Try Vite (import.meta.env) - Priority for Vercel/Vite deployments
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const val = import.meta.env[`VITE_${key}`] || import.meta.env[key];
      if (val) return val;
    }
  } catch (e) {
    // Ignore errors in environments where import.meta is not supported
  }

  // 2. Try Standard process.env (Node/CRA/Next.js)
  try {
    if (typeof process !== 'undefined' && process.env) {
      const val = process.env[`VITE_${key}`] || process.env[key];
      if (val) return val;
    }
  } catch (e) {
    // Ignore
  }

  // 3. Fallback to window process polyfill
  try {
    if (typeof window !== 'undefined' && (window as any).process?.env) {
      return (window as any).process.env[`VITE_${key}`] || (window as any).process.env[key];
    }
  } catch (e) {}

  return '';
};

// Credentials from environment variables
const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_KEY');

// Determine if we should run in Mock Mode
// Checks if keys are undefined, null, or empty strings
export const isMockMode = !supabaseUrl || !supabaseKey || supabaseUrl.trim() === '' || supabaseKey.trim() === '';

let client: SupabaseClient | null = null;

if (!isMockMode) {
  try {
    client = createClient(supabaseUrl!, supabaseKey!);
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    // Client remains null, services should handle this by checking isMockMode
  }
} else {
  console.warn("⚠️ Supabase credentials not found. Running in MOCK MODE. Data will not be saved.");
}

export const supabase = client;