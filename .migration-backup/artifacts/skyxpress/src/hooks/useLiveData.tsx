import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseLiveDataOptions {
  table: string;
  filter?: { column: string; value: any };
  orderBy?: { column: string; ascending?: boolean };
}

export const useLiveData = <T,>({ table, filter, orderBy }: UseLiveDataOptions) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel;

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        // @ts-ignore -- dynamic table name not in Supabase generated types
        let query = (supabase as any).from(table).select('*');

        if (filter) {
          query = query.eq(filter.column, filter.value);
        }

        if (orderBy) {
          query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
        }

        const { data: initialData, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setData((initialData as T[]) || []);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching initial data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel(`${table}_changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
          },
          (payload) => {
            console.log('Real-time update received:', payload);
            
            if (payload.eventType === 'INSERT') {
              setData(current => {
                const newData = [payload.new as T, ...current];
                if (orderBy) {
                  return newData.sort((a: any, b: any) => {
                    const aVal = a[orderBy.column];
                    const bVal = b[orderBy.column];
                    if (orderBy.ascending) {
                      return aVal > bVal ? 1 : -1;
                    } else {
                      return aVal < bVal ? 1 : -1;
                    }
                  });
                }
                return newData;
              });
            } else if (payload.eventType === 'UPDATE') {
              setData(current =>
                current.map(item =>
                  (item as any).id === payload.new.id ? (payload.new as T) : item
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setData(current =>
                current.filter(item => (item as any).id !== payload.old.id)
              );
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
        });
    };

    fetchInitialData();
    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [table, filter?.column, filter?.value, orderBy?.column, orderBy?.ascending]);

  const refresh = async () => {
    setLoading(true);
    try {
      // @ts-ignore -- dynamic table name not in Supabase generated types
      let query = (supabase as any).from(table).select('*');

      if (filter) {
        query = query.eq(filter.column, filter.value);
      }

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
      }

      const { data: refreshedData, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setData((refreshedData as T[]) || []);
      setError(null);
    } catch (err: any) {
      console.error('Error refreshing data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refresh };
};

export default useLiveData;

