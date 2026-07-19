import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { ChevronRight, MapPin, Clock, ArrowRight } from 'lucide-react';
import { AGENDA, getItemStatus, toMinutes } from '@/data/event-data';

function getNowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getCountdown(startTime: string, nowMinutes: number): string | null {
  const start = toMinutes(startTime);
  const diff = start - nowMinutes;
  if (diff <= 0 || diff > 120) return null;
  if (diff < 60) return `starts in ${diff}m`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m === 0 ? `starts in ${h}h` : `starts in ${h}h ${m}m`;
}

export default function Agenda() {
  const [nowMinutes, setNowMinutes] = useState(getNowMinutes);
  const currentRef = useRef<HTMLDivElement | null>(null);
  const scrolled = useRef(false);

  // Tick every 30 seconds
  useEffect(() => {
    const id = setInterval(() => setNowMinutes(getNowMinutes()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll to current/next item once on mount
  useEffect(() => {
    if (!scrolled.current && currentRef.current) {
      currentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      scrolled.current = true;
    }
  });

  // Find the first "future" item (for "next" labelling)
  let foundCurrent = false;
  let nextIndex = -1;
  for (let i = 0; i < AGENDA.length; i++) {
    const s = getItemStatus(AGENDA[i].startTime, AGENDA[i].endTime, nowMinutes);
    if (s === 'current') { foundCurrent = true; break; }
    if (s === 'future' && nextIndex === -1) { nextIndex = i; }
  }
  // If nothing is current, first future item is "next"
  const highlightNextIndex = !foundCurrent ? nextIndex : -1;

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b-2 border-border px-4 py-3">
        <h1 className="font-mono font-black text-lg uppercase tracking-tight">Agenda</h1>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">Customer Support Summit · Full-Day Schedule</p>
      </div>

      <div className="p-4 space-y-2">
        {AGENDA.map((item, idx) => {
          const status = getItemStatus(item.startTime, item.endTime, nowMinutes);
          const isNext = idx === highlightNextIndex;
          const isCurrent = status === 'current';
          const isPast = status === 'past';
          const countdown = isNext ? getCountdown(item.startTime, nowMinutes) : null;

          const rowRef = (isCurrent || isNext) ? currentRef : undefined;

          const borderClass = isCurrent
            ? 'border-primary border-l-[5px] bg-primary/5'
            : isNext
            ? 'border-amber-400 border-l-[5px] dark:border-amber-400'
            : isPast
            ? 'border-border'
            : 'border-border';

          if (item.isBreakout) {
            return (
              <Link key={item.id} href="/breakouts">
                <div
                  ref={rowRef as any}
                  className={`group bg-card border-2 p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all cursor-pointer ${borderClass}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-bold text-muted-foreground">{item.label}</span>
                        {isCurrent && <span className="bg-primary text-primary-foreground font-mono text-[10px] font-black px-1.5 py-0.5 uppercase">NOW</span>}
                        {isNext && <span className="bg-amber-400 text-black font-mono text-[10px] font-black px-1.5 py-0.5 uppercase">NEXT</span>}
                      </div>
                      <h3 className="font-bold text-base leading-snug">{item.title}</h3>
                      <p className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />{item.location}
                      </p>
                      <div className="mt-2 flex items-center gap-1 text-xs font-mono font-bold text-primary">
                        <ArrowRight className="w-3.5 h-3.5" />
                        Tap to see all breakout tracks
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground shrink-0 mt-1 transition-colors" />
                  </div>
                </div>
              </Link>
            );
          }

          return (
            <div
              key={item.id}
              ref={rowRef as any}
              className={`bg-card border-2 p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)] ${borderClass}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-bold text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />{item.label}
                    </span>
                    {isCurrent && <span className="bg-primary text-primary-foreground font-mono text-[10px] font-black px-1.5 py-0.5 uppercase">NOW</span>}
                    {isNext && <span className="bg-amber-400 text-black font-mono text-[10px] font-black px-1.5 py-0.5 uppercase">NEXT</span>}
                    {countdown && <span className="text-amber-500 dark:text-amber-400 font-mono text-[10px] font-bold">{countdown}</span>}
                  </div>
                  <h3 className="font-bold text-base leading-snug">{item.title}</h3>
                  <p className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />{item.location}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-6" />
    </div>
  );
}
