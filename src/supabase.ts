import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nyyxpymsnpznpfemodpd.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_qec1Koj05rKwvGd1kdRrXQ_l5SThU8T';

export const supabase = createClient(supabaseUrl, supabaseKey);
