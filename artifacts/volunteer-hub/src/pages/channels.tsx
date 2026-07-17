import { useGetChannelsSummary } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'wouter';
import { ChevronRight, MessageSquare, AlertCircle, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ChannelsList() {
  const { volunteer } = useAuth();
  const { data: channels, isLoading } = useGetChannelsSummary();

  if (isLoading || !channels) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-none border-2" />
        ))}
      </div>
    );
  }

  // Filter channels to only show workstream and All Hands
  const visibleChannels = channels.filter(c => 
    c.is_announcements || 
    c.name.toLowerCase() === volunteer?.workstream?.toLowerCase()
  );

  return (
    <div className="flex-1 overflow-auto bg-muted/30">
      <div className="p-4 space-y-4">
        <h2 className="font-mono text-sm font-bold uppercase text-muted-foreground mb-2">Your Channels</h2>
        
        {visibleChannels.map((channel) => (
          <Link key={channel.id} href={`/channels/${channel.slug}`}>
            <div className="group bg-card border-2 border-border p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all cursor-pointer flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-primary text-primary-foreground p-1.5 rounded-sm">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-lg uppercase tracking-tight">{channel.name}</h3>
                </div>
                
                <div className="flex items-center gap-2">
                  {channel.open_urgents > 0 && (
                    <div className="flex items-center gap-1 bg-red-600 text-white px-2 py-0.5 font-mono text-xs font-bold border-2 border-red-800">
                      <AlertTriangle className="w-3 h-3" />
                      {channel.open_urgents}
                    </div>
                  )}
                  {channel.open_issues > 0 && (
                    <div className="flex items-center gap-1 bg-amber-500 text-black px-2 py-0.5 font-mono text-xs font-bold border-2 border-amber-700">
                      <AlertCircle className="w-3 h-3" />
                      {channel.open_issues}
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                </div>
              </div>

              {channel.latest_message_preview ? (
                <div className="text-sm text-muted-foreground truncate font-mono bg-muted/50 p-2 border-l-2 border-border">
                  {channel.latest_message_preview}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic font-mono p-2">
                  No messages yet
                </div>
              )}
            </div>
          </Link>
        ))}

        {visibleChannels.length === 0 && (
          <div className="text-center py-10 bg-card border-2 border-dashed border-border">
            <p className="text-muted-foreground font-mono">No assigned channels.</p>
          </div>
        )}
      </div>
    </div>
  );
}
