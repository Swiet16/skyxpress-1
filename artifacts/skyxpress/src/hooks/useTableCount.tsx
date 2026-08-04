import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the exact row count for a table using Supabase's
 * `count: 'exact'` option, bypassing the default 1000-row fetch limit.
 *
 * Each hook instance subscribes on a UUID-suffixed channel so multiple
 * calls for the same table never collide on an already-subscribed channel.
 */
export const useTableCount = (table: string, filter?: { column: string; value: any }) => {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // Stable unique channel name per hook instance — avoids the
  // "cannot add postgres_changes after subscribe()" Supabase error.
  const channelId = useRef(`${table}_count_${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let cancelled = false;

    const fetchCount = async () => {
      try {
        // @ts-ignore -- dynamic table name
        let query = (supabase as any).from(table).select('*', { count: 'exact', head: true });
        if (filter) {
          query = query.eq(filter.column, filter.value);
        }
        const { count: total, error } = await query;
        if (error) throw error;
        if (!cancelled) setCount(total ?? 0);
      } catch (err) {
        console.error(`useTableCount(${table}) error:`, err);
        if (!cancelled) setCount(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCount();

    const channel = supabase
      .channel(channelId.current)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        fetchCount();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter?.column, filter?.value]);

  return { count, loading };
};
