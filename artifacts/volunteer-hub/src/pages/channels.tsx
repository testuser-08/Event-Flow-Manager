import { useGetChannelsSummary } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { ChevronRight, AlertCircle, AlertTriangle } from 'lucide-react';
import ChannelIcon from '@/components/shared/ChannelIcon';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

export default function ChannelsList() {
  const { volunteer } = useAuth();
  const { data: allChannels, isLoading } = useGetChannelsSummary();

  // Non-admins never see the Admin channel
  const channels = allChannels?.filter(
    (ch) => volunteer?.isAdmin || ch.slug !== 'admin'
  );

  if (isLoading || !channels) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-none border-2" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-muted/30">
      <div className="p-4 space-y-3">
        <h2 className="font-mono text-xs font-bold uppercase text-muted-foreground mb-2">All Channels</h2>

        {channels.map((channel) => {
          const hasUrgent = channel.open_urgents > 0;
          const hasIssue = channel.open_issues > 0;

          return (
            <Link key={channel.id} href={`/channels/${channel.slug}`}>
              <div className={`group bg-card border-2 p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all cursor-pointer flex flex-col gap-3 ${
                hasUrgent ? 'border-red-500 border-l-[5px]' : hasIssue ? 'border-amber-400 border-l-[5px]' : 'border-border'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-sm shrink-0 ${
                      hasUrgent ? 'bg-red-600 text-white' : hasIssue ? 'bg-amber-500 text-black' : 'bg-primary text-primary-foreground'
                    }`}>
                      <ChannelIcon slug={channel.slug} name={channel.name} className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-base uppercase tracking-tight truncate">{channel.name}</h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {hasUrgent && (
                      <div className="flex items-center gap-1 bg-red-600 text-white px-2 py-0.5 font-mono text-xs font-black border-2 border-red-800 rounded-sm shadow-sm">
                        <AlertTriangle className="w-3 h-3" />
                        {channel.open_urgents}
                      </div>
                    )}
                    {hasIssue && (
                      <div className="flex items-center gap-1 bg-amber-500 text-black px-2 py-0.5 font-mono text-xs font-black border-2 border-amber-700 rounded-sm shadow-sm">
                        <AlertCircle className="w-3 h-3" />
                        {channel.open_issues}
                      </div>
                    )}
                    {!hasUrgent && !hasIssue && (
                      <span className="text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">✓</span>
                    )}
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>

                {channel.latest_message_preview ? (
                  <div className="text-sm text-muted-foreground truncate font-mono bg-muted/50 px-2 py-1.5 border-l-2 border-border">
                    {channel.latest_message_preview}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic font-mono px-2 py-1">
                    No messages yet
                  </div>
                )}
              </div>
            </Link>
          );
        })}

        {channels.length === 0 && (
          <div className="text-center py-10 bg-card border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground text-sm">No channels found. Run setup first.</p>
          </div>
        )}
      </div>
    </div>
  );
}
