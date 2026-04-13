import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { breedingApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LoadingScreen, EmptyState } from '@/components/ui';
import {
  Colors, Spacing, Radius, Typography, Shadows, Gradients,
  PregnancyStatusLabels, PregnancyStatusColors,
} from '@/lib/theme';
import { formatDate, western } from '@/lib/formatters';
import { SearchBar } from '@/components/SearchBar';
import type { Breeding } from '@/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const STATUS_FILTERS = [
  { key: 'ALL', label: 'الكل' },
  { key: 'MATED', label: 'ملقح' },
  { key: 'PREGNANT', label: 'حامل' },
  { key: 'DELIVERED', label: 'ولدت' },
  { key: 'FAILED', label: 'فشل' },
];

// Separate component for breeding card to use hooks properly
interface BreedingCardProps {
  item: Breeding;
  onPress: () => void;
}

function BreedingCard({ item, onPress }: BreedingCardProps) {
  const scale = useSharedValue(1);
  const statusColor = PregnancyStatusColors[item.pregnancyStatus] || Colors.textSecondary;
  
  const getDaysRemaining = (dueDate?: string) => {
    if (!dueDate) return null;
    const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };
  
  const daysLeft = getDaysRemaining(item.dueDate);
  const isUrgent = item.pregnancyStatus === 'PREGNANT' && daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
  const isOverdue = daysLeft !== null && daysLeft < 0;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {isUrgent && (
        <LinearGradient
          colors={['rgba(212, 131, 154, 0.08)', 'rgba(212, 131, 154, 0.02)'] as unknown as readonly [string, string, ...string[]]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      {isOverdue && (
        <LinearGradient
          colors={['rgba(224, 92, 92, 0.08)', 'rgba(224, 92, 92, 0.02)'] as unknown as readonly [string, string, ...string[]]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}

      <View style={styles.cardTop}>
        <View style={styles.parentPair}>
          <View style={styles.parentChip}>
            <Ionicons name="female" size={16} color={Colors.female} />
            <Text style={styles.parentTag}>{item.mother?.tagId || '—'}</Text>
          </View>
          <Ionicons name="heart" size={14} color={Colors.female} />
          <View style={styles.parentChip}>
            <Ionicons name="male" size={16} color={Colors.male} />
            <Text style={styles.parentTag}>{item.father?.tagId || '—'}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {PregnancyStatusLabels[item.pregnancyStatus]}
          </Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>التلقيح: {formatDate(item.matingDate)}</Text>
        </View>
        {item.dueDate && item.pregnancyStatus !== 'DELIVERED' && item.pregnancyStatus !== 'FAILED' && (
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={14} color={isOverdue ? Colors.error : isUrgent ? Colors.warning : Colors.female} />
            <Text style={[styles.detailText, { color: isOverdue ? Colors.error : isUrgent ? Colors.warning : Colors.female, ...Typography.captionBold }]}>
              {isOverdue
                ? `متأخرة ${western(Math.abs(daysLeft!))} يوم ⚠️`
                : `موعد الولادة: ${formatDate(item.dueDate)}`
              }
              {daysLeft !== null && daysLeft >= 0 ? ` (${western(daysLeft)} يوم)` : ''}
            </Text>
          </View>
        )}
        {item.birthDate && (
          <View style={styles.detailItem}>
            <Ionicons name="heart-circle-outline" size={14} color={Colors.success} />
            <Text style={[styles.detailText, { color: Colors.success }]}>
              الولادة: {formatDate(item.birthDate)}
              {item.numberOfKids ? ` — ${western(item.numberOfKids)} مواليد` : ''}
            </Text>
          </View>
        )}
      </View>

      {item.notes && (
        <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
      )}

      <View style={styles.cardArrow}>
        <Ionicons name="chevron-back" size={18} color={Colors.textLight} />
      </View>
    </AnimatedPressable>
  );
}

export default function BreedingListScreen() {
  const router = useRouter();
  const { can } = useAuth();
  const [records, setRecords] = useState<Breeding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchRecords = useCallback(async () => {
    try {
      const data = await breedingApi.list();
      setRecords(data as unknown as Breeding[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل سجلات التربية';
      Alert.alert('خطأ', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
    }, [fetchRecords])
  );

  const filteredRecords = useMemo(() =>
    (filter === 'ALL' ? records : records.filter(r => r.pregnancyStatus === filter))
      .filter(r =>
        !search.trim() ||
        r.mother?.tagId?.toLowerCase().includes(search.toLowerCase()) ||
        r.father?.tagId?.toLowerCase().includes(search.toLowerCase()) ||
        r.notes?.toLowerCase().includes(search.toLowerCase())
      )
  , [filter, records, search]);

  const stats = useMemo(() => ({
    total: records.length,
    pregnant: records.filter(r => r.pregnancyStatus === 'PREGNANT').length,
    delivered: records.filter(r => r.pregnancyStatus === 'DELIVERED').length,
    failed: records.filter(r => r.pregnancyStatus === 'FAILED').length,
  }), [records]);

  const renderRecord = useCallback(({ item }: { item: Breeding }) => (
    <BreedingCard 
      item={item} 
      onPress={() => router.push({ pathname: '/(tabs)/breeding/[id]', params: { id: item.id } })} 
    />
  ), [router]);

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{western(stats.total)}</Text>
          <Text style={styles.statLabel}>إجمالي</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.female }]}>{western(stats.pregnant)}</Text>
          <Text style={styles.statLabel}>حوامل</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.success }]}>{western(stats.delivered)}</Text>
          <Text style={styles.statLabel}>ولادات</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.error }]}>{western(stats.failed)}</Text>
          <Text style={styles.statLabel}>فشل</Text>
        </View>
      </View>

      {/* Status Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {STATUS_FILTERS.map(f => {
          const isActive = filter === f.key;
          return (
            <Pressable
              key={f.key}
              style={({ pressed }) => [
                styles.filterTab,
                isActive && styles.filterTabActive,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter(f.key);
              }}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SearchBar value={search} onChangeText={setSearch} placeholder="بحث برقم الأم أو الأب..." />

      <FlatList
        data={filteredRecords}
        renderItem={renderRecord}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRecords(); }} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <EmptyState icon="git-merge" title="لا يوجد سجلات تربية" message="سجّل أول عملية تلقيح" action={{ title: 'تسجيل تلقيح', onPress: () => router.push('/(tabs)/breeding/add') }} />
        }
        showsVerticalScrollIndicator={false}
      />

      {can('__owner_admin__') && (
        <AnimatedPressable
          style={styles.fab}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.push('/(tabs)/breeding/add');
          }}
          onPressIn={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
        >
          <LinearGradient
            colors={Gradients.heroTeal as unknown as readonly [string, string, ...string[]]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Ionicons name="add" size={28} color="#fff" />
        </AnimatedPressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.surface, padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...Typography.h3, color: Colors.text, ...Typography.tabularNums },
  statLabel: { ...Typography.small, color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.borderLight },
  filterRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  filterTab: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterTabActive: { backgroundColor: Colors.female, borderColor: Colors.female },
  filterTabText: { ...Typography.small, color: Colors.textSecondary },
  filterTabTextActive: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.card, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  parentPair: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  parentChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.background, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  parentTag: { ...Typography.captionBold, color: Colors.text },
  statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: 3, borderRadius: Radius.full },
  statusText: { ...Typography.smallBold },
  cardDetails: { gap: Spacing.sm },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { ...Typography.caption, color: Colors.textSecondary },
  notes: { ...Typography.small, color: Colors.textLight, marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  cardArrow: { position: 'absolute', left: Spacing.md, top: '50%' },
  fab: { 
    position: 'absolute', 
    bottom: 24, 
    start: 24, 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center', 
    overflow: 'hidden',
    ...Shadows.fab,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
  },
});
