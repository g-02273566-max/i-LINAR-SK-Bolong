import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nyyxpymsnpznpfemodpd.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eXhweW1zbnB6bnBmZW1vZHBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NjgzMzEsImV4cCI6MjA5MTU0NDMzMX0.aXBi7wtWOXaVqk9AdFvXDIMhOj3ZXh0bkViVBeBCy3s';

export const supabase = createClient(supabaseUrl, supabaseKey);
