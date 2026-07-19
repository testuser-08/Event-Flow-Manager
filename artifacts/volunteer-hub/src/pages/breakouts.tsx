import { useState, useEffect, useMemo } from 'react';
import { Search, Clock, Bookmark, BookmarkCheck, Filter, X } from 'lucide-react';
import { BREAKOUT_TRACKS, BreakoutSession, BreakoutTrack, getItemStatus, toMinutes } from '@/data/event-data';

const BOOKMARK_KEY = 'vhub_bookmarks';

function getNowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function loadBookmarks(): Set<string> {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveBookmarks(set: Set<string>) {
  try {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify([...set]));
  } catch {}
}

function sessionKey(trackId: string, s: BreakoutSession) {
  return `${trackId}|${s.startTime}|${s.title}`;
}

// Group sessions within a track by timeLabel
function groupBySlot(sessions: BreakoutSession[]): { timeLabel: string; startTime: string; endTime: string; items: BreakoutSession[] }[] {
  const map = new Map<string, { timeLabel: string; startTime: string; endTime: string; items: BreakoutSession[] }>();
  for (const s of sessions) {
    const existing = map.get(s.timeLabel);
    if (existing) {
      existing.items.push(s);
    } else {
      map.set(s.timeLabel, { timeLabel: s.timeLabel, startTime: s.startTime, endTime: s.endTime, items: [s] });
    }
  }
  return [...map.values()].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}

// Break intervals within the 1:30–4:00 PM window
const BREAKS = [
  { label: '2:15 PM – 2:30 PM', start: '14:15', end: '14:30' },
  { label: '3:15 PM – 3:30 PM', start: '15:15', end: '15:30' },
];

interface SearchResult {
  track: BreakoutTrack;
  session: BreakoutSession;
}

