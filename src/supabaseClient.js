import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SUPABASE CONFIGURATION
// Replace the values below with your project URL and publishable/anon API key.
// ============================================================================

// 1. Supabase Project URL (reads from env or defaults to pulzsiyjvnshychyxuix)
const SUPABASE_URL = (
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && (process?.env?.VITE_SUPABASE_URL || process?.env?.SUPABASE_URL)) ||
  "https://pulzsiyjvnshychyxuix.supabase.co"
).trim();

// 2. Supabase Anon / Publishable API Key
const SUPABASE_PUBLIC_KEY = (
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && (process?.env?.VITE_SUPABASE_ANON_KEY || process?.env?.SUPABASE_PUBLISHABLE_KEY)) ||
  "sb_publishable_m28aWJJe6dXa5kZHV1NU8w_BMDt2uz5"
).trim();

// Create and export the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
