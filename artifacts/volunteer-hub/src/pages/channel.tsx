import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages, SupabaseMessage } from '@/hooks/use-messages';
import { useChannelPresence } from '@/hooks/use-channel-presence';
import { useGetChannelsSummary } from '@workspace/api-client-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ArrowLeft, Send, AlertTriangle, AlertCircle, Info, Image as ImageIcon, Check, ShieldAlert, Lock, WifiOff, Wifi, Trash2, Users, ChevronRight } from 'lucide-react';
import ChannelIcon from '@/components/shared/ChannelIcon';
import Avatar from '@/components/shared/Avatar';
import { Link } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import VoiceRecorder, { MicButton } from '@/components/shared/VoiceRecorder';
import VoicePlayer from '@/components/shared/VoicePlayer';

type ChannelMember = { id: string; name: string; is_admin: boolean };

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
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: 'Network error. Please check your connection.' } };
  }
}

async function apiDelete(path: string) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

async function apiPatch(path: string, body: unknown) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: 'Network error. Please check your connection.' } };
  }
}

async function uploadPhoto(channelId: string, file: File): Promise<string> {
  const token = localStorage.getItem('vhub_token');
  const form = new FormData();
  form.append('photo', file);
  form.append('channel_id', channelId);
  const res = await fetch(`${BASE}/api/messages/upload-photo`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error('Photo upload failed');
  const { url } = await res.json();
  return url;
}

export default function ChannelDetail({ slug }: { slug: string }) {
  const { volunteer } = useAuth();
  const { data: channels } = useGetChannelsSummary();
  const channel = channels?.find((c) => c.slug === slug);
  const { messages, loading, connectionStatus, removeMessage, resolveMessage } = useMessages(channel?.id);
  const presentUsers = useChannelPresence(channel?.id, volunteer ? {
    volunteerId: volunteer.volunteerId,
    name: volunteer.name,
    avatarUrl: volunteer.avatarUrl,
  } : null);

  const [content, setContent] = useState('');
  const [urgency, setUrgency] = useState<'info' | 'issue' | 'urgent'>('info');
  const [isSending, setIsSending] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);

  const [alertNote, setAlertNote] = useState('');
  const [isAlerting, setIsAlerting] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);

  const [membersOpen, setMembersOpen] = useState(false);
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    if (!membersOpen || !slug) return;
    setMembersLoading(true);
    const token = localStorage.getItem('vhub_token');
    fetch(`${BASE}/api/channels/${slug}/members`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => setMembers(data.members ?? []))
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, [membersOpen, slug]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!channel) return <div className="p-4 font-mono">Loading channel...</div>;

  // Block non-admins from the admin channel entirely
  if (channel.slug === 'admin' && !volunteer?.isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <Lock className="w-10 h-10 text-muted-foreground" />
        <p className="font-bold text-lg">Admin Only</p>
        <p className="text-muted-foreground text-sm">You don't have access to this channel.</p>
        <Link href="/channels">
          <button className="mt-2 text-sm text-primary underline underline-offset-2">← Back to channels</button>
        </Link>
      </div>
    );
  }

  // Determine write access: admin gets all channels, others only their workstreams
  const canWrite = volunteer?.isAdmin || (volunteer?.workstreams ?? []).includes(channel.name);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !photo && !voiceNoteUrl) || !volunteer || !canWrite) return;

    setIsSending(true);
    try {
      let photo_url: string | null = null;
      if (photo) {
        photo_url = await uploadPhoto(channel.id, photo);
      }

      const { ok, data } = await apiPost('/api/messages', {
        channel_id: channel.id,
        content: content.trim(),
        urgency,
        photo_url,
        voice_note_url: voiceNoteUrl,
      });

      if (!ok) throw new Error(data?.error ?? 'Failed to send');

      setContent('');
      setPhoto(null);
      setVoiceNoteUrl(null);
      setUrgency('info');
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);

  const handleResolve = async (messageId: string) => {
    if (!volunteer) return;
    resolveMessage(messageId); // optimistic
    const { ok } = await apiPatch(`/api/messages/${messageId}/resolve`, {});
    if (!ok) toast.error('Could not resolve message. Please try again.');
  };

  const confirmDelete = async () => {
    if (!deletePendingId) return;
    const idToDelete = deletePendingId;
    setDeletePendingId(null);
    removeMessage(idToDelete); // optimistic — remove instantly
    const { ok } = await apiDelete(`/api/messages/${idToDelete}`);
    if (!ok) toast.error('Could not delete message. Please try again.');
  };

  const handleAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertNote.trim() || !volunteer) return;
    setIsAlerting(true);
    try {
      const { ok, data } = await apiPost('/api/alerts', {
        channel_id: channel.id,
        channel_name: channel.name,
        note: alertNote.trim(),
      });
      if (!ok) throw new Error(data?.error ?? 'Failed to send alert');
      setAlertOpen(false);
      setAlertNote('');
    } catch (err) {
      console.error('Failed to send alert:', err);
    } finally {
      setIsAlerting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-muted/20 relative">
      {/* Header */}
      <div className="bg-card border-b-2 border-border shrink-0">
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/channels" className="p-2 -ml-2 hover:bg-muted rounded-none transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setMembersOpen(true)}
              className="text-left group hover:bg-muted/50 -mx-1 px-1 rounded-none transition-colors"
            >
              <div className="flex items-center gap-1">
                <h1 className="font-bold text-lg leading-tight uppercase tracking-tight group-hover:text-primary transition-colors">{channel.name}</h1>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-xs font-mono text-muted-foreground">
                {canWrite ? 'Tap to see members' : 'Read-only · Tap to see members'}
              </p>
            </button>
          </div>
          <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="rounded-none border-2 font-bold uppercase tracking-wider h-10 px-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] transition-all shrink-0">
              <ShieldAlert className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Alert Admins</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="border-2 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <DialogHeader>
              <DialogTitle className="uppercase font-black text-xl text-destructive flex items-center gap-2">
                <ShieldAlert className="w-6 h-6" /> Emergency Alert
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAlert} className="space-y-4 pt-4">
              <Input
                autoFocus
                placeholder="What is the emergency?"
                value={alertNote}
                onChange={(e) => setAlertNote(e.target.value)}
                className="font-mono border-2 h-12 text-base rounded-none"
                required
              />
              <Button type="submit" disabled={isAlerting} variant="destructive" className="w-full h-12 rounded-none border-2 font-bold uppercase text-lg">
                {isAlerting ? 'Sending...' : 'Broadcast Alert'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>

        {/* Presence strip — who's currently in this channel */}
        {presentUsers.length > 0 && (
          <div className="border-t border-border/50 px-3 py-2 flex items-center gap-2 bg-muted/30">
            <div className="flex items-center -space-x-2">
              {presentUsers.slice(0, 7).map((u) => (
                <div key={u.volunteerId} title={u.name} className="ring-2 ring-card rounded-full">
                  <Avatar name={u.name} avatarUrl={u.avatarUrl} size={24} />
                </div>
              ))}
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {presentUsers.length === 1
                ? '1 person here now'
                : `${presentUsers.length} people here now`}
              {' — '}
              {presentUsers.slice(0, 3).map((u) => u.name.split(' ')[0]).join(', ')}
              {presentUsers.length > 3 && ` +${presentUsers.length - 3} more`}
            </span>
          </div>
        )}
      </div>

      {/* Reconnect banner */}
      {(connectionStatus === 'reconnecting' || connectionStatus === 'disconnected') && (
        <div className="bg-amber-500 text-black text-xs font-bold font-mono uppercase tracking-wider px-3 py-1.5 flex items-center gap-2 shrink-0 animate-pulse">
          <WifiOff className="w-3 h-3" /> Reconnecting to live updates…
        </div>
      )}
      {connectionStatus === 'connecting' && (
        <div className="bg-muted text-muted-foreground text-xs font-mono px-3 py-1 flex items-center gap-2 shrink-0">
          <Wifi className="w-3 h-3" /> Connecting…
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="text-center text-muted-foreground font-mono">Loading messages...</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === volunteer?.volunteerId;
            const needsResolution = (msg.urgency === 'issue' || msg.urgency === 'urgent') && !msg.is_resolved;

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-xs font-mono text-muted-foreground mb-1 mx-1">
                  {msg.sender_name} • {format(new Date(msg.created_at), 'HH:mm')}
                </span>

                <div className={`max-w-[85%] border-2 p-3 ${
                  msg.urgency === 'urgent' ? 'bg-red-50 dark:bg-red-950 border-red-600' :
                  msg.urgency === 'issue' ? 'bg-amber-50 dark:bg-amber-950 border-amber-500' :
                  isMe ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'
                } shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]`}>

                  {msg.urgency !== 'info' && (
                    <div className={`flex items-center gap-1.5 mb-2 font-bold uppercase text-xs tracking-wider pb-2 border-b-2 ${
                      msg.urgency === 'urgent' ? 'text-red-700 dark:text-red-400 border-red-200 dark:border-red-900' :
                      'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900'
                    }`}>
                      {msg.urgency === 'urgent' ? <AlertTriangle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {msg.urgency === 'urgent' ? 'Urgent' : 'Issue'}
                      {msg.is_resolved && (
                        <span className="ml-auto flex items-center text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3 h-3 mr-1" /> Resolved
                        </span>
                      )}
                    </div>
                  )}

                  {msg.photo_url && (
                    <img src={msg.photo_url} alt="Attached" className="w-full max-h-60 object-cover border-2 border-border mb-2" />
                  )}

                  {msg.voice_note_url && (
                    <div className={`mb-2 ${isMe && msg.urgency === 'info' ? 'bg-primary-foreground/10 -mx-1 px-1 py-1 rounded-sm' : 'bg-muted/20 p-1 rounded-sm'}`}>
                      <VoicePlayer src={msg.voice_note_url} light={isMe && msg.urgency === 'info'} />
                    </div>
                  )}

                  {msg.content && (
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{msg.content}</p>
                  )}

                  {needsResolution && canWrite && (
                    <div className="mt-3 pt-3 border-t-2 border-black/10 dark:border-white/10">
                      <Button
                        size="sm"
                        variant={msg.urgency === 'urgent' ? 'destructive' : 'default'}
                        className="w-full rounded-none font-bold uppercase h-8"
                        onClick={() => handleResolve(msg.id)}
                      >
                        <Check className="w-4 h-4 mr-2" /> Resolve
                      </Button>
                    </div>
                  )}

                  {/* Delete — visible to sender or admin */}
                  {(volunteer?.isAdmin || msg.user_id === volunteer?.volunteerId) && (
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => setDeletePendingId(msg.id)}
                        className="text-[11px] font-mono text-muted-foreground hover:text-destructive flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity"
                        title="Delete message"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Compose — shown to all, but locked for read-only users */}
      {canWrite ? (
        <div className="bg-card border-t-2 border-border p-3 shrink-0 space-y-3">
          {/* Voice recorder — replaces normal compose while active */}
          {showVoiceRecorder ? (
            <VoiceRecorder
              uploadFolder={channel.id}
              onSend={(url) => { setVoiceNoteUrl(url); setShowVoiceRecorder(false); }}
              onCancel={() => setShowVoiceRecorder(false)}
              disabled={isSending}
            />
          ) : (
            <>
              <div className="flex gap-2 h-11">
                {(['info', 'issue', 'urgent'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUrgency(u)}
                    className={`flex-1 flex items-center justify-center gap-1.5 font-bold uppercase text-xs border-2 transition-all select-none ${
                      urgency === u
                        ? u === 'info' ? 'bg-emerald-500 text-white border-emerald-700 shadow-[inset_0px_3px_6px_rgba(0,0,0,0.2)]'
                        : u === 'issue' ? 'bg-amber-500 text-black border-amber-700 shadow-[inset_0px_3px_6px_rgba(0,0,0,0.2)]'
                        : 'bg-red-600 text-white border-red-800 shadow-[inset_0px_3px_6px_rgba(0,0,0,0.2)]'
                        : 'bg-card text-foreground border-border hover:bg-muted active:bg-muted'
                    }`}
                  >
                    {u === 'info' ? <Info className="w-4 h-4 shrink-0" /> : u === 'issue' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    {u.charAt(0).toUpperCase() + u.slice(1)}
                  </button>
                ))}
              </div>

              {photo && (
                <div className="flex items-center justify-between bg-muted p-2 border-2 border-border text-sm font-mono">
                  <span className="truncate flex-1 mr-2">{photo.name}</span>
                  <button onClick={() => setPhoto(null)} className="text-destructive font-bold uppercase text-xs hover:underline">Remove</button>
                </div>
              )}

              {voiceNoteUrl && (
                <div className="flex items-center gap-2 bg-muted p-2 border-2 border-border">
                  <VoicePlayer src={voiceNoteUrl} compact className="flex-1" />
                  <button onClick={() => setVoiceNoteUrl(null)} className="text-destructive font-bold uppercase text-xs hover:underline shrink-0">Remove</button>
                </div>
              )}

              <form onSubmit={handleSend} className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Type message..."
                    className="pr-20 border-2 h-12 rounded-none focus-visible:ring-0 focus-visible:border-primary text-base"
                  />
                  {/* Mic button */}
                  <div className="absolute right-10 top-0 bottom-0 flex items-center">
                    <MicButton
                      onClick={() => setShowVoiceRecorder(true)}
                      disabled={!!voiceNoteUrl || isSending}
                    />
                  </div>
                  {/* Photo button */}
                  <label className="absolute right-2 top-2 bottom-2 w-8 flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
                    <ImageIcon className="w-5 h-5" />
                  </label>
                </div>
                <Button
                  type="submit"
                  disabled={isSending || (!content.trim() && !photo && !voiceNoteUrl)}
                  className="w-12 h-12 p-0 rounded-none border-2 border-primary"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </>
          )}
        </div>
      ) : (
        <div className="bg-muted/50 border-t-2 border-border p-3 shrink-0 flex items-center justify-center gap-2 text-sm text-muted-foreground font-mono">
          <Lock className="w-4 h-4" />
          Read-only — this isn't your workstream
        </div>
      )}
      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletePendingId} onOpenChange={(open) => { if (!open) setDeletePendingId(null); }}>
        <AlertDialogContent className="rounded-none border-2 border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black uppercase">Delete message?</AlertDialogTitle>
            <AlertDialogDescription>This message will be permanently removed for everyone in this channel.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none border-2">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="rounded-none border-2 bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Members sheet — tap channel name to open */}
      <Sheet open={membersOpen} onOpenChange={setMembersOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm p-0 flex flex-col border-l-2 border-border rounded-none">
          <SheetHeader className="p-4 border-b-2 border-border shrink-0">
            <SheetTitle className="font-black text-xl uppercase tracking-tighter flex items-center gap-2">
              <Users className="w-5 h-5" />
              {channel.name}
            </SheetTitle>
            {!membersLoading && (
              <p className="text-xs font-mono text-muted-foreground">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </p>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {membersLoading ? (
              <div className="p-4 font-mono text-sm text-muted-foreground">Loading members…</div>
            ) : members.length === 0 ? (
              <div className="p-8 text-center font-mono text-sm text-muted-foreground">
                No members assigned to this channel yet.
              </div>
            ) : (
              <div className="divide-y-2 divide-border">
                {members.map((m) => {
                  const isOnline = presentUsers.some(u => u.volunteerId === m.id);
                  const initials = m.name.trim().split(/\s+/).map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                      {/* Initials avatar with online dot */}
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                          <span className="text-xs font-black text-primary">{initials}</span>
                        </div>
                        {isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-card rounded-full" title="Online now" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate leading-tight">{m.name}</p>
                        {isOnline && (
                          <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">online now</p>
                        )}
                      </div>
                      {m.is_admin && (
                        <span className="text-[9px] font-black font-mono uppercase px-1.5 py-0.5 bg-primary text-primary-foreground shrink-0">
                          ADMIN
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
