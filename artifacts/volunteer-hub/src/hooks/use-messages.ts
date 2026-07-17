import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Message } from '@workspace/api-client-react/src/generated/api.schemas';
// Fallback for Message if it's not exported correctly, but we define it here based on requirements:
export type SupabaseMessage = {
  id: string;
  channel_id: string;
  user_id: string;
  sender_name: string;
  content: string;
  urgency: 'info' | 'issue' | 'urgent';
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  photo_url: string | null;
  created_at: string;
};

export function useMessages(channelId?: string) {
  const [messages, setMessages] = useState<SupabaseMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelId) return;

    let mounted = true;
    
    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error('Error fetching messages:', error);
      } else if (mounted) {
        setMessages(data as SupabaseMessage[]);
      }
      if (mounted) setLoading(false);
    };

    fetchMessages();

    const channel = supabase.channel(`messages-${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          if (mounted) {
            setMessages((prev) => [...prev, payload.new as SupabaseMessage]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          if (mounted) {
            setMessages((prev) => 
              prev.map((msg) => msg.id === payload.new.id ? (payload.new as SupabaseMessage) : msg)
            );
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  return { messages, loading };
}
