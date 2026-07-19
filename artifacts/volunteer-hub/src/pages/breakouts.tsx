import { useState, useEffect, useMemo } from 'react';
import { Search, Clock, Bookmark, BookmarkCheck, Filter, X, MapPin, ChevronDown } from 'lucide-react';
import { useGetBreakouts } from '@workspace/api-client-react';
import type { BreakoutTrack, BreakoutSessionRow } from '@workspace/api-client-react';

const BOOKMARK_KEY = 'vhub_bookmarks';

// Map Tailwind bg class → CSS hex so we can use track accent color in inline styles
const BG_TO_HEX: Record<string, string> = {
  'bg-blue-600': '#2563eb',
  'bg-cyan-600': '#0891b2',
  'bg-cyan-500': '#06b6d4',
  'bg-purple-600': '#9333ea',
  'bg-green-600': '#16a34a',
  'bg-orange-500': '#f97316',
  'bg-red-600': '#dc2626',
  'bg-amber-500': '#f59e0b',
  'bg-teal-600': '#0d9488',
  'bg-indigo-600': '#4f46e5',
  'bg-rose-600': '#e11d48',
  'bg-violet-600': '#7c3aed',
  'bg-pink-600': '#db2777',
  'bg-lime-600': '#65a30d',
  'bg-emerald-600': '#059669',
  'bg-sky-600': '#0284c7',
};
function trackHex(color: string): string {
  return BG_TO_HEX[color] ?? '#2563eb';
}

// ── Time helpers ─────────────────────────────────────────────────────────────
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function getItemStatus(
  startTime: string,
  endTime: string,
  nowMinutes: number
): 'current' | 'next' | 'past' | 'future' {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (nowMinutes >= start && nowMinutes < end) return 'current';
  if (nowMinutes < start) return 'future';
  return 'past';
}

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

function sessionKey(trackId: string, s: BreakoutSessionRow) {
  return `${trackId}|${s.start_time}|${s.title}`;
}

// Group sessions within a track by time_label
function groupBySlot(sessions: BreakoutSessionRow[]): {
  timeLabel: string;
  startTime: string;
  endTime: string;
  items: BreakoutSessionRow[];
}[] {
  const map = new Map<string, { timeLabel: string; startTime: string; endTime: string; items: BreakoutSessionRow[] }>();
  for (const s of sessions) {
    const existing = map.get(s.time_label);
    if (existing) {
      existing.items.push(s);
    } else {
      map.set(s.time_label, { timeLabel: s.time_label, startTime: s.start_time, endTime: s.end_time, items: [s] });
    }
  }
  return [...map.values()].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}

const BREAKS = [
  { label: '2:15 PM – 2:30 PM', start: '14:15', end: '14:30' },
  { label: '3:15 PM – 3:30 PM', start: '15:15', end: '15:30' },
];

