
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Credentials provided by user
const supabaseUrl = "https://qsnwodjdvfnxnpmdgldf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzbndvZGpkdmZueG5wbWRnbGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTMxNzUsImV4cCI6MjA3OTcyOTE3NX0.UGk5WbmZrZOhS2MbL4MAk_t5kvRLr4R1OvKa32sqlro";

// Determine if we should run in Mock Mode
// Checks if keys are undefined, null, or empty strings
export const isMockMode = !supabaseUrl || !supabaseKey || supabaseUrl.trim() === '' || supabaseKey.trim() === '';

let client: SupabaseClient | null = null;

if (!isMockMode) {
  try {
    client = createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    // Client remains null, services should handle this by checking isMockMode
  }
} else {
  console.warn("⚠️ Supabase credentials not found. Running in MOCK MODE. Data will not be saved.");
}

export const supabase = client;
