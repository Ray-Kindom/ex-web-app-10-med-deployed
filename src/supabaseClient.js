import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SUPABASE CONFIGURATION
// Replace the values below with your project URL and publishable/anon API key.
// ============================================================================

// 1. Paste your Supabase Project URL here:
const SUPABASE_URL = "https://pulzsiyjvnshychyxuix.supabase.co";

// 2. Paste your Supabase Anon / Public API Key here:
const SUPABASE_PUBLIC_KEY = "sb_publishable_m28aWJJe6dXa5kZHV1NU8w_BMDt2uz5";

// Create and export the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
