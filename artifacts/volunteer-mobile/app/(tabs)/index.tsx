import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AGENDA, getItemStatus, toMinutes } from '@workspace/event-data';
import type { AgendaItem } from '@workspace/event-data';
import { useColors } from '@/hooks/useColors';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getNowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getCountdown(startTime: string, nowMinutes: number): string | null {
  const start = toMinutes(startTime);
  const diff = start - nowMinutes;
  if (diff <= 0 || diff > 120) return null;
  if (diff < 60) return `${diff}m`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ── AgendaRow ─────────────────────────────────────────────────────────────────

interface AgendaRowProps {
  item: AgendaItem;
  isCurrent: boolean;
  isNext: boolean;
  isPast: boolean;
  countdown: string | null;
  colors: ReturnType<typeof useColors>;
  onPressBreakout: () => void;
}

function AgendaRow({ item, isCurrent, isNext, isPast, countdown, colors, onPressBreakout }: AgendaRowProps) {
  const borderColor = isCurrent
    ? colors.primary
    : isNext
    ? '#F59E0B'
    : isPast
    ? colors.border
    : colors.border;

  const bgColor = isCurrent
    ? colors.primary + '12'
    : 'transparent';

  const container: import('react-native').ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: colors.radius,
    marginBottom: 8,
    borderLeftWidth: (isCurrent || isNext) ? 4 : 1,
    borderLeftColor: borderColor,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: (isCurrent || isNext) ? borderColor : colors.border,
    borderBottomColor: (isCurrent || isNext) ? borderColor : colors.border,
    borderRightColor: (isCurrent || isNext) ? borderColor : colors.border,
    opacity: isPast ? 0.5 : 1,
    overflow: 'hidden',
  };

  if (item.isBreakout) {
    return (
      <Pressable
        style={({ pressed }) => [container, { opacity: pressed ? 0.7 : (isPast ? 0.5 : 1) }]}
        onPress={onPressBreakout}
        accessibilityLabel="See breakout sessions"
      >
        <View style={[styles.rowInner, { backgroundColor: bgColor }]}>
          <View style={styles.rowContent}>
            <View style={styles.timeRow}>
              <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
              {isCurrent && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>NOW</Text>
                </View>
              )}
              {isNext && (
                <View style={[styles.badge, { backgroundColor: '#F59E0B' }]}>
                  <Text style={[styles.badgeText, { color: '#000' }]}>NEXT</Text>
                </View>
              )}
              {countdown && !isCurrent && (
                <Text style={[styles.countdown, { color: '#F59E0B' }]}>{countdown}</Text>
              )}
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={11} color={colors.mutedForeground} />
              <Text style={[styles.locationText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
            <View style={[styles.breakoutHint, { borderTopColor: colors.border }]}>
              <Feather name="arrow-right" size={13} color={colors.primary} />
              <Text style={[styles.breakoutHintText, { color: colors.primary }]}>
                Tap to see all breakout tracks
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={container}>
      <View style={[styles.rowInner, { backgroundColor: bgColor }]}>
        <View style={styles.rowContent}>
          <View style={styles.timeRow}>
            <Feather name="clock" size={11} color={colors.mutedForeground} />
            <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
            {isCurrent && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>NOW</Text>
              </View>
            )}
            {isNext && (
              <View style={[styles.badge, { backgroundColor: '#F59E0B' }]}>
                <Text style={[styles.badgeText, { color: '#000' }]}>NEXT</Text>
              </View>
            )}
            {countdown && !isCurrent && (
              <Text style={[styles.countdown, { color: '#F59E0B' }]}>in {countdown}</Text>
            )}
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={11} color={colors.mutedForeground} />
            <Text style={[styles.locationText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function AgendaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [nowMinutes, setNowMinutes] = useState(getNowMinutes);
  const listRef = useRef<FlatList<AgendaItem>>(null);
  const scrolled = useRef(false);

  // Tick every 30 seconds
  useEffect(() => {
    const id = setInterval(() => setNowMinutes(getNowMinutes()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Compute statuses for all items
  const statuses = useMemo(() => {
    return AGENDA.map((item) => getItemStatus(item.startTime, item.endTime, nowMinutes));
  }, [nowMinutes]);

  // Find current and next item indices
  const { currentIndex, nextIndex } = useMemo(() => {
    let currentIndex = -1;
    let nextIndex = -1;
    for (let i = 0; i < statuses.length; i++) {
      if (statuses[i] === 'current') { currentIndex = i; break; }
      if (statuses[i] === 'future' && nextIndex === -1) nextIndex = i;
    }
    return { currentIndex, nextIndex };
  }, [statuses]);

  const highlightNextIndex = currentIndex === -1 ? nextIndex : -1;

  // Auto-scroll to current/next on mount
  useEffect(() => {
    if (scrolled.current) return;
    const targetIdx = currentIndex !== -1 ? currentIndex : nextIndex;
    if (targetIdx === -1 || !listRef.current) return;
    const timeout = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: targetIdx, animated: true, viewPosition: 0.3 });
      scrolled.current = true;
    }, 400);
    return () => clearTimeout(timeout);
  }, [currentIndex, nextIndex]);

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number }) => {
      const timeout = setTimeout(() => {
        listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.3 });
      }, 200);
      return () => clearTimeout(timeout);
    },
    []
  );

  const HEADER_H = 64;
  const WEB_TOP = Platform.OS === 'web' ? 67 : 0;
  const WEB_BOTTOM = Platform.OS === 'web' ? 34 : 0;

  const renderItem = useCallback(
    ({ item, index }: { item: AgendaItem; index: number }) => {
      const status = statuses[index];
      const isCurrent = status === 'current';
      const isNext = index === highlightNextIndex;
      const isPast = status === 'past';
      const countdown = isNext ? getCountdown(item.startTime, nowMinutes) : null;

      return (
        <AgendaRow
          item={item}
          isCurrent={isCurrent}
          isNext={isNext}
          isPast={isPast}
          countdown={countdown}
          colors={colors}
          onPressBreakout={() => router.push('/(tabs)/breakouts')}
        />
      );
    },
    [statuses, highlightNextIndex, nowMinutes, colors, router]
  );

  const keyExtractor = useCallback((item: AgendaItem) => item.id, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sticky header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            paddingTop: insets.top + WEB_TOP + 12,
            height: HEADER_H + insets.top + WEB_TOP,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Agenda</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          Customer Support Summit · Full-Day Schedule
        </Text>
      </View>

      <FlatList
        ref={listRef}
        data={AGENDA}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: HEADER_H + insets.top + WEB_TOP + 8,
            paddingBottom: insets.bottom + WEB_BOTTOM + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        scrollEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    justifyContent: 'flex-end',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  listContent: {
    paddingHorizontal: 12,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 8,
  },
  rowContent: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  countdown: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  breakoutHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  breakoutHintText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
});
