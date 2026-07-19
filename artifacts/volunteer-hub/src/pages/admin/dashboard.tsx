import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGetActiveAlerts, useGetChannelsSummary } from '@workspace/api-client-react';
import { getGetActiveAlertsQueryKey, getGetChannelsSummaryQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'wouter';
import { ShieldAlert, AlertTriangle, AlertCircle, Check, Send, Users, WifiOff, Wifi, LayoutList, Megaphone } from 'lucide-react';
import { format } from 'date-fns';
import type { ConnectionStatus } from '@/hooks/use-messages';
import { toast } from 'sonner';
import ScheduleEditor from './schedule-editor';
import { useBroadcast } from '@/contexts/BroadcastContext';
import VoiceRecorder, { MicButton } from '@/components/shared/VoiceRecorder';
import VoicePlayer from '@/components/shared/VoicePlayer';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('vhub_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiPost(path: string, body: unknown) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  } catch {
    return { ok: false, data: { error: 'Network error. Please check your connection.' } };
  }
}

async function apiPatch(path: string, body: unknown) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  } catch {
    return { ok: false, data: { error: 'Network error. Please check your connection.' } };
  }
}

export default function AdminDashboard() {
  const { volunteer } = useAuth();
  const queryClient = useQueryClient();

  const { data: alerts, isLoading: loadingAlerts } = useGetActiveAlerts();
  const { data: channels, isLoading: loadingChannels } = useGetChannelsSummary();

  const { sendBroadcast } = useBroadcast();

  const [broadcastText, setBroadcastText] = useState('');
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [broadcastVoiceUrl, setBroadcastVoiceUrl] = useState<string | null>(null);
  const [showBroadcastRecorder, setShowBroadcastRecorder] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<ConnectionStatus>('connecting');
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let mounted = true;
    let hasConnectedOnce = false;
    const channel = supabase.channel('alerts-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, (payload) => {
        if (!mounted) return;
        queryClient.invalidateQueries({ queryKey: getGetActiveAlertsQueryKey() });
        if (payload.eventType === 'INSERT' && payload.new.status === 'active') playBeep();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        if (!mounted) return;
        queryClient.invalidateQueries({ queryKey: getGetChannelsSummaryQueryKey() });
      })
      .subscribe((status) => {
        if (!mounted) return;
        if (status === 'SUBSCRIBED') {
          hasConnectedOnce = true;
          setRealtimeStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeStatus(hasConnectedOnce ? 'reconnecting' : 'disconnected');
        } else {
          setRealtimeStatus(hasConnectedOnce ? 'reconnecting' : 'connecting');
        }
      });
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [queryClient]);

  const playBeep = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  };

  const handleAcknowledge = async (alertId: string) => {
    if (!volunteer) return;
    const { ok } = await apiPatch(`/api/alerts/${alertId}`, { status: 'acknowledged' });
    if (!ok) { toast.error('Could not acknowledge alert. Please try again.'); return; }
    queryClient.invalidateQueries({ queryKey: getGetActiveAlertsQueryKey() });
  };

  const handleResolveAlert = async (alertId: string) => {
    if (!volunteer) return;
    const { ok } = await apiPatch(`/api/alerts/${alertId}`, { status: 'resolved' });
    if (!ok) { toast.error('Could not resolve alert. Please try again.'); return; }
    queryClient.invalidateQueries({ queryKey: getGetActiveAlertsQueryKey() });
  };

  const allSelected = !!channels && selectedChannelIds.length === channels.length && channels.length > 0;

  const toggleAllChannels = () => {
    setSelectedChannelIds(allSelected ? [] : (channels?.map(c => c.id) ?? []));
  };

  const toggleChannel = (id: string) => {
    setSelectedChannelIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const prepareBroadcast = () => {
    if (selectedChannelIds.length === 0 || (!broadcastText.trim() && !broadcastVoiceUrl)) return;
    if (selectedChannelIds.length > 1) {
      setShowConfirm(true);
    } else {
      executeBroadcast();
    }
  };

  const executeBroadcast = async () => {
    if (!volunteer || !channels) return;
    setShowConfirm(false);
    setIsBroadcasting(true);

    const targetChannels = channels.filter(c => selectedChannelIds.includes(c.id));

    try {
      // Post a persistent message to each selected channel
      for (const ch of targetChannels) {
        const { ok, data } = await apiPost('/api/messages', {
          channel_id: ch.id,
          content: broadcastText.trim() || '📢 Voice broadcast',
          urgency: 'info',
          voice_note_url: broadcastVoiceUrl,
        });
        if (!ok) {
          toast.error(`Failed to post to ${ch.name}: ${data?.error ?? 'Unknown error'}`);
        }
      }

      // Fire the real-time announcement popup on all volunteer clients
      await sendBroadcast({
        text: broadcastText.trim(),
        voiceNoteUrl: broadcastVoiceUrl,
        targetChannelNames: targetChannels.map(c => c.name),
        senderName: volunteer.name,
      });

      toast.success(`Broadcast sent to ${targetChannels.length} channel${targetChannels.length !== 1 ? 's' : ''}!`);
      setBroadcastText('');
      setBroadcastVoiceUrl(null);
      setSelectedChannelIds([]);
    } catch (err) {
      console.error('Broadcast failed:', err);
      toast.error('Broadcast failed. Please try again.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const activeAlerts = alerts?.filter(a => a.status === 'active' || a.status === 'acknowledged') || [];
  const hasActiveAlerts = activeAlerts.length > 0;

  const sortedChannels = channels ? [...channels].sort((a, b) => {
    if (a.open_urgents !== b.open_urgents) return b.open_urgents - a.open_urgents;
    if (a.open_issues !== b.open_issues) return b.open_issues - a.open_issues;
    return a.name.localeCompare(b.name);
  }) : [];

  return (
    <div className="flex-1 flex flex-col h-full bg-muted/20 overflow-y-auto">
      {/* Top Nav */}
      <div className="bg-card border-b-2 border-border p-3 flex items-center justify-between shrink-0">
        <h1 className="font-black text-xl uppercase tracking-tighter flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-destructive" /> Admin Control
        </h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/workstreams">
            <Button variant="outline" size="sm" className="border-2 rounded-none font-bold uppercase gap-2">
              <LayoutList className="w-4 h-4" /> Teams
            </Button>
          </Link>
          <Link href="/admin/roster">
            <Button variant="outline" size="sm" className="border-2 rounded-none font-bold uppercase gap-2">
              <Users className="w-4 h-4" /> Roster
            </Button>
          </Link>
        </div>
      </div>

      {/* Reconnect banner */}
      {(realtimeStatus === 'reconnecting' || realtimeStatus === 'disconnected') && (
        <div className="bg-amber-500 text-black text-xs font-bold font-mono uppercase tracking-wider px-3 py-1.5 flex items-center gap-2 shrink-0 animate-pulse">
          <WifiOff className="w-3 h-3" /> Reconnecting to live alerts…
        </div>
      )}
      {realtimeStatus === 'connecting' && (
        <div className="bg-muted text-muted-foreground text-xs font-mono px-3 py-1 flex items-center gap-2 shrink-0">
          <Wifi className="w-3 h-3" /> Connecting…
        </div>
      )}

      <div className="p-4 space-y-6">
        {/* ── Active Alerts ── */}
        <section>
          {/* Section header — always visible; pulses red when alerts are active */}
          <div className={`flex items-center gap-2 mb-3 px-3 py-2 -mx-0 rounded-sm ${
            hasActiveAlerts
              ? 'bg-red-600 text-white'
              : 'bg-transparent'
          }`}>
            <AlertTriangle className={`w-4 h-4 shrink-0 ${hasActiveAlerts ? 'text-white' : 'text-red-600'}`} />
            <h2 className={`font-mono text-xs font-black uppercase tracking-wider flex-1 ${hasActiveAlerts ? 'text-white' : 'text-muted-foreground'}`}>
              Active Alerts
            </h2>
            {hasActiveAlerts && (
              <span className="bg-white text-red-600 text-xs font-black px-2 py-0.5 rounded-sm animate-pulse">
                {activeAlerts.length} LIVE
              </span>
            )}
          </div>

          {loadingAlerts ? (
            <div className="font-mono text-sm text-muted-foreground">Loading alerts...</div>
          ) : !hasActiveAlerts ? (
            <div className="bg-card border-2 border-border p-4 text-sm text-muted-foreground font-mono text-center">
              No active alerts — all clear ✓
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border-4 p-4 alert-active-pulse ${
                    alert.status === 'active'
                      ? 'bg-red-50 dark:bg-red-950 border-red-600'
                      : 'bg-amber-50 dark:bg-amber-950 border-amber-500'
                  }`}
                >
                  {/* Status strip */}
                  <div className={`text-[10px] font-black uppercase tracking-widest mb-2 font-mono ${
                    alert.status === 'active' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {alert.status === 'active' ? '🚨 ACTIVE — NEEDS ATTENTION' : '⏳ ACKNOWLEDGED'}
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 border ${
                          alert.status === 'active'
                            ? 'bg-red-600 text-white border-red-800'
                            : 'bg-amber-500 text-black border-amber-700'
                        }`}>
                          {alert.channel_name}
                        </span>
                      </div>
                      <p className="font-bold text-base leading-snug mt-1">{alert.note}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1.5">
                        {alert.sender_name} • {format(new Date(alert.created_at), 'HH:mm')}
                        {alert.status === 'acknowledged' && alert.acknowledged_by_name && (
                          <> • Ack'd by {alert.acknowledged_by_name}</>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {alert.status === 'active' && (
                        <Button size="sm" variant="outline" className="border-2 rounded-none font-bold uppercase text-xs h-8 whitespace-nowrap" onClick={() => handleAcknowledge(alert.id)}>
                          <Check className="w-3 h-3 mr-1" /> Ack
                        </Button>
                      )}
                      <Button size="sm" variant="default" className="border-2 rounded-none font-bold uppercase text-xs h-8 whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 border-emerald-800" onClick={() => handleResolveAlert(alert.id)}>
                        <Check className="w-3 h-3 mr-1" /> Resolve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Channel Overview ── */}
        <section>
          <h2 className="font-mono text-xs font-bold uppercase text-muted-foreground mb-3">Channel Overview</h2>
          {loadingChannels ? (
            <div className="font-mono text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-2">
              {sortedChannels.map((ch) => (
                <Link key={ch.id} href={`/channels/${ch.slug}`}>
                  <div className={`bg-card border-2 p-3 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer ${
                    ch.open_urgents > 0 ? 'border-red-500 border-l-4' : ch.open_issues > 0 ? 'border-amber-400 border-l-4' : 'border-border'
                  }`}>
                    <span className="font-bold text-sm uppercase">{ch.name}</span>
                    <div className="flex items-center gap-2">
                      {ch.open_urgents > 0 && (
                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 flex items-center gap-1 border border-red-800 rounded-sm">
                          <AlertTriangle className="w-3 h-3" />{ch.open_urgents}
                        </span>
                      )}
                      {ch.open_issues > 0 && (
                        <span className="bg-amber-500 text-black text-xs font-bold px-2 py-0.5 flex items-center gap-1 border border-amber-700 rounded-sm">
                          <AlertCircle className="w-3 h-3" />{ch.open_issues}
                        </span>
                      )}
                      {ch.open_urgents === 0 && ch.open_issues === 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">✓ Clear</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Broadcast ── */}
        <section>
          <h2 className="font-mono text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
            <Megaphone className="w-3.5 h-3.5" /> Broadcast Message
          </h2>

          {/* Channel selector */}
          <div className="bg-card border-2 border-border p-3 mb-3 space-y-2">
            <p className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Send to:</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleAllChannels}
                className={`h-9 min-w-[3rem] px-3 border-2 font-bold uppercase text-xs transition-all ${
                  allSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted'
                }`}
              >
                All
              </button>
              {channels?.map(ch => {
                const sel = selectedChannelIds.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleChannel(ch.id)}
                    className={`h-9 px-3 border-2 font-bold uppercase text-xs transition-all ${
                      sel ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted'
                    }`}
                  >
                    {ch.name}
                  </button>
                );
              })}
            </div>
            {selectedChannelIds.length === 0 && (
              <p className="text-[10px] text-muted-foreground font-mono">Select at least one channel.</p>
            )}
          </div>

          {/* Message + voice note */}
          <div className="space-y-2">
            <textarea
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="Type announcement... (optional if sending a voice note)"
              rows={3}
              className="w-full border-2 border-border bg-card p-3 font-sans text-sm resize-none focus:outline-none focus:border-primary"
            />

            {showBroadcastRecorder ? (
              <VoiceRecorder
                uploadFolder="broadcast"
                onSend={(url) => { setBroadcastVoiceUrl(url); setShowBroadcastRecorder(false); }}
                onCancel={() => setShowBroadcastRecorder(false)}
                disabled={isBroadcasting}
              />
            ) : broadcastVoiceUrl ? (
              <div className="flex items-center gap-2 bg-muted p-2 border-2 border-border">
                <VoicePlayer src={broadcastVoiceUrl} compact className="flex-1" />
                <button
                  type="button"
                  onClick={() => setBroadcastVoiceUrl(null)}
                  className="text-destructive font-bold uppercase text-[10px] hover:underline shrink-0 font-mono"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <MicButton onClick={() => setShowBroadcastRecorder(true)} disabled={isBroadcasting} />
                <span className="text-[10px] font-mono text-muted-foreground">Add voice note</span>
              </div>
            )}

            <Button
              type="button"
              onClick={prepareBroadcast}
              disabled={isBroadcasting || selectedChannelIds.length === 0 || (!broadcastText.trim() && !broadcastVoiceUrl)}
              className="w-full h-11 rounded-none border-2 border-primary font-bold uppercase gap-2"
            >
              <Megaphone className="w-4 h-4" />
              {isBroadcasting
                ? 'Broadcasting…'
                : selectedChannelIds.length === 0
                  ? 'Select channels to broadcast'
                  : `Broadcast to ${selectedChannelIds.length} channel${selectedChannelIds.length !== 1 ? 's' : ''}`
              }
            </Button>
          </div>
        </section>

        {/* Broadcast confirmation dialog */}
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent className="rounded-none border-2 border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black uppercase flex items-center gap-2">
                <Megaphone className="w-5 h-5" /> Confirm Broadcast
              </AlertDialogTitle>
              <AlertDialogDescription>
                Send to{' '}
                <strong>{selectedChannelIds.length} channels</strong>:{' '}
                {channels?.filter(c => selectedChannelIds.includes(c.id)).map(c => c.name).join(', ')}.
                {broadcastVoiceUrl && ' Includes a voice note.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-none border-2">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={executeBroadcast} className="rounded-none border-2">
                Send Broadcast
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Event Schedule ── */}
        <ScheduleEditor />
      </div>
    </div>
  );
}