function SearchResults({
  results,
  bookmarks,
  toggleBookmark,
  nowMinutes,
}: {
  results: SearchResult[];
  bookmarks: Set<string>;
  toggleBookmark: (key: string) => void;
  nowMinutes: number;
}) {
  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground font-mono text-sm">
        No sessions found.
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {results.map(({ track, session }) => {
        const key = sessionKey(track.id, session);
        const isBookmarked = bookmarks.has(key);
        const status = getItemStatus(session.startTime, session.endTime, nowMinutes);

        return (
          <div key={key} className={`bg-card border-2 border-border p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)]`}>
            <div className="flex items-start gap-2">
              <div className={`w-1.5 shrink-0 rounded-full self-stretch ${track.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <span className={`font-mono text-[10px] font-black uppercase px-1.5 py-0.5 ${track.color} text-white`}>{track.name}</span>
                  {status === 'current' && <span className="bg-primary text-primary-foreground font-mono text-[10px] font-black px-1.5 py-0.5 uppercase">NOW</span>}
                  {status === 'past' && <span className="font-mono text-[10px] text-muted-foreground uppercase">ended</span>}
                </div>
                {session.zone && <p className="text-[10px] font-mono text-muted-foreground">{session.zone}</p>}
                <p className="text-sm font-semibold leading-snug">{session.title}</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />{session.timeLabel}
                </p>
              </div>
              <button
                onClick={() => toggleBookmark(key)}
                className="shrink-0 p-1 hover:opacity-70 transition-opacity"
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark this session'}
              >
                {isBookmarked
                  ? <BookmarkCheck className="w-4 h-4 text-primary" />
                  : <Bookmark className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrackTab({
  track,
  bookmarks,
  toggleBookmark,
  nowMinutes,
  filterNow,
}: {
  track: BreakoutTrack;
  bookmarks: Set<string>;
  toggleBookmark: (key: string) => void;
  nowMinutes: number;
  filterNow: boolean;
}) {
  const slots = useMemo(() => groupBySlot(track.sessions), [track.sessions]);

  const visibleSlots = filterNow
    ? slots.filter((slot) => getItemStatus(slot.startTime, slot.endTime, nowMinutes) === 'current')
    : slots;

  if (visibleSlots.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground font-mono text-sm">
        Nothing happening right now in this track.
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      {visibleSlots.map((slot) => {
        const slotStatus = getItemStatus(slot.startTime, slot.endTime, nowMinutes);
        const isActive = slotStatus === 'current';

        return (
          <div key={slot.timeLabel} className={`border-2 ${isActive ? `${track.borderColor} bg-card` : 'border-border bg-card'}`}>
            {/* Slot header */}
            <div className={`flex items-center gap-2 px-3 py-2 border-b-2 ${isActive ? track.borderColor : 'border-border'} ${isActive ? `${track.color} text-white` : 'bg-muted/40'}`}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono text-xs font-black uppercase tracking-wide">{slot.timeLabel}</span>
              {isActive && <span className="ml-auto bg-white/20 text-white font-mono text-[10px] font-black px-1.5 py-0.5 uppercase">NOW</span>}
            </div>

            {/* Sessions in slot */}
            <div className="divide-y-2 divide-border">
              {slot.items.map((session) => {
                const key = sessionKey(track.id, session);
                const isBookmarked = bookmarks.has(key);

                return (
                  <div key={key} className="flex items-start gap-2 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      {session.zone && (
                        <p className={`font-mono text-[10px] font-bold uppercase mb-0.5 ${track.textColor}`}>{session.zone}</p>
                      )}
                      <p className="text-sm font-semibold leading-snug">{session.title}</p>
                    </div>
                    <button
                      onClick={() => toggleBookmark(key)}
                      className="shrink-0 p-1 hover:opacity-70 transition-opacity"
                      title={isBookmarked ? 'Remove bookmark' : 'Bookmark this session'}
                    >
                      {isBookmarked
                        ? <BookmarkCheck className="w-4 h-4 text-primary" />
                        : <Bookmark className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Breakouts() {
  const [activeTab, setActiveTab] = useState(BREAKOUT_TRACKS[0].id);
  const [search, setSearch] = useState('');
  const [filterNow, setFilterNow] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(loadBookmarks);
  const [nowMinutes, setNowMinutes] = useState(getNowMinutes);

  useEffect(() => {
    const id = setInterval(() => setNowMinutes(getNowMinutes()), 30_000);
    return () => clearInterval(id);
  }, []);

  const toggleBookmark = (key: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveBookmarks(next);
      return next;
    });
  };

  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;

  const searchResults: SearchResult[] = useMemo(() => {
    if (!isSearching) return [];
    const results: SearchResult[] = [];
    for (const track of BREAKOUT_TRACKS) {
      for (const session of track.sessions) {
        const haystack = [track.name, session.title, session.zone ?? '', session.timeLabel].join(' ').toLowerCase();
        if (haystack.includes(query)) {
          results.push({ track, session });
        }
      }
    }
    return results;
  }, [query]);

  // Which breaks are currently active
  const activeBreaks = BREAKS.filter((b) => getItemStatus(b.start, b.end, nowMinutes) === 'current');
  const upcomingBreaks = BREAKS.filter((b) => getItemStatus(b.start, b.end, nowMinutes) === 'future');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b-2 border-border shrink-0">
        <div className="px-4 py-3">
          <h1 className="font-mono font-black text-lg uppercase tracking-tight">Breakout Sessions</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">1:30 PM – 4:00 PM · Multiple tracks</p>
        </div>

        {/* Breaks banner */}
        <div className={`px-4 pb-2 flex flex-col gap-1.5 ${activeBreaks.length === 0 && upcomingBreaks.length === 0 ? 'hidden' : ''}`}>
          {activeBreaks.map((b) => (
            <div key={b.label} className="bg-amber-400 text-black border-2 border-amber-600 px-3 py-1.5 font-mono text-xs font-black uppercase flex items-center gap-2">
              <span>☕</span> BREAK IN PROGRESS · {b.label}
            </div>
          ))}
          {activeBreaks.length === 0 && upcomingBreaks.length > 0 && (
            <div className="bg-muted border-2 border-border px-3 py-1.5 font-mono text-xs text-muted-foreground flex items-center gap-2">
              <span>☕</span> Upcoming breaks: {upcomingBreaks.map((b) => b.label).join(' · ')}
            </div>
          )}
        </div>

        {/* Always-visible breaks note when breaks haven't started yet (before 2:15 PM) */}
        {activeBreaks.length === 0 && upcomingBreaks.length === 0 && (
          <div className="px-4 pb-2">
            <div className="bg-muted border-2 border-border px-3 py-1.5 font-mono text-xs text-muted-foreground flex items-center gap-2">
              <span>☕</span> Breaks within this window: <strong className="text-foreground">2:15–2:30 PM</strong> & <strong className="text-foreground">3:15–3:30 PM</strong>
            </div>
          </div>
        )}

        {/* Search + filter */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder='Search sessions (e.g. "Joule")'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-sm bg-muted border-2 border-border font-mono focus:outline-none focus:border-primary"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setFilterNow((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 border-2 font-mono text-xs font-bold uppercase transition-colors ${
              filterNow
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted border-border text-muted-foreground hover:text-foreground hover:border-foreground'
            }`}
            title="Show only what's happening now"
          >
            <Filter className="w-3.5 h-3.5" />
            Now
          </button>
        </div>
      </div>

      {/* Search results overlay */}
      {isSearching ? (
        <div className="flex-1 overflow-auto">
          <div className="px-4 pt-3 pb-1 font-mono text-xs text-muted-foreground font-bold uppercase">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{query}"
          </div>
          <SearchResults
            results={searchResults}
            bookmarks={bookmarks}
            toggleBookmark={toggleBookmark}
            nowMinutes={nowMinutes}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Track tabs */}
          <div className="shrink-0 border-b-2 border-border overflow-x-auto">
            <div className="flex min-w-max">
              {BREAKOUT_TRACKS.map((track) => {
                const isActive = activeTab === track.id;
                // Count "now" sessions in this track
                const nowCount = track.sessions.filter(
                  (s) => getItemStatus(s.startTime, s.endTime, nowMinutes) === 'current'
                ).length;

                return (
                  <button
                    key={track.id}
                    onClick={() => setActiveTab(track.id)}
                    className={`relative px-4 py-3 font-mono text-xs font-bold uppercase whitespace-nowrap border-r-2 border-border transition-colors ${
                      isActive
                        ? 'bg-foreground text-background'
                        : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${track.color}`} />
                    {track.name}
                    {nowCount > 0 && !filterNow && (
                      <span className="ml-1.5 bg-primary text-primary-foreground font-mono text-[9px] font-black px-1 py-0.5 rounded-full align-middle">
                        {nowCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active track content */}
          <div className="flex-1 overflow-auto">
            {BREAKOUT_TRACKS.filter((t) => t.id === activeTab).map((track) => (
              <div key={track.id}>
                {/* Track meta */}
                <div className={`px-4 py-2 border-b-2 border-border flex items-center gap-2 ${track.color} text-white`}>
                  <span className="font-mono text-[10px] font-black uppercase">{track.location}</span>
                </div>
                <TrackTab
                  track={track}
                  bookmarks={bookmarks}
                  toggleBookmark={toggleBookmark}
                  nowMinutes={nowMinutes}
                  filterNow={filterNow}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
