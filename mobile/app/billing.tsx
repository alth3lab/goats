import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Linking,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { subscriptionApi } from '@/lib/api';
import { LoadingScreen } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { western, formatDate } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import type { SubscriptionInfo, PlanType, SubscriptionStatus } from '@/types';

const PLAN_DETAILS: Record<string, { label: string; price: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  FREE: { label: 'مجاني', price: '$0', color: Colors.textSecondary, icon: 'gift-outline' },
  BASIC: { label: 'أساسي', price: '$49/شهر', color: '#3b82f6', icon: 'star-outline' },
  PRO: { label: 'احترافي', price: '$149/شهر', color: '#8b5cf6', icon: 'diamond-outline' },
  ENTERPRISE: { label: 'مؤسسي', price: 'تسعير خاص', color: '#f59e0b', icon: 'business-outline' },
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'نشط',
  PENDING: 'قيد الانتظار',
  CANCELLED: 'ملغي',
  EXPIRED: 'منتهي',
  PAST_DUE: 'متأخر',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: Colors.success,
  PENDING: '#f59e0b',
  CANCELLED: Colors.textSecondary,
  EXPIRED: Colors.error,
  PAST_DUE: Colors.error,
};

const WEBSITE_PLANS_URL = 'https://goat.suhail.cc/dashboard/billing';

