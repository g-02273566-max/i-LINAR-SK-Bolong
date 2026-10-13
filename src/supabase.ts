import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nyyxpymsnpznpfemodpd.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eXhweW1zbnB6bnBmZW1vZHBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NjgzMzEsImV4cCI6MjA5MTU0NDMzMX0.aXBi7wtWOXaVqk9AdFvXDIMhOj3ZXh0bkViVBeBCy3s';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetch all rows from a Supabase table by automatically paginating past the 1,000-row PostgREST limit.
 */
export async function fetchAllRows<T = any>(
  table: string,
  modifyQuery?: (query: any) => any
): Promise<T[]> {
  let allData: T[] = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    let query = supabase.from(table).select('*').range(from, from + pageSize - 1);
    if (modifyQuery) {
      query = modifyQuery(query);
    }
    const { data, error } = await query;
    if (error) {
      console.error(`Error fetching all rows from ${table}:`, error);
      throw error;
    }
    if (!data || data.length === 0) break;
    allData = allData.concat(data as T[]);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  
  return allData;
}
