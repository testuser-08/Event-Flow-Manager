import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
  voice_note_url: string | null;
  created_at: string;
};

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export function useMessages(channelId?: string) {
  const [messages, setMessages] = useState<SupabaseMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    if (!channelId) return;

    let mounted = true;
    let hasConnectedOnce = false;

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
          if (mounted) setMessages((prev) => [...prev, payload.new as SupabaseMessage]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          if (mounted) setMessages((prev) =>
            prev.map((msg) => msg.id === payload.new.id ? (payload.new as SupabaseMessage) : msg)
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          if (mounted) setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        if (!mounted) return;
        if (status === 'SUBSCRIBED') {
          hasConnectedOnce = true;
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus(hasConnectedOnce ? 'reconnecting' : 'disconnected');
        } else if (status === 'CLOSED') {
          setConnectionStatus(hasConnectedOnce ? 'reconnecting' : 'disconnected');
        } else {
          setConnectionStatus(hasConnectedOnce ? 'reconnecting' : 'connecting');
        }
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  const removeMessage = (id: string) => setMessages((prev) => prev.filter((m) => m.id !== id));
  const resolveMessage = (id: string) =>
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, is_resolved: true } : m));

  return { messages, loading, connectionStatus, removeMessage, resolveMessage };
}