export default function BillingScreen() {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const data = await subscriptionApi.get();
      setInfo(data as unknown as SubscriptionInfo);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل بيانات الاشتراك';
      showToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (loading) return <LoadingScreen />;
  if (!info) return <LoadingScreen message="لا توجد بيانات" />;

  const plan = info.tenant?.plan || 'FREE';
  const planInfo = PLAN_DETAILS[plan] || PLAN_DETAILS.FREE;

  const usageItems = [
    { label: 'المزارع', used: info.usage?.farms || 0, max: info.tenant?.maxFarms || 0, icon: 'home' as const },
    { label: 'الرؤوس', used: info.usage?.goats || 0, max: info.tenant?.maxGoats || 0, icon: 'paw' as const },
    { label: 'المستخدمين', used: info.usage?.users || 0, max: info.tenant?.maxUsers || 0, icon: 'people' as const },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title: 'الاشتراك والفواتير',
        headerShown: true,
        
        headerTintColor: Colors.primary,
        headerTitleStyle: { ...Typography.h4, color: Colors.text },
        headerTitleAlign: 'center',
        headerBackTitle: '',
      }} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
      >
        {/* Current Plan Card */}
        <View style={[styles.planCard, { borderColor: planInfo.color }]}>
          <View style={[styles.planIcon, { backgroundColor: planInfo.color + '20' }]}>
            <Ionicons name={planInfo.icon} size={28} color={planInfo.color} />
          </View>
          <Text style={styles.planLabel}>الخطة الحالية</Text>
          <Text style={[styles.planName, { color: planInfo.color }]}>{planInfo.label}</Text>
          <Text style={styles.planPrice}>{planInfo.price}</Text>
        </View>

        {/* Usage */}
        <Text style={styles.sectionTitle}>الاستخدام</Text>
        <View style={styles.usageCard}>
          {usageItems.map((item, i) => {
            const pct = item.max > 0 ? Math.min((item.used / item.max) * 100, 100) : 0;
            const isNearLimit = pct >= 80;
            return (
              <View key={i} style={styles.usageRow}>
                <View style={styles.usageHeader}>
                  <View style={styles.usageLabelRow}>
                    <Ionicons name={item.icon} size={16} color={Colors.textSecondary} />
                    <Text style={styles.usageLabel}>{item.label}</Text>
                  </View>
                  <Text style={[styles.usageCount, isNearLimit && { color: Colors.error }]}>
                    {western(String(item.used))} / {item.max === 0 ? '∞' : western(String(item.max))}
                  </Text>
                </View>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${pct}%`, backgroundColor: isNearLimit ? Colors.error : Colors.primary },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Subscription History */}
        {info.subscriptions && info.subscriptions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>سجل الاشتراكات</Text>
            {info.subscriptions.map((sub, i) => {
              const sColor = STATUS_COLORS[sub.status] || Colors.textSecondary;
              return (
                <View key={sub.id || i} style={styles.historyCard}>
                  <View style={styles.historyRow}>
                    <View style={[styles.statusBadge, { backgroundColor: sColor + '15' }]}>
                      <Text style={[styles.statusText, { color: sColor }]}>
                        {STATUS_LABELS[sub.status] || sub.status}
                      </Text>
                    </View>
                    <Text style={styles.historyPlan}>{PLAN_DETAILS[sub.plan]?.label || sub.plan}</Text>
                  </View>
                  <View style={styles.historyMeta}>
                    <Text style={styles.historyDate}>
                      من: {formatDate(sub.startDate)}
                      {sub.endDate ? ` — إلى: ${formatDate(sub.endDate)}` : ''}
                    </Text>
                    {sub.amount !== undefined && sub.amount !== null && (
                      <Text style={styles.historyAmount}>${western(String(sub.amount))}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Plans comparison */}
        <Text style={styles.sectionTitle}>الخطط المتاحة</Text>
        {Object.entries(PLAN_DETAILS).map(([key, p]) => {
          const isCurrent = key === plan;
          return (
            <View key={key} style={[styles.planOption, isCurrent && { borderColor: p.color, borderWidth: 2 }]}>
              <View style={styles.planOptionHeader}>
                <Ionicons name={p.icon} size={20} color={p.color} />
                <Text style={[styles.planOptionName, { color: p.color }]}>{p.label}</Text>
                <Text style={styles.planOptionPrice}>{p.price}</Text>
              </View>
              {isCurrent && (
                <View style={[styles.currentPlanBadge, { backgroundColor: p.color + '15' }]}>
                  <Ionicons name="checkmark-circle" size={14} color={p.color} />
                  <Text style={[styles.currentPlanText, { color: p.color }]}>خطتك الحالية</Text>
                </View>
              )}
              {!isCurrent && (
                <TouchableOpacity
                  style={[styles.upgradeBtn, { backgroundColor: p.color }]}
                  onPress={() => Linking.openURL(WEBSITE_PLANS_URL)}
                >
                  <Ionicons name="open-outline" size={14} color="#fff" style={{ marginEnd: 4 }} />
                  <Text style={styles.upgradeBtnText}>الترقية عبر الموقع</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  planCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg,
    alignItems: 'center', borderWidth: 2, ...Shadows.sm, marginBottom: Spacing.lg,
  },
  planIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  planLabel: { ...Typography.caption, color: Colors.textSecondary },
  planName: { ...Typography.h2, fontWeight: '800', marginTop: 4 },
  planPrice: { ...Typography.body, color: Colors.textSecondary, marginTop: 4 },
  sectionTitle: { ...Typography.h4, color: Colors.text, textAlign: 'right', marginBottom: Spacing.sm, marginTop: Spacing.md },
  usageCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, ...Shadows.sm, gap: Spacing.md },
  usageRow: { gap: 6 },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  usageLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  usageLabel: { ...Typography.caption, color: Colors.textSecondary },
  usageCount: { ...Typography.caption, fontWeight: '600', color: Colors.text },
  progressBg: { height: 6, borderRadius: 3, backgroundColor: Colors.border },
  progressFill: { height: 6, borderRadius: 3 },
  historyCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.sm, ...Shadows.sm,
  },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyPlan: { ...Typography.body, fontWeight: '600', color: Colors.text },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  historyMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  historyDate: { ...Typography.caption, color: Colors.textSecondary },
  historyAmount: { ...Typography.caption, fontWeight: '700', color: Colors.text },
  upgradeBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 36,
  },
  upgradeBtnText: {
    ...Typography.captionBold,
    color: '#fff',
    fontWeight: '700' as const,
  },
  planOption: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  planOptionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  planOptionName: { ...Typography.body, fontWeight: '700', flex: 1 },
  planOptionPrice: { ...Typography.caption, color: Colors.textSecondary },
  currentPlanBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, marginTop: Spacing.sm, alignSelf: 'flex-start' },
  currentPlanText: { fontSize: 12, fontWeight: '600' },
});
