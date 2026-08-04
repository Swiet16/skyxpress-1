import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the exact row count for a table using Supabase's
 * `count: 'exact'` option, which bypasses the default 1000-row
 * fetch limit and gives the true total.
 */
export const useTableCount = (table: string, filter?: { column: string; value: any }) => {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCount = async () => {
    try {
      // @ts-ignore -- dynamic table name
      let query = (supabase as any).from(table).select('*', { count: 'exact', head: true });
      if (filter) {
        query = query.eq(filter.column, filter.value);
      }
      const { count: total, error } = await query;
      if (error) throw error;
      setCount(total ?? 0);
    } catch (err) {
      console.error(`useTableCount(${table}) error:`, err);
      setCount(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();

    // Re-count on any table change
    const channel = supabase
      .channel(`${table}_count`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [table, filter?.column, filter?.value]);

  return { count, loading };
};
