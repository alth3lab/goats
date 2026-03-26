import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { activitiesApi } from '@/lib/api';
import { LoadingScreen, EmptyState } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { formatDate, formatTime } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import { SearchBar } from '@/components/SearchBar';
import type { Activity } from '@/types';

const ACTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  CREATE: 'add-circle',
  UPDATE: 'create',
  DELETE: 'trash',
  LOGIN: 'log-in',
  EXPORT: 'download',
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: Colors.success,
  UPDATE: Colors.info,
  DELETE: Colors.error,
  LOGIN: Colors.primary,
  EXPORT: Colors.warning,
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'إنشاء',
  UPDATE: 'تعديل',
  DELETE: 'حذف',
  LOGIN: 'دخول',
  EXPORT: 'تصدير',
};

const ENTITY_LABELS: Record<string, string> = {
  GOAT: 'حيوان',
  HEALTH: 'سجل صحي',
  SALE: 'بيع',
  EXPENSE: 'مصروف',
  BREEDING: 'تربية',
  FEED: 'علف',
  PEN: 'حظيرة',
  OWNER: 'مالك',
  CALENDAR: 'حدث',
  INVENTORY: 'مخزون',
  SETTINGS: 'إعدادات',
  USER: 'مستخدم',
};

export default function ActivitiesScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const { showToast } = useToast();

  const fetchActivities = useCallback(async (pageNum = 0, append = false) => {
    try {
      const result = await activitiesApi.list({ page: String(pageNum), limit: '30' });
      const data = Array.isArray(result) ? result : (result as { data?: Record<string, unknown>[] }).data || [];
      const items = data as unknown as Activity[];

      if (append) {
        setActivities(prev => [...prev, ...items]);
      } else {
        setActivities(items);
      }
      setHasMore(items.length >= 30);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل النشاطات';
      showToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchActivities(nextPage, true);
  };

  const renderActivity = ({ item, index }: { item: Activity; index: number }) => {
    const actionColor = ACTION_COLORS[item.action] || Colors.textSecondary;
    const actionIcon = ACTION_ICONS[item.action] || 'ellipsis-horizontal';
    const prevItem = index > 0 ? activities[index - 1] : null;
    const currentDate = formatDate(item.createdAt);
    const prevDate = prevItem ? formatDate(prevItem.createdAt) : null;
    const showDateHeader = currentDate !== prevDate;

    return (
      <>
        {showDateHeader && (
          <View style={styles.dateHeader}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>{currentDate}</Text>
            <View style={styles.dateLine} />
          </View>
        )}
        <View style={styles.activityRow}>
          <View style={[styles.activityIcon, { backgroundColor: actionColor + '15' }]}>
            <Ionicons name={actionIcon} size={18} color={actionColor} />
          </View>
          <View style={styles.activityContent}>
            <View style={styles.activityTop}>
              <View style={styles.actionRow}>
                <Text style={[styles.actionLabel, { color: actionColor }]}>
                  {ACTION_LABELS[item.action] || item.action}
                </Text>
                <Text style={styles.entityLabel}>
                  {ENTITY_LABELS[item.entity] || item.entity}
                </Text>
              </View>
              <Text style={styles.timeText}>
                {formatTime(item.createdAt)}
              </Text>
            </View>
            {item.description && (
              <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            )}
            {item.user && (
              <Text style={styles.userText}>{item.user.fullName}</Text>
            )}
          </View>
        </View>
      </>
    );
  };

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;

  return (
    <>
      <Stack.Screen options={{ title: 'سجل النشاط', headerShown: true, headerStyle: { backgroundColor: Colors.primary }, headerTintColor: '#fff', headerTitleStyle: { ...Typography.h4, color: '#fff' }, headerTitleAlign: 'center' }} />
      <View style={styles.container}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="بحث في النشاطات..." />
        <FlatList
          data={search.trim() ? activities.filter(a => a.description?.toLowerCase().includes(search.toLowerCase()) || a.entity?.toLowerCase().includes(search.toLowerCase()) || a.user?.fullName?.toLowerCase().includes(search.toLowerCase())) : activities}
          renderItem={renderActivity}
          keyExtractor={(item, index) => item.id || String(index)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setPage(0); fetchActivities(0); }} colors={[Colors.primary]} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <EmptyState icon="time" title="لا يوجد نشاطات" message="سجل النشاطات فارغ" />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingBottom: 40 },
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginVertical: Spacing.md },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
  dateText: { ...Typography.smallBold, color: Colors.textSecondary, paddingHorizontal: Spacing.sm },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.md, ...Shadows.sm },
  activityIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  activityContent: { flex: 1 },
  activityTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionLabel: { ...Typography.captionBold },
  entityLabel: { ...Typography.caption, color: Colors.textSecondary },
  timeText: { ...Typography.small, color: Colors.textLight },
  description: { ...Typography.small, color: Colors.textSecondary, marginBottom: 4 },
  userText: { ...Typography.small, color: Colors.primary },
  footerLoader: { paddingVertical: Spacing.xl, alignItems: 'center' },
});
