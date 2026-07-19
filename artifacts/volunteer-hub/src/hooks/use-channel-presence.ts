import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type PresenceUser = {
  volunteerId: string;
  name: string;
  avatarUrl: string | null;
};

/**
 * Tracks who is currently viewing this channel using Supabase Presence.
 * Enters presence when the hook mounts, leaves when it unmounts.
 */
export function useChannelPresence(
  channelId: string | undefined,
  me: { volunteerId: string; name: string; avatarUrl: string | null } | null,
) {
  const [presentUsers, setPresentUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!channelId || !me) return;

    const presenceChannel = supabase.channel(`presence-${channelId}`, {
      config: { presence: { key: me.volunteerId } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<PresenceUser>();
        // Each key maps to an array of payloads — flatten and dedupe by volunteerId
        const seen = new Set<string>();
        const users: PresenceUser[] = [];
        for (const presences of Object.values(state)) {
          for (const p of presences as PresenceUser[]) {
            if (!seen.has(p.volunteerId)) {
              seen.add(p.volunteerId);
              users.push(p);
            }
          }
        }
        setPresentUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            volunteerId: me.volunteerId,
            name: me.name,
            avatarUrl: me.avatarUrl,
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, me?.volunteerId]);

  return presentUsers;
}
