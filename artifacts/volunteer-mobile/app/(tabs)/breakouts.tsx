import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BREAKOUT_TRACKS, getItemStatus, toMinutes } from '@workspace/event-data';
import type { BreakoutSession, BreakoutTrack } from '@workspace/event-data';
import { useColors } from '@/hooks/useColors';

// ── Constants ─────────────────────────────────────────────────────────────────

const BOOKMARK_KEY = 'vhub_mobile_bookmarks';

const BREAKS = [
  { label: '2:15 PM – 2:30 PM', start: '14:15', end: '14:30' },
  { label: '3:15 PM – 3:30 PM', start: '15:15', end: '15:30' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function sessionKey(trackId: string, s: BreakoutSession) {
  return `${trackId}|${s.startTime}|${s.title}`;
}

function groupBySlot(sessions: BreakoutSession[]): {
  timeLabel: string;
  startTime: string;
  endTime: string;
  items: BreakoutSession[];
}[] {
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

async function loadBookmarks(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(BOOKMARK_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<string>();
  }
}

async function saveBookmarks(set: Set<string>) {
  try {
    await AsyncStorage.setItem(BOOKMARK_KEY, JSON.stringify([...set]));
  } catch {}
}

// ── Session Card ──────────────────────────────────────────────────────────────

interface SessionCardProps {
  session: BreakoutSession;
  trackId: string;
  hex: string;
  isBookmarked: boolean;
  onToggleBookmark: (key: string) => void;
  colors: ReturnType<typeof useColors>;
}

function SessionCard({ session, trackId, hex, isBookmarked, onToggleBookmark, colors }: SessionCardProps) {
  const key = sessionKey(trackId, session);
  return (
    <View style={[styles.sessionCard, { borderLeftColor: hex, backgroundColor: colors.card, borderTopColor: colors.border, borderRightColor: colors.border, borderBottomColor: colors.border }]}>
      {session.zone ? (
        <Text style={[styles.sessionZone, { color: hex }]}>{session.zone}</Text>
      ) : null}
      <View style={styles.sessionRow}>
        <Text style={[styles.sessionTitle, { color: colors.foreground }]} numberOfLines={3}>
          {session.title}
        </Text>
        <Pressable
          hitSlop={8}
          onPress={() => onToggleBookmark(key)}
          accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark session'}
        >
          <Feather
            name={isBookmarked ? 'bookmark' : 'bookmark'}
            size={16}
            color={isBookmarked ? colors.primary : colors.mutedForeground}
            style={isBookmarked ? { opacity: 1 } : { opacity: 0.6 }}
          />
        </Pressable>
      </View>
    </View>
  );
}

// ── Time Slot Group ───────────────────────────────────────────────────────────

interface TimeSlotGroupProps {
  timeLabel: string;
  startTime: string;
  endTime: string;
  sessions: BreakoutSession[];
  track: BreakoutTrack;
  bookmarks: Set<string>;
  onToggleBookmark: (key: string) => void;
  nowMinutes: number;
  colors: ReturnType<typeof useColors>;
}

function TimeSlotGroup({ timeLabel, startTime, endTime, sessions, track, bookmarks, onToggleBookmark, nowMinutes, colors }: TimeSlotGroupProps) {
  const hex = track.hex;
  const isActive = getItemStatus(startTime, endTime, nowMinutes) === 'current';

  return (
    <View style={[styles.slotGroup, { borderColor: isActive ? hex : colors.border, backgroundColor: colors.card }]}>
      {/* Slot header */}
      <View style={[styles.slotHeader, { backgroundColor: hex }]}>
        <Feather name="clock" size={13} color="#fff" />
        <Text style={styles.slotHeaderText}>{timeLabel}</Text>
        {isActive && (
          <View style={styles.nowPill}>
            <Text style={styles.nowPillText}>NOW</Text>
          </View>
        )}
      </View>
      {/* Sessions */}
      {sessions.map((session, i) => {
        const key = sessionKey(track.id, session);
        return (
          <SessionCard
            key={key}
            session={session}
            trackId={track.id}
            hex={hex}
            isBookmarked={bookmarks.has(key)}
            onToggleBookmark={onToggleBookmark}
            colors={colors}
          />
        );
      })}
    </View>
  );
}

// ── Search Result ─────────────────────────────────────────────────────────────

interface SearchResultItem {
  track: BreakoutTrack;
  session: BreakoutSession;
}

interface SearchResultCardProps {
  item: SearchResultItem;
  bookmarks: Set<string>;
  onToggleBookmark: (key: string) => void;
  nowMinutes: number;
  colors: ReturnType<typeof useColors>;
}

function SearchResultCard({ item, bookmarks, onToggleBookmark, nowMinutes, colors }: SearchResultCardProps) {
  const { track, session } = item;
  const hex = track.hex;
  const key = sessionKey(track.id, session);
  const status = getItemStatus(session.startTime, session.endTime, nowMinutes);

  return (
    <View style={[styles.searchResultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Track strip */}
      <View style={[styles.searchResultTrackStrip, { backgroundColor: hex + '18' }]}>
        <View style={[styles.trackDot, { backgroundColor: hex }]} />
        <Text style={[styles.searchResultTrackName, { color: hex }]}>{track.name}</Text>
        {status === 'current' && (
          <View style={[styles.badge, { backgroundColor: hex, marginLeft: 'auto' as any }]}>
            <Text style={styles.badgeTextWhite}>NOW</Text>
          </View>
        )}
      </View>
      {/* Session body */}
      <View style={[styles.searchResultBody, { borderLeftColor: hex }]}>
        {session.zone ? (
          <Text style={[styles.sessionZone, { color: hex }]}>{session.zone}</Text>
        ) : null}
        <View style={styles.sessionRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sessionTitle, { color: colors.foreground }]} numberOfLines={3}>
              {session.title}
            </Text>
            <View style={styles.locationRow}>
              <Feather name="clock" size={11} color={colors.mutedForeground} />
              <Text style={[styles.locationText, { color: colors.mutedForeground }]}>{session.timeLabel}</Text>
            </View>
          </View>
          <Pressable hitSlop={8} onPress={() => onToggleBookmark(key)}>
            <Feather
              name="bookmark"
              size={16}
              color={bookmarks.has(key) ? colors.primary : colors.mutedForeground}
              style={bookmarks.has(key) ? { opacity: 1 } : { opacity: 0.6 }}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function BreakoutsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [nowMinutes, setNowMinutes] = useState(getNowMinutes);
  const [activeTrackId, setActiveTrackId] = useState<string>(BREAKOUT_TRACKS[0].id);
  const [search, setSearch] = useState('');
  const [filterNow, setFilterNow] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const headerRef = useRef<View>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Load bookmarks from AsyncStorage
  useEffect(() => {
    loadBookmarks().then(setBookmarks);
  }, []);

  // Tick every 30 seconds
  useEffect(() => {
    const id = setInterval(() => setNowMinutes(getNowMinutes()), 30_000);
    return () => clearInterval(id);
  }, []);

  const toggleBookmark = useCallback((key: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveBookmarks(next);
      return next;
    });
  }, []);

  const activeTrack = useMemo(
    () => BREAKOUT_TRACKS.find((t) => t.id === activeTrackId) ?? BREAKOUT_TRACKS[0],
    [activeTrackId]
  );

  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;

  const searchResults: SearchResultItem[] = useMemo(() => {
    if (!isSearching) return [];
    const results: SearchResultItem[] = [];
    for (const track of BREAKOUT_TRACKS) {
      for (const session of track.sessions) {
        const haystack = [track.name, session.title, session.zone ?? '', session.timeLabel].join(' ').toLowerCase();
        if (haystack.includes(query)) results.push({ track, session });
      }
    }
    return results;
  }, [query]);

  // Grouped slots for active track
  const slots = useMemo(() => {
    const allSlots = groupBySlot(activeTrack.sessions);
    if (filterNow) {
      return allSlots.filter((s) => getItemStatus(s.startTime, s.endTime, nowMinutes) === 'current');
    }
    return allSlots;
  }, [activeTrack, filterNow, nowMinutes]);

  const activeBreaks = BREAKS.filter((b) => getItemStatus(b.start, b.end, nowMinutes) === 'current');
  const upcomingBreaks = BREAKS.filter((b) => getItemStatus(b.start, b.end, nowMinutes) === 'future');

  const WEB_TOP = Platform.OS === 'web' ? 67 : 0;
  const WEB_BOTTOM = Platform.OS === 'web' ? 34 : 0;

  const renderSlot = useCallback(
    ({ item }: { item: ReturnType<typeof groupBySlot>[number] }) => (
      <TimeSlotGroup
        timeLabel={item.timeLabel}
        startTime={item.startTime}
        endTime={item.endTime}
        sessions={item.items}
        track={activeTrack}
        bookmarks={bookmarks}
        onToggleBookmark={toggleBookmark}
        nowMinutes={nowMinutes}
        colors={colors}
      />
    ),
    [activeTrack, bookmarks, toggleBookmark, nowMinutes, colors]
  );

  const renderSearchResult = useCallback(
    ({ item }: { item: SearchResultItem }) => (
      <SearchResultCard
        item={item}
        bookmarks={bookmarks}
        onToggleBookmark={toggleBookmark}
        nowMinutes={nowMinutes}
        colors={colors}
      />
    ),
    [bookmarks, toggleBookmark, nowMinutes, colors]
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ── Fixed header ─────────────────────────────────── */}
      <View
        ref={headerRef}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        style={[
          styles.fixedHeader,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            paddingTop: insets.top + WEB_TOP,
          },
        ]}
      >
        {/* Title row */}
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Breakout Sessions</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              1:30 PM – 4:00 PM · Multiple tracks
            </Text>
          </View>
        </View>

        {/* Break banner */}
        {activeBreaks.length > 0 ? (
          <View style={[styles.breakBanner, { backgroundColor: '#FCD34D', borderColor: '#D97706' }]}>
            <Feather name="coffee" size={13} color="#000" />
            <Text style={[styles.breakBannerText, { color: '#000' }]}>
              BREAK IN PROGRESS · {activeBreaks[0].label}
            </Text>
          </View>
        ) : upcomingBreaks.length > 0 ? (
          <View style={[styles.breakBanner, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="coffee" size={13} color={colors.mutedForeground} />
            <Text style={[styles.breakBannerText, { color: colors.mutedForeground }]}>
              Upcoming: {upcomingBreaks.map((b) => b.label).join(' · ')}
            </Text>
          </View>
        ) : null}

        {/* Search + filter */}
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="search" size={15} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search sessions..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {search.length > 0 && Platform.OS !== 'ios' && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Feather name="x" size={14} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
          <Pressable
            style={[
              styles.filterBtn,
              {
                backgroundColor: filterNow ? colors.primary : colors.muted,
                borderColor: filterNow ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setFilterNow((v) => !v)}
            accessibilityLabel="Filter to now"
          >
            <Feather name="filter" size={14} color={filterNow ? colors.primaryForeground : colors.mutedForeground} />
            <Text style={[styles.filterBtnText, { color: filterNow ? colors.primaryForeground : colors.mutedForeground }]}>
              Now
            </Text>
          </Pressable>
        </View>

        {/* Track tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tabsContainer, { borderTopColor: colors.border }]}
          contentContainerStyle={styles.tabsContent}
        >
          {BREAKOUT_TRACKS.map((track) => {
            const isActive = track.id === activeTrackId;
            const nowCount = track.sessions.filter(
              (s) => getItemStatus(s.startTime, s.endTime, nowMinutes) === 'current'
            ).length;
            return (
              <Pressable
                key={track.id}
                onPress={() => setActiveTrackId(track.id)}
                style={[
                  styles.tab,
                  {
                    borderBottomColor: isActive ? track.hex : 'transparent',
                    borderBottomWidth: 3,
                  },
                ]}
              >
                <View style={[styles.trackDot, { backgroundColor: track.hex }]} />
                <Text
                  style={[
                    styles.tabText,
                    { color: isActive ? track.hex : colors.mutedForeground },
                    isActive && styles.tabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {track.name}
                </Text>
                {nowCount > 0 && !filterNow && (
                  <View style={[styles.tabBadge, { backgroundColor: track.hex }]}>
                    <Text style={styles.tabBadgeText}>{nowCount}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Content ──────────────────────────────────────── */}
      {isSearching ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => sessionKey(item.track.id, item.session)}
          renderItem={renderSearchResult}
          contentContainerStyle={{
            paddingTop: headerHeight + 4,
            paddingBottom: insets.bottom + WEB_BOTTOM + 80,
            paddingHorizontal: 12,
            gap: 8,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="search" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No sessions found</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          key={activeTrackId + (filterNow ? '_now' : '')}
          data={slots}
          keyExtractor={(item) => item.timeLabel}
          renderItem={renderSlot}
          contentContainerStyle={{
            paddingTop: headerHeight + 4,
            paddingBottom: insets.bottom + WEB_BOTTOM + 80,
            paddingHorizontal: 12,
            gap: 10,
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={[styles.locationBanner, { backgroundColor: activeTrack.hex }]}>
              <Feather name="map-pin" size={15} color="#fff" />
              <Text style={styles.locationBannerText} numberOfLines={2}>{activeTrack.location}</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="clock" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {filterNow ? 'Nothing happening right now' : 'No sessions in this track'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingBottom: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800' as const,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  headerSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  breakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 6,
  },
  breakBannerText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
  tabsContainer: {
    borderTopWidth: 1,
    marginHorizontal: -14,
  },
  tabsContent: {
    paddingHorizontal: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    maxWidth: 100,
  },
  tabTextActive: {
    fontFamily: 'Inter_700Bold',
  },
  tabBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  trackDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  locationBannerText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  slotGroup: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  slotHeaderText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    flex: 1,
  },
  nowPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  nowPillText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  sessionCard: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  sessionZone: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sessionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
    flex: 1,
  },
  searchResultCard: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  searchResultTrackStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  searchResultTrackName: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  searchResultBody: {
    borderLeftWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeTextWhite: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
