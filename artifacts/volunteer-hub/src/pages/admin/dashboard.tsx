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

export default function AdminDashboard() {
  const { session, volunteer } = useAuth();
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
        
        // Play beep on new active alert
        if (payload.eventType === 'INSERT' && payload.new.status === 'active') {
          playBeep();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        if (!mounted) return;
        queryClient.invalidateQueries({ queryKey: getGetChannelsSummaryQueryKey() });
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const playBeep = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
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
    if (!session || !volunteer) return;
    await supabase.from('alerts').update({
      status: 'acknowledged',
      acknowledged_by: session.user.id,
      acknowledged_by_name: volunteer.name,
      acknowledged_at: new Date().toISOString()
    }).eq('id', alertId);
  };

  const handleResolve = async (alertId: string) => {
    if (!session) return;
    await supabase.from('alerts').update({
      status: 'resolved',
      resolved_by: session.user.id,
      resolved_at: new Date().toISOString()
    }).eq('id', alertId);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim() || !session || !volunteer || !channels) return;
    
    const allHands = channels.find(c => c.is_announcements);
    if (!allHands) return;

    setIsBroadcasting(true);
    try {
      await supabase.from('messages').insert({
        channel_id: allHands.id,
        user_id: session.user.id,
        sender_name: volunteer.name + ' (Admin)',
        content: broadcastText.trim(),
        urgency: 'info'
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
        <Button asChild variant="outline" size="sm" className="rounded-none border-2 font-bold uppercase text-xs">
          <Link href="/admin/roster">
            <Users className="w-4 h-4 mr-2" /> Roster
          </Link>
        </Button>
      </div>

      <div className="p-4 space-y-8">
        {/* Active Alerts */}
        <section>
          <h2 className="font-black uppercase tracking-tight text-xl mb-4 flex items-center gap-2">
            Active Alerts 
            {activeAlerts.length > 0 && (
              <span className="bg-destructive text-destructive-foreground px-2 py-0.5 rounded-sm text-sm">
                {activeAlerts.length}
              </span>
            )}
          </h2>

          <div className="space-y-4">
            {loadingAlerts && <div className="font-mono text-sm text-muted-foreground">Loading alerts...</div>}
            {!loadingAlerts && activeAlerts.length === 0 && (
              <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-6 text-center">
                <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-mono text-emerald-700 dark:text-emerald-400 font-bold uppercase">All clear. No active alerts.</p>
              </div>
            )}
            
            {activeAlerts.map(alert => {
              const isActive = alert.status === 'active';
              return (
                <div 
                  key={alert.id}
                  className={`border-2 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all ${
                    isActive 
                      ? 'bg-red-600 border-red-800 text-white animate-pulse' 
                      : 'bg-amber-400 border-amber-600 text-amber-950 dark:bg-amber-500'
                  }`}
                  style={isActive ? { animationDuration: '2s' } : {}}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-6 h-6" />
                      <div>
                        <div className="font-black uppercase tracking-wide">{alert.channel_name}</div>
                        <div className="font-mono text-xs opacity-90">
                          {alert.sender_name} • {format(new Date(alert.created_at), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                    {!isActive && alert.acknowledged_by_name && (
                      <div className="font-mono text-xs font-bold uppercase bg-black/10 px-2 py-1">
                        Handling: {alert.acknowledged_by_name}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-lg font-medium leading-snug mb-4 border-l-4 border-current pl-3 py-1">
                    {alert.note}
                  </div>
                  
                  <div className="flex gap-2">
                    {isActive && (
                      <Button 
                        onClick={() => handleAcknowledge(alert.id)}
                        className="flex-1 bg-black text-white hover:bg-black/80 rounded-none font-bold uppercase h-10 border-2 border-transparent"
                      >
                        Acknowledge
                      </Button>
                    )}
                    <Button 
                      onClick={() => handleResolve(alert.id)}
                      variant="outline"
                      className={`flex-1 rounded-none font-bold uppercase h-10 border-2 ${
                        isActive ? 'bg-transparent text-white border-white hover:bg-white hover:text-red-700' : 'bg-transparent border-current hover:bg-black/10'
                      }`}
                    >
                      <Check className="w-4 h-4 mr-2" /> Resolve
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Channel Overview */}
        <section>
          <h2 className="font-black uppercase tracking-tight text-xl mb-4">Channel Status</h2>
          
          <div className="grid gap-3">
            {loadingChannels && <div className="font-mono text-sm text-muted-foreground">Loading channels...</div>}
            
            {sortedChannels.map(channel => (
              <Link key={channel.id} href={`/channels/${channel.slug}`}>
                <div className="bg-card border-2 border-border p-3 flex items-center justify-between hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="font-bold uppercase tracking-tight truncate">{channel.name}</div>
                    <div className="text-xs font-mono text-muted-foreground truncate mt-0.5">
                      {channel.latest_message_preview || 'No messages'} 
                      {channel.latest_message_at && ` • ${format(new Date(channel.latest_message_at), 'HH:mm')}`}
                    </div>
                  </div>
                  
                  <div className="flex gap-1.5 shrink-0">
                    {channel.open_urgents > 0 && (
                      <div className="w-10 h-8 flex items-center justify-center bg-red-600 text-white font-mono font-bold text-sm border-2 border-red-800">
                        {channel.open_urgents}
                      </div>
                    )}
                    {channel.open_issues > 0 && (
                      <div className="w-10 h-8 flex items-center justify-center bg-amber-500 text-black font-mono font-bold text-sm border-2 border-amber-700">
                        {channel.open_issues}
                      </div>
                    )}
                    {channel.open_urgents === 0 && channel.open_issues === 0 && (
                      <div className="w-10 h-8 flex items-center justify-center bg-emerald-500/10 text-emerald-600 font-mono font-bold text-sm border-2 border-emerald-500/20">
                        0
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Broadcast */}
        <section className="bg-card border-2 border-border p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <h2 className="font-black uppercase tracking-tight text-lg mb-3 flex items-center gap-2">
            Broadcast to All Hands
          </h2>
          <form onSubmit={handleBroadcast} className="flex gap-2">
            <Input 
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="Important announcement..." 
              className="border-2 h-12 rounded-none font-mono focus-visible:ring-0 focus-visible:border-primary text-base"
            />
            <Button 
              type="submit" 
              disabled={isBroadcasting || !broadcastText.trim()}
              className="h-12 px-6 rounded-none border-2 font-bold uppercase tracking-wider bg-primary hover:bg-secondary hover:text-foreground transition-all"
            >
              <Send className="w-4 h-4 mr-2" /> Send
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
