import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGetActiveAlerts, useGetChannelsSummary } from '@workspace/api-client-react';
import { getGetActiveAlertsQueryKey, getGetChannelsSummaryQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'wouter';
import { ShieldAlert, AlertTriangle, AlertCircle, Check, Send, Users } from 'lucide-react';
import { format } from 'date-fns';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

async function apiPost(path: string, body: unknown) {
  const token = localStorage.getItem('vhub_token');
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

async function apiPatch(path: string, body: unknown) {
  const token = localStorage.getItem('vhub_token');
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

export default function AdminDashboard() {
  const { volunteer } = useAuth();
  const queryClient = useQueryClient();

  const { data: alerts, isLoading: loadingAlerts } = useGetActiveAlerts();
  const { data: channels, isLoading: loadingChannels } = useGetChannelsSummary();

  const [broadcastText, setBroadcastText] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let mounted = true;
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
      .subscribe();
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
    await apiPatch(`/api/alerts/${alertId}`, { status: 'acknowledged' });
    queryClient.invalidateQueries({ queryKey: getGetActiveAlertsQueryKey() });
  };

  const handleResolveAlert = async (alertId: string) => {
    if (!volunteer) return;
    await apiPatch(`/api/alerts/${alertId}`, { status: 'resolved' });
    queryClient.invalidateQueries({ queryKey: getGetActiveAlertsQueryKey() });
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim() || !volunteer || !channels) return;

    // Find first channel to broadcast to (or a designated one)
    const target = channels[0];
    if (!target) return;

    setIsBroadcasting(true);
    try {
      await apiPost('/api/messages', {
        channel_id: target.id,
        content: broadcastText.trim(),
        urgency: 'info',
      });
      setBroadcastText('');
    } catch (err) {
      console.error('Failed to broadcast:', err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const activeAlerts = alerts?.filter(a => a.status === 'active' || a.status === 'acknowledged') || [];
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
        <Link href="/admin/roster">
          <Button variant="outline" size="sm" className="border-2 rounded-none font-bold uppercase gap-2">
            <Users className="w-4 h-4" /> Roster
          </Button>
        </Link>
      </div>

      <div className="p-4 space-y-6">
        {/* Active Alerts */}
        <section>
          <h2 className="font-mono text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-red-600" /> Active Alerts
            {activeAlerts.length > 0 && (
              <span className="bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-sm animate-pulse">
                {activeAlerts.length}
              </span>
            )}
          </h2>

          {loadingAlerts ? (
            <div className="font-mono text-sm text-muted-foreground">Loading alerts...</div>
          ) : activeAlerts.length === 0 ? (
            <div className="bg-card border-2 border-border p-4 text-sm text-muted-foreground font-mono text-center">
              No active alerts — all clear ✓
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map((alert) => (
                <div key={alert.id} className={`border-2 p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                  alert.status === 'active' ? 'bg-red-50 dark:bg-red-950 border-red-600' : 'bg-amber-50 dark:bg-amber-950 border-amber-500'
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="font-mono text-xs font-bold uppercase text-muted-foreground">{alert.channel_name}</span>
                      <p className="font-bold text-sm mt-0.5">{alert.note}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {alert.sender_name} • {format(new Date(alert.created_at), 'HH:mm')}
                        {alert.status === 'acknowledged' && alert.acknowledged_by_name && (
                          <> • Ack'd by {alert.acknowledged_by_name}</>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {alert.status === 'active' && (
                        <Button size="sm" variant="outline" className="border-2 rounded-none font-bold uppercase text-xs h-8" onClick={() => handleAcknowledge(alert.id)}>
                          <Check className="w-3 h-3 mr-1" /> Ack
                        </Button>
                      )}
                      <Button size="sm" variant="default" className="border-2 rounded-none font-bold uppercase text-xs h-8" onClick={() => handleResolveAlert(alert.id)}>
                        <Check className="w-3 h-3 mr-1" /> Resolve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Channel Overview */}
        <section>
          <h2 className="font-mono text-xs font-bold uppercase text-muted-foreground mb-3">Channel Overview</h2>
          {loadingChannels ? (
            <div className="font-mono text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-2">
              {sortedChannels.map((ch) => (
                <Link key={ch.id} href={`/channels/${ch.slug}`}>
                  <div className="bg-card border-2 border-border p-3 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer">
                    <span className="font-bold text-sm uppercase">{ch.name}</span>
                    <div className="flex items-center gap-2">
                      {ch.open_urgents > 0 && (
                        <span className="bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 flex items-center gap-1 border border-red-800">
                          <AlertTriangle className="w-3 h-3" />{ch.open_urgents}
                        </span>
                      )}
                      {ch.open_issues > 0 && (
                        <span className="bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 flex items-center gap-1 border border-amber-700">
                          <AlertCircle className="w-3 h-3" />{ch.open_issues}
                        </span>
                      )}
                      {ch.open_urgents === 0 && ch.open_issues === 0 && (
                        <span className="text-emerald-600 text-xs font-mono">All clear</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Broadcast */}
        <section>
          <h2 className="font-mono text-xs font-bold uppercase text-muted-foreground mb-3">Broadcast Message</h2>
          <form onSubmit={handleBroadcast} className="flex gap-2">
            <Input
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="Send to first channel..."
              className="border-2 h-11 rounded-none focus-visible:ring-0 focus-visible:border-primary"
            />
            <Button type="submit" disabled={isBroadcasting || !broadcastText.trim()} className="h-11 px-4 rounded-none border-2 border-primary font-bold uppercase">
              <Send className="w-4 h-4 mr-2" />
              {isBroadcasting ? 'Sending...' : 'Send'}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
