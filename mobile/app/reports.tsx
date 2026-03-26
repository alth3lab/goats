import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { statsApi } from '@/lib/api';
import { LoadingScreen, SectionHeader } from '@/components/ui';
import KPICard from '@/components/KPICard';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { formatNumber, western } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import type { DashboardStats } from '@/types';

export default function ReportsScreen() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear] = useState(new Date().getFullYear());
  const { showToast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const data = await statsApi.get(selectedYear);
      setStats(data as unknown as DashboardStats);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل التقارير';
      showToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;

  const monthly = stats?.monthly;
  const comparison = stats?.comparison;

  return (
    <>
      <Stack.Screen options={{ title: 'التقارير والإحصائيات', headerShown: true, headerStyle: { backgroundColor: Colors.primary }, headerTintColor: '#fff', headerTitleStyle: { ...Typography.h4, color: '#fff' }, headerTitleAlign: 'center' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Year Banner */}
        <View style={styles.yearBanner}>
          <Text style={styles.yearText}>تقرير سنة {western(selectedYear)}</Text>
        </View>

        {/* Herd Overview */}
        <View style={styles.section}>
          <SectionHeader title="نظرة عامة على القطيع" />
          <View style={styles.kpiRow}>
            <KPICard title="إجمالي" value={western(stats?.activeGoats ?? 0)} icon="paw" iconColor={Colors.primary} />
            <KPICard title="ذكور" value={western(stats?.maleGoats ?? 0)} icon="male" iconColor={Colors.male} />
          </View>
          <View style={styles.kpiRow}>
            <KPICard title="إناث" value={western(stats?.femaleGoats ?? 0)} icon="female" iconColor={Colors.female} />
            <KPICard title="حوامل" value={western(stats?.pregnantGoats ?? 0)} icon="heart" iconColor={Colors.female} />
          </View>
          <View style={styles.kpiRow}>
            <KPICard title="أنواع" value={western(stats?.totalTypes ?? 0)} icon="layers" iconColor={Colors.info} />
            <KPICard title="سلالات" value={western(stats?.totalBreeds ?? 0)} icon="pricetag" iconColor={Colors.warning} />
          </View>
        </View>

        {/* Financial Summary */}
        <View style={styles.section}>
          <SectionHeader title="الملخص المالي" />
          <View style={styles.finCard}>
            <FinRow label="إجمالي المبيعات" value={stats?.totalSales ?? 0} color={Colors.success} icon="trending-up" />
            <FinRow label="إجمالي المصروفات" value={stats?.totalExpenses ?? 0} color={Colors.error} icon="trending-down" />
            <View style={styles.finDivider} />
            <FinRow label="صافي الربح" value={stats?.netProfit ?? 0} color={(stats?.netProfit ?? 0) >= 0 ? Colors.success : Colors.error} icon="wallet" bold />
          </View>
        </View>

        {/* Monthly Overview */}
        {monthly && (
          <View style={styles.section}>
            <SectionHeader title="الشهر الحالي" />
            <View style={styles.monthGrid}>
              <MonthStat label="مبيعات" value={formatNumber(monthly.totalSales)} icon="cash" color={Colors.success} />
              <MonthStat label="مصروفات" value={formatNumber(monthly.totalExpenses)} icon="wallet" color={Colors.error} />
              <MonthStat label="مواليد" value={western(monthly.birthsCount)} icon="heart-circle" color={Colors.success} />
              <MonthStat label="نفوق" value={western(monthly.deathsCount)} icon="close-circle" color={Colors.error} />
              <MonthStat label="نمو القطيع" value={`${western(monthly.herdGrowth)}%`} icon="trending-up" color={Colors.info} />
              <MonthStat label="معدل النفوق" value={`${western(monthly.mortalityRate?.toFixed(1))}%`} icon="warning" color={Colors.warning} />
            </View>

            {/* Expenses by Category */}
            {monthly.expensesByCategory && monthly.expensesByCategory.length > 0 && (
              <View style={styles.catBreakdown}>
                <Text style={styles.catTitle}>المصروفات حسب الفئة</Text>
                {monthly.expensesByCategory.map((cat, i) => (
                  <View key={i} style={styles.catRow}>
                    <Text style={styles.catLabel}>{cat.category}</Text>
                    <Text style={styles.catValue}>{formatNumber(cat.amount)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Comparison with Previous Year */}
        {comparison && (
          <View style={styles.section}>
            <SectionHeader title="مقارنة بالسنة السابقة" />
            <View style={styles.compCard}>
              <CompRow label="المبيعات" current={stats?.totalSales ?? 0} previous={comparison.totalSales ?? 0} />
              <CompRow label="المصروفات" current={stats?.totalExpenses ?? 0} previous={comparison.totalExpenses ?? 0} />
              <CompRow label="المواليد" current={monthly?.birthsCount ?? 0} previous={comparison.birthsCount ?? 0} />
              <CompRow label="النفوق" current={monthly?.deathsCount ?? 0} previous={comparison.deathsCount ?? 0} inverse />
            </View>
          </View>
        )}

        {/* Feed Consumption */}
        {stats?.feedConsumption && (
          <View style={styles.section}>
            <SectionHeader title="استهلاك الأعلاف" />
            <View style={styles.feedCard}>
              <View style={styles.feedRow}>
                <View style={styles.feedItem}>
                  <Ionicons name="nutrition" size={24} color={Colors.warning} />
                  <Text style={styles.feedValue}>{formatNumber(stats.feedConsumption.quantity)}</Text>
                  <Text style={styles.feedLabel}>الكمية</Text>
                </View>
                <View style={styles.feedDivider} />
                <View style={styles.feedItem}>
                  <Ionicons name="cash" size={24} color={Colors.error} />
                  <Text style={styles.feedValue}>{formatNumber(stats.feedConsumption.cost)}</Text>
                  <Text style={styles.feedLabel}>التكلفة</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </>
  );
}

function FinRow({ label, value, color, icon, bold }: { label: string; value: number; color: string; icon: keyof typeof Ionicons.glyphMap; bold?: boolean }) {
  return (
    <View style={styles.finRow}>
      <View style={styles.finRowLeft}>
        <Ionicons name={icon} size={18} color={color} />
        <Text style={[styles.finLabel, bold && { fontWeight: '700' }]}>{label}</Text>
      </View>
      <Text style={[styles.finValue, { color }, bold && { fontSize: 18 }]}>{formatNumber(value)}</Text>
    </View>
  );
}

function MonthStat({ label, value, icon, color }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View style={styles.monthStatItem}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.monthStatValue}>{value}</Text>
      <Text style={styles.monthStatLabel}>{label}</Text>
    </View>
  );
}

function CompRow({ label, current, previous, inverse }: { label: string; current: number; previous: number; inverse?: boolean }) {
  const diff = current - previous;
  const pct = previous > 0 ? western(((diff / previous) * 100).toFixed(0)) : '—';
  const isPositive = inverse ? diff <= 0 : diff >= 0;
  return (
    <View style={styles.compRow}>
      <Text style={styles.compLabel}>{label}</Text>
      <Text style={styles.compCurrent}>{formatNumber(current)}</Text>
      <View style={styles.compChange}>
        <Ionicons name={isPositive ? 'arrow-up' : 'arrow-down'} size={14} color={isPositive ? Colors.success : Colors.error} />
        <Text style={[styles.compPct, { color: isPositive ? Colors.success : Colors.error }]}>{pct}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  yearBanner: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.xl },
  yearText: { ...Typography.h4, color: '#fff' },
  section: { marginBottom: Spacing.xl },
  kpiRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },

  // Financial
  finCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, ...Shadows.sm },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
  finRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  finLabel: { ...Typography.caption, color: Colors.text },
  finValue: { ...Typography.bodyBold },
  finDivider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.sm },

  // Monthly Grid
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, ...Shadows.sm },
  monthStatItem: { width: '33%', alignItems: 'center', paddingVertical: Spacing.md, gap: 4 },
  monthStatValue: { ...Typography.bodyBold, color: Colors.text },
  monthStatLabel: { ...Typography.small, color: Colors.textSecondary },

  catBreakdown: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginTop: Spacing.md, ...Shadows.sm },
  catTitle: { ...Typography.captionBold, color: Colors.text, marginBottom: Spacing.md },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  catLabel: { ...Typography.caption, color: Colors.textSecondary },
  catValue: { ...Typography.captionBold, color: Colors.text },

  // Comparison
  compCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, ...Shadows.sm },
  compRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  compLabel: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
  compCurrent: { ...Typography.captionBold, color: Colors.text, width: 80, textAlign: 'center' },
  compChange: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 60 },
  compPct: { ...Typography.smallBold },

  // Feed
  feedCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.xl, ...Shadows.sm },
  feedRow: { flexDirection: 'row', justifyContent: 'space-around' },
  feedItem: { alignItems: 'center', gap: Spacing.sm },
  feedValue: { ...Typography.h3, color: Colors.text },
  feedLabel: { ...Typography.small, color: Colors.textSecondary },
  feedDivider: { width: 1, backgroundColor: Colors.borderLight },
});
