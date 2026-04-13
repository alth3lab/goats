import React, { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { statsApi, alertsApi } from '@/lib/api';
import KPICard from '@/components/KPICard';
import { AlertBanner, LoadingScreen, SectionHeader } from '@/components/ui';
import { Colors, Gradients, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { formatCurrency, western } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import type { DashboardStats } from '@/types';

export default function DashboardScreen() {
  const { user, farm } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل البيانات';
      showToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) return <LoadingScreen message="جارٍ تحميل البيانات..." />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Banner */}
      <LinearGradient
        colors={[...Gradients.teal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.welcomeBanner}
      >
        {/* Shine overlay */}
        <View style={styles.shineOverlay} />
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeText}>{getGreeting()} {user?.fullName}</Text>
          <Text style={styles.farmName}>{farm?.nameAr || farm?.name}</Text>
        </View>
        <View style={styles.welcomeIcon}>
          <Ionicons name="leaf" size={32} color="rgba(255,255,255,0.9)" />
        </View>
      </LinearGradient>

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

      {/* Herd Overview - Big Gradient Card — dark variant for contrast */}
      <LinearGradient
        colors={[...Gradients.dark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.herdCard}
      >
        <View style={styles.herdCardHeader}>
          <Text style={styles.herdCardTitle}>إجمالي القطيع</Text>
          <View style={styles.herdCardIcon}>
            <Ionicons name="paw" size={28} color="rgba(255,255,255,0.6)" />
          </View>
        </View>
        <Text style={styles.herdCardValue}>{western(stats?.activeGoats ?? 0)}</Text>
        <View style={styles.herdCardRow}>
          <View style={styles.herdPill}>
            <Ionicons name="male" size={14} color="#fff" />
            <Text style={styles.herdPillText}>{western(stats?.maleGoats ?? 0)} ذكور</Text>
          </View>
          <View style={styles.herdPill}>
            <Ionicons name="female" size={14} color="#fff" />
            <Text style={styles.herdPillText}>{western(stats?.femaleGoats ?? 0)} إناث</Text>
          </View>
          <View style={styles.herdPill}>
            <Ionicons name="heart" size={14} color="#fff" />
            <Text style={styles.herdPillText}>{western(stats?.pregnantGoats ?? 0)} حوامل</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Reminders Row */}
      <View style={styles.section}>
        <SectionHeader title="تنبيهات" />
        <View style={styles.reminderRow}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => { if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/health'); }}
          >
            <LinearGradient
              colors={[...Gradients.blue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.reminderCard}
            >
              <View style={styles.reminderTop}>
                <Ionicons name="medkit" size={22} color="rgba(255,255,255,0.85)" />
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
              </View>
              <Text style={styles.reminderValue}>{western(alerts.filter(a => a.type === 'vaccination' || a.type === 'health').length)}</Text>
              <Text style={styles.reminderLabel}>تطعيمات مستحقة</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={{ flex: 1 }}
            onPress={() => { if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/health'); }}
          >
            <LinearGradient
              colors={[...Gradients.orange]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.reminderCard}
            >
              <View style={styles.reminderTop}>
                <Ionicons name="warning" size={22} color="rgba(255,255,255,0.85)" />
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
              </View>
              <Text style={styles.reminderValue}>{western(alerts.filter(a => a.type === 'withdrawal').length)}</Text>
              <Text style={styles.reminderLabel}>فترات حظر</Text>
            </LinearGradient>
          </Pressable>
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
            gradient={Gradients.green}
            trend={stats?.comparison?.totalSales}
          />
          <KPICard
            title="المصروفات"
            value={formatCurrency(stats?.totalExpenses ?? 0)}
            icon="trending-down"
            gradient={Gradients.red}
            trend={stats?.comparison?.totalExpenses}
          />
        </View>
        <View style={styles.kpiRow}>
          <KPICard
            title="صافي الربح"
            value={formatCurrency(stats?.netProfit ?? 0)}
            icon="wallet"
            gradient={(stats?.netProfit ?? 0) >= 0 ? Gradients.teal : Gradients.red}
          />
          <KPICard
            title="تربية نشطة"
            value={western(stats?.activeBreedings ?? 0)}
            icon="git-merge"
            gradient={Gradients.purple}
          />
        </View>
      </View>

      {/* Monthly Overview */}
      {stats?.monthly && (
        <View style={styles.section}>
          <SectionHeader title="نظرة شهرية" />
          <View style={styles.monthlyCard}>
            <View style={styles.monthlyRow}>
              <MonthlyItem label="مواليد" value={western(stats.monthly.birthsCount)} icon="heart-circle" color={Colors.success} />
              <MonthlyItem label="نفوق" value={western(stats.monthly.deathsCount)} icon="close-circle" color={Colors.error} />
              <MonthlyItem label="نمو القطيع" value={`${western(stats.monthly.herdGrowth)}%`} icon="trending-up" color={Colors.info} />
            </View>
            {stats.monthly.mortalityRate > 0 && (
              <View style={styles.mortalityRow}>
                <Ionicons name="warning" size={16} color={Colors.warning} />
                <Text style={styles.mortalityText}>
                  معدل النفوق: {western(stats.monthly.mortalityRate.toFixed(1))}%
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
          <QuickAction icon="add-circle" label="إضافة حيوان" gradient={Gradients.teal} onPress={() => router.push('/goats/add')} />
          <QuickAction icon="heart" label="التربية" gradient={Gradients.purple} onPress={() => router.push('/(tabs)/breeding' as any)} />
          <QuickAction icon="medkit" label="سجل صحي" gradient={Gradients.blue} onPress={() => router.push('/(tabs)/health')} />
          <QuickAction icon="cash" label="تسجيل بيع" gradient={Gradients.orange} onPress={() => router.push('/(tabs)/sales')} />
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ─── Helper Components ───────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'صباح الخير';
  if (h < 18) return 'مساء الخير';
  return 'مساء الخير';
}

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

function QuickAction({ icon, label, gradient, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; gradient: readonly string[]; onPress?: () => void }) {
  return (
    <Pressable
      style={styles.quickAction}
      onPress={() => {
        if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
    >
      <LinearGradient
        colors={gradient as unknown as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.quickActionIcon}
      >
        <Ionicons name={icon} size={24} color="#fff" />
      </LinearGradient>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

// formatCurrency imported from @/lib/formatters

// ─── Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },

  // Welcome Banner
  welcomeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadows.lg,
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

  // Shine overlay (the "glow" effect)
  shineOverlay: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  shineOverlaySmall: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  // Herd Overview Card
  herdCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  herdCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  herdCardTitle: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.85)',
  },
  herdCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  herdCardValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    marginVertical: Spacing.sm,
  },
  herdCardRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  herdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  herdPillText: {
    ...Typography.small,
    color: '#fff',
    fontWeight: '600',
  },

  // Reminder Cards
  reminderRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  reminderCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    overflow: 'hidden',
    minHeight: 130,
    ...Shadows.md,
  },
  reminderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  reminderValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  reminderLabel: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
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
