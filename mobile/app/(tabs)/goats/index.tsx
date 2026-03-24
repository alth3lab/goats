import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { goatsApi } from '@/lib/api';
import GoatCard from '@/components/GoatCard';
import { EmptyState, Button } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows, StatusLabels } from '@/lib/theme';
import type { Goat } from '@/types';

const STATUS_FILTERS = [
  { key: 'ALL', label: 'الكل' },
  { key: 'ACTIVE', label: 'نشط' },
  { key: 'SOLD', label: 'مباع' },
  { key: 'DECEASED', label: 'نافق' },
  { key: 'QUARANTINE', label: 'حجر' },
];

export default function GoatsListScreen() {
  const router = useRouter();
  const [goats, setGoats] = useState<Goat[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [page, setPage] = useState(0);

  const fetchGoats = useCallback(async (pageNum = 0, append = false) => {
    try {
      const params: Record<string, string> = {
        page: String(pageNum),
        limit: '20',
      };
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const result = await goatsApi.list(params);
      const data = (result.data || []) as unknown as Goat[];

      if (append) {
        setGoats(prev => [...prev, ...data]);
      } else {
        setGoats(data);
      }
      setTotal(result.total || 0);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    setPage(0);
    fetchGoats(0);
  }, [statusFilter, fetchGoats]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchGoats(0);
  };

  const loadMore = () => {
    if (loadingMore || goats.length >= total) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchGoats(nextPage, true);
  };

  const filteredGoats = search.trim()
    ? goats.filter(g =>
        g.tagId.toLowerCase().includes(search.toLowerCase()) ||
        g.name?.toLowerCase().includes(search.toLowerCase()) ||
        g.breed?.nameAr.includes(search)
      )
    : goats;

  const renderGoat = ({ item }: { item: Goat }) => (
    <GoatCard
      goat={item}
      onPress={() => router.push(`/(tabs)/goats/${item.id}`)}
    />
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="بحث بالرقم أو الاسم..."
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
            textAlign="right"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={Colors.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/goats/add')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, statusFilter === f.key && styles.filterTabActive]}
            onPress={() => setStatusFilter(f.key)}
          >
            <Text style={[styles.filterTabText, statusFilter === f.key && styles.filterTabTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {total} حيوان
        </Text>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredGoats}
          renderItem={renderGoat}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <EmptyState
              icon="paw"
              title="لا يوجد حيوانات"
              message={statusFilter !== 'ALL' ? 'جرّب تغيير الفلتر' : 'أضف أول حيوان لبدء إدارة القطيع'}
              action={{ title: 'إضافة حيوان', onPress: () => router.push('/(tabs)/goats/add') }}
            />
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchRow: {
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.caption,
    color: Colors.text,
    paddingVertical: 0,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  countRow: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  countText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
});
