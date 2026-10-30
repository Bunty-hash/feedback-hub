import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True once both environment variables are set (locally in .env.local, on Vercel in Project Settings). */
export const isConfigured = Boolean(url && anonKey);

// Placeholders keep the app from crashing before configuration; nothing is sent while isConfigured is false.
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'not-configured');
