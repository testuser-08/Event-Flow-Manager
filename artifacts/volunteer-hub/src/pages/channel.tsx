import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages, SupabaseMessage } from '@/hooks/use-messages';
import { useGetChannelsSummary } from '@workspace/api-client-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, AlertTriangle, AlertCircle, Info, Image as ImageIcon, Camera, Check, ShieldAlert } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';

export default function ChannelDetail({ slug }: { slug: string }) {
  const { volunteer, session } = useAuth();
  const { data: channels } = useGetChannelsSummary();
  const channel = channels?.find((c) => c.slug === slug);
  const { messages, loading } = useMessages(channel?.id);
  
  const [content, setContent] = useState('');
  const [urgency, setUrgency] = useState<'info' | 'issue' | 'urgent'>('info');
  const [isSending, setIsSending] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  
  const [alertNote, setAlertNote] = useState('');
  const [isAlerting, setIsAlerting] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!channel) return <div className="p-4 font-mono">Loading channel...</div>;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !photo) || !session || !volunteer) return;

    setIsSending(true);
    try {
      let photo_url = null;
      if (photo) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${channel.id}/${fileName}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('message-photos')
          .upload(filePath, photo);
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('message-photos')
          .getPublicUrl(filePath);
          
        photo_url = publicUrlData.publicUrl;
      }

      await supabase.from('messages').insert({
        channel_id: channel.id,
        user_id: session.user.id,
        sender_name: volunteer.name,
        content: content.trim(),
        urgency,
        photo_url
      });

      setContent('');
      setPhoto(null);
      setUrgency('info');
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleResolve = async (messageId: string) => {
    if (!session) return;
    await supabase.from('messages').update({
      is_resolved: true,
      resolved_by: session.user.id,
      resolved_at: new Date().toISOString()
    }).eq('id', messageId);
  };

  const handleAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertNote.trim() || !session || !volunteer) return;
    setIsAlerting(true);
    try {
      await supabase.from('alerts').insert({
        channel_id: channel.id,
        channel_name: channel.name,
        user_id: session.user.id,
        sender_name: volunteer.name,
        note: alertNote.trim(),
        status: 'active'
      });
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
      <div className="bg-card border-b-2 border-border p-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/channels" className="p-2 -ml-2 hover:bg-muted rounded-none transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-lg leading-tight uppercase tracking-tight">{channel.name}</h1>
            <p className="text-xs font-mono text-muted-foreground">Workstream Channel</p>
          </div>
        </div>
        <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="rounded-none border-2 font-bold uppercase tracking-wider h-10 px-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] transition-all">
              <ShieldAlert className="w-4 h-4 mr-2" />
              Alert Admins
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="text-center text-muted-foreground font-mono">Loading messages...</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === session?.user.id;
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

                  <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{msg.content}</p>

                  {needsResolution && (
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
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Compose */}
      <div className="bg-card border-t-2 border-border p-3 shrink-0 space-y-3">
        {/* Urgency Selector */}
        <div className="flex gap-2 h-10">
          <button 
            type="button"
            onClick={() => setUrgency('info')}
            className={`flex-1 flex items-center justify-center gap-1 font-bold uppercase text-xs border-2 transition-all ${
              urgency === 'info' ? 'bg-emerald-500 text-white border-emerald-700 shadow-[inset_0px_3px_6px_rgba(0,0,0,0.2)]' : 'bg-card text-foreground border-border hover:bg-muted'
            }`}
          >
            <Info className="w-4 h-4" /> Info
          </button>
          <button 
            type="button"
            onClick={() => setUrgency('issue')}
            className={`flex-1 flex items-center justify-center gap-1 font-bold uppercase text-xs border-2 transition-all ${
              urgency === 'issue' ? 'bg-amber-500 text-black border-amber-700 shadow-[inset_0px_3px_6px_rgba(0,0,0,0.2)]' : 'bg-card text-foreground border-border hover:bg-muted'
            }`}
          >
            <AlertCircle className="w-4 h-4" /> Issue
          </button>
          <button 
            type="button"
            onClick={() => setUrgency('urgent')}
            className={`flex-1 flex items-center justify-center gap-1 font-bold uppercase text-xs border-2 transition-all ${
              urgency === 'urgent' ? 'bg-red-600 text-white border-red-800 shadow-[inset_0px_3px_6px_rgba(0,0,0,0.2)]' : 'bg-card text-foreground border-border hover:bg-muted'
            }`}
          >
            <AlertTriangle className="w-4 h-4" /> Urgent
          </button>
        </div>

        {photo && (
          <div className="flex items-center justify-between bg-muted p-2 border-2 border-border text-sm font-mono">
            <span className="truncate flex-1 mr-2">{photo.name}</span>
            <button onClick={() => setPhoto(null)} className="text-destructive font-bold uppercase text-xs hover:underline">
              Remove
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2">
          <div className="relative flex-1">
            <Input 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type message..." 
              className="pr-12 border-2 h-12 rounded-none focus-visible:ring-0 focus-visible:border-primary text-base"
            />
            <label className="absolute right-2 top-2 bottom-2 w-8 flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => setPhoto(e.target.files?.[0] || null)} 
              />
              <ImageIcon className="w-5 h-5" />
            </label>
          </div>
          <Button 
            type="submit" 
            disabled={isSending || (!content.trim() && !photo)}
            className="w-12 h-12 p-0 rounded-none border-2 border-primary"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
