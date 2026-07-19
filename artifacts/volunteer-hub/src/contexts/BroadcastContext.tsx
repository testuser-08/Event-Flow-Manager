/**
 * BroadcastContext — global Supabase Realtime Broadcast subscription.
 *
 * Wraps the entire authenticated app. Provides:
 *   - `sendBroadcast(payload)` for admins to fire an announcement
 *   - An in-app announcement banner shown to targeted volunteers
 *
 * Channel targeting: the payload carries `targetChannelNames`. Each volunteer's
 * workstreams are compared; admins always receive every broadcast.
 */
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { X, Megaphone } from 'lucide-react';
import VoicePlayer from '@/components/shared/VoicePlayer';

// ── Types ──────────────────────────────────────────────────────────────────

export interface BroadcastPayload {
  text: string;
  voiceNoteUrl?: string | null;
  targetChannelNames: string[];
  senderName: string;
}

interface BroadcastContextValue {
  /** Send a broadcast to all connected clients. Admin only. */
  sendBroadcast: (payload: BroadcastPayload) => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────

const BroadcastContext = createContext<BroadcastContextValue>({
  sendBroadcast: async () => {},
});

export function useBroadcast() {
  return useContext(BroadcastContext);
}

// ── Banner ─────────────────────────────────────────────────────────────────

function AnnouncementBanner({
  payload,
  onDismiss,
}: {
  payload: BroadcastPayload;
  onDismiss: () => void;
}) {
  const allChannels = payload.targetChannelNames.length === 0;

  return (
    /* Full-screen overlay */
    <div className="fixed inset-0 z-[300] flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 pt-8 sm:pt-16 animate-in fade-in duration-200">
      {/* Card — slides in from top */}
      <div className="w-full max-w-md bg-card border-4 border-primary shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] animate-in slide-in-from-top-4 duration-300">
        {/* Header strip */}
        <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 shrink-0" />
            <span className="font-black text-sm uppercase tracking-widest">Broadcast</span>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-sm opacity-80 hover:opacity-100 transition-opacity focus:outline-none"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Sender */}
          <p className="text-xs font-mono text-muted-foreground uppercase font-bold tracking-wider">
            From {payload.senderName}
          </p>

          {/* Message text */}
          {payload.text && (
            <p className="text-base font-semibold leading-snug whitespace-pre-wrap">
              {payload.text}
            </p>
          )}

          {/* Voice note */}
          {payload.voiceNoteUrl && (
            <div className="bg-muted/50 border border-border p-2 rounded-sm">
              <VoicePlayer src={payload.voiceNoteUrl} />
            </div>
          )}

          {/* Channel tags */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {allChannels ? (
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">
                All Channels
              </span>
            ) : (
              payload.targetChannelNames.map((name) => (
                <span
                  key={name}
                  className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-muted border border-border text-muted-foreground"
                >
                  {name}
                </span>
              ))
            )}
          </div>

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="w-full mt-2 h-11 border-2 border-border font-bold uppercase text-sm hover:bg-muted transition-colors focus:outline-none"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Provider ───────────────────────────────────────────────────────────────

export function BroadcastProvider({ children }: { children: ReactNode }) {
  const { volunteer } = useAuth();
  const [pending, setPending] = useState<BroadcastPayload | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!volunteer) return; // don't subscribe until logged in

    const channel = supabase.channel('global-broadcasts');
    channel
      .on('broadcast', { event: 'announcement' }, ({ payload }: { payload: BroadcastPayload }) => {
        // Decide if this volunteer should see the popup:
        // Admins always see it; others must be in at least one target channel.
        const targeted =
          volunteer.isAdmin ||
          payload.targetChannelNames.some((ch) =>
            volunteer.workstreams.includes(ch)
          );
        if (targeted) {
          setPending(payload);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [volunteer?.volunteerId]); // re-subscribe if user changes

  const sendBroadcast = async (payload: BroadcastPayload) => {
    if (!channelRef.current) return;
    await channelRef.current.send({
      type: 'broadcast',
      event: 'announcement',
      payload,
    });
  };

  return (
    <BroadcastContext.Provider value={{ sendBroadcast }}>
      {children}
      {pending && (
        <AnnouncementBanner payload={pending} onDismiss={() => setPending(null)} />
      )}
    </BroadcastContext.Provider>
  );
}
