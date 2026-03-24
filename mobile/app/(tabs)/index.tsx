import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { statsApi, alertsApi } from '@/lib/api';
import KPICard from '@/components/KPICard';
import { AlertBanner, LoadingScreen, SectionHeader } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import type { DashboardStats } from '@/types';

export default function DashboardScreen() {
  const { user, farm } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Array<{ type: string; message: string; severity: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, alertsData] = await Promise.all([
        statsApi.get(),
        alertsApi.list().catch(() => []),
      ]);
      setStats(statsData as unknown as DashboardStats);
      setAlerts(alertsData as Array<{ type: string; message: string; severity: string }>);
    } catch {
      // Silently fail — user sees empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) return <LoadingScreen message="جارٍ تحميل البيانات..." />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Banner */}
      <View style={styles.welcomeBanner}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeText}>مرحباً {user?.fullName}</Text>
          <Text style={styles.farmName}>{farm?.nameAr || farm?.name}</Text>
        </View>
        <View style={styles.welcomeIcon}>
          <Ionicons name="sunny" size={32} color="#FFD700" />
        </View>
      </View>

      {/* Alerts */}
      {alerts.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="التنبيهات" />
          {alerts.slice(0, 3).map((alert, i) => (
            <AlertBanner
              key={i}
              type={alert.severity as 'info' | 'warning' | 'error'}
              message={alert.message}
            />
          ))}
        </View>
      )}

      {/* Herd KPIs */}
      <View style={styles.section}>
        <SectionHeader title="إحصائيات القطيع" />
        <View style={styles.kpiRow}>
          <KPICard
            title="إجمالي القطيع"
            value={stats?.activeGoats ?? 0}
            icon="paw"
            iconColor={Colors.primary}
          />
          <KPICard
            title="ذكور"
            value={stats?.maleGoats ?? 0}
            icon="male"
            iconColor={Colors.male}
          />
        </View>
        <View style={styles.kpiRow}>
          <KPICard
            title="إناث"
            value={stats?.femaleGoats ?? 0}
            icon="female"
            iconColor={Colors.female}
          />
          <KPICard
            title="حوامل"
            value={stats?.pregnantGoats ?? 0}
            icon="heart"
            iconColor={Colors.female}
          />
        </View>
      </View>

      {/* Financial KPIs */}
      <View style={styles.section}>
        <SectionHeader title="الإحصائيات المالية" />
        <View style={styles.kpiRow}>
          <KPICard
            title="المبيعات"
            value={formatCurrency(stats?.totalSales ?? 0)}
            icon="trending-up"
            iconColor={Colors.success}
            trend={stats?.comparison?.totalSales}
          />
          <KPICard
            title="المصروفات"
            value={formatCurrency(stats?.totalExpenses ?? 0)}
            icon="trending-down"
            iconColor={Colors.error}
            trend={stats?.comparison?.totalExpenses}
          />
        </View>
        <View style={styles.kpiRow}>
          <KPICard
            title="صافي الربح"
            value={formatCurrency(stats?.netProfit ?? 0)}
            icon="wallet"
            iconColor={(stats?.netProfit ?? 0) >= 0 ? Colors.success : Colors.error}
          />
          <KPICard
            title="تربية نشطة"
            value={stats?.activeBreedings ?? 0}
            icon="git-merge"
            iconColor={Colors.info}
          />
        </View>
      </View>

      {/* Monthly Overview */}
      {stats?.monthly && (
        <View style={styles.section}>
          <SectionHeader title="نظرة شهرية" />
          <View style={styles.monthlyCard}>
            <View style={styles.monthlyRow}>
              <MonthlyItem label="مواليد" value={stats.monthly.birthsCount} icon="heart-circle" color={Colors.success} />
              <MonthlyItem label="نفوق" value={stats.monthly.deathsCount} icon="close-circle" color={Colors.error} />
              <MonthlyItem label="نمو القطيع" value={`${stats.monthly.herdGrowth}%`} icon="trending-up" color={Colors.info} />
            </View>
            {stats.monthly.mortalityRate > 0 && (
              <View style={styles.mortalityRow}>
                <Ionicons name="warning" size={16} color={Colors.warning} />
                <Text style={styles.mortalityText}>
                  معدل النفوق: {stats.monthly.mortalityRate.toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <SectionHeader title="إجراءات سريعة" />
        <View style={styles.actionsGrid}>
          <QuickAction icon="add-circle" label="إضافة حيوان" color={Colors.primary} />
          <QuickAction icon="medkit" label="سجل صحي" color={Colors.success} />
          <QuickAction icon="cash" label="تسجيل بيع" color={Colors.info} />
          <QuickAction icon="nutrition" label="تغذية" color={Colors.warning} />
        </View>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ─── Helper Components ───────────────────────────────────
function MonthlyItem({ label, value, icon, color }: { label: string; value: string | number; icon: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View style={styles.monthlyItem}>
      <View style={[styles.monthlyIconWrap, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.monthlyValue}>{value}</Text>
      <Text style={styles.monthlyLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }) {
  return (
    <TouchableOpacity style={styles.quickAction} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '12' }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

// ─── Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  welcomeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeText: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.85)',
  },
  farmName: {
    ...Typography.h3,
    color: '#fff',
    marginTop: 4,
  },
  welcomeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },

  // Monthly Card
  monthlyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    ...Shadows.sm,
  },
  monthlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  monthlyItem: {
    alignItems: 'center',
  },
  monthlyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  monthlyValue: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  monthlyLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  mortalityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    gap: 6,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  mortalityText: {
    ...Typography.caption,
    color: Colors.warning,
  },

  // Quick Actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  quickAction: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionLabel: {
    ...Typography.captionBold,
    color: Colors.text,
  },
});
