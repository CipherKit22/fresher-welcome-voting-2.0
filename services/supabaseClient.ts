
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

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