interface SearchResult {
  track: BreakoutTrack;
  session: BreakoutSessionRow;
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
      <div className="text-center py-14 text-muted-foreground font-mono text-sm">
        No sessions found.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {results.map(({ track, session }) => {
        const key = sessionKey(track.id, session);
        const isBookmarked = bookmarks.has(key);
        const status = getItemStatus(session.start_time, session.end_time, nowMinutes);
        const hex = trackHex(track.color);

        return (
          <div
            key={key}
            className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
          >
            {/* Track label strip */}
            <div
              className="flex items-center gap-2 px-4 py-2"
              style={{ backgroundColor: hex + '18' }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: hex }}
              />
              <span className="font-mono text-[10px] font-black uppercase" style={{ color: hex }}>
                {track.name}
              </span>
              {status === 'current' && (
                <span
                  className="ml-auto font-mono text-[10px] font-black px-2 py-0.5 rounded-full text-white uppercase"
                  style={{ backgroundColor: hex }}
                >
                  NOW
                </span>
              )}
              {status === 'past' && (
                <span className="ml-auto font-mono text-[10px] text-muted-foreground uppercase">ended</span>
              )}
            </div>
            {/* Session body */}
            <div className="flex items-start gap-3 px-4 py-3.5" style={{ borderLeft: `4px solid ${hex}` }}>
              <div className="flex-1 min-w-0">
                {session.zone && (
                  <p className="font-mono text-[11px] font-black uppercase mb-1" style={{ color: hex }}>
                    {session.zone}
                  </p>
                )}
                <p className="text-sm font-semibold leading-snug">{session.title}</p>
                <p className="text-[11px] font-mono text-muted-foreground mt-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />{session.time_label}
                </p>
              </div>
              <button
                onClick={() => toggleBookmark(key)}
                className="shrink-0 p-1 hover:opacity-70 transition-opacity mt-0.5"
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
  const hex = trackHex(track.color);

  const visibleSlots = filterNow
    ? slots.filter((slot) => getItemStatus(slot.startTime, slot.endTime, nowMinutes) === 'current')
    : slots;

  // Track which time-slot blocks are expanded (by timeLabel key)
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());

  // Auto-expand current slots when Now filter activates, or when the clock
  // ticks a slot into "current" while Now filter is on
  useEffect(() => {
    if (filterNow) {
      setExpandedSlots((prev) => {
        const next = new Set(prev);
        visibleSlots.forEach((slot) => next.add(slot.timeLabel));
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterNow, nowMinutes]);

  // Also auto-expand any slot that is currently active (independent of filter)
  useEffect(() => {
    const currentSlotLabels = slots
      .filter((slot) => getItemStatus(slot.startTime, slot.endTime, nowMinutes) === 'current')
      .map((slot) => slot.timeLabel);
    if (currentSlotLabels.length > 0) {
      setExpandedSlots((prev) => {
        const next = new Set(prev);
        currentSlotLabels.forEach((label) => next.add(label));
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowMinutes]);

  const toggleSlot = (timeLabel: string) => {
    setExpandedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(timeLabel)) next.delete(timeLabel);
      else next.add(timeLabel);
      return next;
    });
  };

  if (visibleSlots.length === 0) {
    return (
      <div className="p-10 text-center text-muted-foreground font-mono text-sm">
        Nothing happening right now in this track.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      {visibleSlots.map((slot) => {
        const slotStatus = getItemStatus(slot.startTime, slot.endTime, nowMinutes);
        const isActive = slotStatus === 'current';
        const isExpanded = expandedSlots.has(slot.timeLabel);

        return (
          <div
            key={slot.timeLabel}
            className="rounded-xl overflow-hidden border shadow-sm"
            style={{ borderColor: isActive ? hex : 'var(--border)' }}
          >
            {/* Time slot header — clickable to expand/collapse */}
            <button
              onClick={() => toggleSlot(slot.timeLabel)}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-white text-left"
              style={{
                background: `linear-gradient(135deg, ${hex}ee 0%, ${hex} 100%)`,
                boxShadow: isActive ? `0 2px 12px ${hex}55` : undefined,
              }}
            >
              <Clock className="w-4 h-4 shrink-0 opacity-90" />
              <span className="font-bold text-sm tracking-wide flex-1">{slot.timeLabel}</span>
              {isActive && (
                <span className="bg-white/25 backdrop-blur-sm text-white font-mono text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                  NOW
                </span>
              )}
              <ChevronDown
                className="w-4 h-4 shrink-0 opacity-80 transition-transform duration-200"
                style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {/* Zone sessions — hidden when collapsed */}
            {isExpanded && (
              <div className="bg-card">
                {slot.items.map((session, i) => {
                  const key = sessionKey(track.id, session);
                  const isBookmarked = bookmarks.has(key);

                  return (
                    <div
                      key={key}
                      className={`flex items-start gap-3 py-4 pr-4 group transition-colors hover:bg-muted/40 ${
                        i > 0 ? 'border-t border-border' : ''
                      }`}
                      style={{ paddingLeft: '1.25rem', borderLeft: `4px solid ${hex}` }}
                    >
                      <div className="flex-1 min-w-0">
                        {session.zone && (
                          <p
                            className="font-mono text-[11px] font-black uppercase mb-1 tracking-wide"
                            style={{ color: hex }}
                          >
                            {session.zone}
                          </p>
                        )}
                        <p className="text-sm font-semibold leading-snug text-foreground">
                          {session.title}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleBookmark(key)}
                        className="shrink-0 p-1.5 hover:opacity-70 transition-opacity mt-0.5"
                        title={isBookmarked ? 'Remove bookmark' : 'Bookmark this session'}
                      >
                        {isBookmarked
                          ? <BookmarkCheck className="w-4 h-4 text-primary" />
                          : <Bookmark className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Breakouts() {
  const { data: tracks, isLoading, isError } = useGetBreakouts();
  const [activeTab, setActiveTab] = useState('');
  const [search, setSearch] = useState('');
  const [filterNow, setFilterNow] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(loadBookmarks);
  const [nowMinutes, setNowMinutes] = useState(getNowMinutes);

  // Set initial active tab once data loads
  useEffect(() => {
    if (tracks && tracks.length > 0 && !activeTab) {
      setActiveTab(tracks[0].id);
    }
  }, [tracks, activeTab]);

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
    if (!isSearching || !tracks) return [];
    const results: SearchResult[] = [];
    for (const track of tracks) {
      for (const session of track.sessions) {
        const haystack = [track.name, session.title, session.zone ?? '', session.time_label].join(' ').toLowerCase();
        if (haystack.includes(query)) {
          results.push({ track, session });
        }
      }
    }
    return results;
  }, [query, tracks]);

  const activeBreaks = BREAKS.filter((b) => getItemStatus(b.start, b.end, nowMinutes) === 'current');
  const upcomingBreaks = BREAKS.filter((b) => getItemStatus(b.start, b.end, nowMinutes) === 'future');

  const activeTrack = tracks?.find((t) => t.id === activeTab) ?? tracks?.[0];
  const activeHex = activeTrack ? trackHex(activeTrack.color) : '#2563eb';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Sticky outer header ─────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background border-b border-border shrink-0">
        {/* Title */}
        <div className="px-5 pt-4 pb-2">
          <h1 className="font-mono font-black text-lg uppercase tracking-tight">Breakout Sessions</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">1:30 PM – 4:00 PM · Multiple tracks</p>
        </div>

        {/* Break banners */}
        <div className="px-4 pb-2 flex flex-col gap-1.5 empty:hidden">
          {activeBreaks.map((b) => (
            <div key={b.label} className="bg-amber-400 text-black border border-amber-600 px-4 py-2 rounded-lg font-mono text-xs font-black uppercase flex items-center gap-2">
              <span>☕</span> BREAK IN PROGRESS · {b.label}
            </div>
          ))}
          {activeBreaks.length === 0 && upcomingBreaks.length > 0 && (
            <div className="bg-muted border border-border px-4 py-2 rounded-lg font-mono text-xs text-muted-foreground flex items-center gap-2">
              <span>☕</span> Upcoming breaks: {upcomingBreaks.map((b) => b.label).join(' · ')}
            </div>
          )}
          {activeBreaks.length === 0 && upcomingBreaks.length === 0 && (
            <div className="bg-muted border border-border px-4 py-2 rounded-lg font-mono text-xs text-muted-foreground flex items-center gap-2">
              <span>☕</span> Breaks: <strong className="text-foreground">2:15–2:30 PM</strong> &amp; <strong className="text-foreground">3:15–3:30 PM</strong>
            </div>
          )}
        </div>

        {/* Search + filter */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder='Search sessions…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm bg-muted border border-border rounded-lg font-mono focus:outline-none focus:border-primary transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setFilterNow((v) => !v)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg border font-mono text-xs font-bold uppercase transition-colors ${
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

        {/* Track tabs */}
        {tracks && (
          <div className="overflow-x-auto border-t border-border">
            <div className="flex min-w-max">
              {tracks.map((track) => {
                const isActive = activeTab === track.id;
                const hex = trackHex(track.color);
                const nowCount = track.sessions.filter(
                  (s) => getItemStatus(s.start_time, s.end_time, nowMinutes) === 'current'
                ).length;

                return (
                  <button
                    key={track.id}
                    onClick={() => setActiveTab(track.id)}
                    style={{ borderBottomColor: isActive ? hex : 'transparent', color: isActive ? hex : undefined }}
                    className={`relative px-5 py-3 text-xs font-bold uppercase whitespace-nowrap border-b-[3px] transition-all ${
                      isActive
                        ? 'bg-background font-black'
                        : 'text-muted-foreground hover:text-foreground bg-background hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: hex }}
                      />
                      <span>{track.name}</span>
                      {nowCount > 0 && !filterNow && (
                        <span
                          className="text-white font-mono text-[9px] font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
                          style={{ backgroundColor: hex }}
                        >
                          {nowCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Loading / error states ──────────────────────────────── */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground font-mono text-sm">
          Loading breakout sessions…
        </div>
      )}
      {isError && (
        <div className="flex-1 flex items-center justify-center text-destructive font-mono text-sm">
          Failed to load sessions. Please refresh.
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      {tracks && isSearching ? (
        <div className="flex-1 overflow-auto">
          <div className="px-5 pt-4 pb-1 font-mono text-xs text-muted-foreground font-bold uppercase">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{query}"
          </div>
          <SearchResults
            results={searchResults}
            bookmarks={bookmarks}
            toggleBookmark={toggleBookmark}
            nowMinutes={nowMinutes}
          />
        </div>
      ) : tracks && !isSearching && activeTrack ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            {/* ── Sticky location banner ── */}
            <div
              className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 text-white"
              style={{
                background: `linear-gradient(135deg, ${activeHex}f0 0%, ${activeHex} 100%)`,
                boxShadow: `0 2px 12px ${activeHex}40`,
              }}
            >
              <MapPin className="w-5 h-5 shrink-0" />
              <span className="font-bold text-base tracking-tight">{activeTrack.location}</span>
            </div>

            {/* Active track sessions */}
            <TrackTab
              track={activeTrack}
              bookmarks={bookmarks}
              toggleBookmark={toggleBookmark}
              nowMinutes={nowMinutes}
              filterNow={filterNow}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
