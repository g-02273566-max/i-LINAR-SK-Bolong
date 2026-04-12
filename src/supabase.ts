import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nyyxpymsnpznpfemodpd.supabase.co';
const supabaseKey = 'sb_publishable_qec1Koj05rKwvGd1kdRrXQ_l5SThU8T';

export const supabase = createClient(supabaseUrl, supabaseKey);
