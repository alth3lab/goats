import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { protocolsApi } from '@/lib/api';
import { LoadingScreen, EmptyState, AlertBanner } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { formatDate, western } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';

interface Protocol {
  id: string;
  name: string;
  nameAr?: string;
  vaccineName: string;
  ageMonths?: number;
  gender?: string;
  repeatIntervalDays?: number;
  isActive: boolean;
  description?: string;
}

interface DueVaccination {
  id: string;
  goatId: string;
  protocolId: string;
  protocolName: string;
  vaccineName: string;
  dueDate: string;
  goat: { tagId: string; name?: string };
  isOverdue: boolean;
}

export default function VaccinationProtocolsScreen() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [dueVaccinations, setDueVaccinations] = useState<DueVaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'due' | 'protocols'>('due');
  const { showToast } = useToast();
  const { can } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      const [protoData, dueData] = await Promise.all([
        protocolsApi.list().catch(() => []),
        protocolsApi.getDue().catch(() => []),
      ]);
      setProtocols((protoData as Protocol[]) || []);
      setDueVaccinations((dueData as DueVaccination[]) || []);
    } catch {
      showToast('error', 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const overdueCount = dueVaccinations.filter(v => v.isOverdue).length;
  const upcomingCount = dueVaccinations.filter(v => !v.isOverdue).length;

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;

  return (
    <>
      <Stack.Screen options={{
        title: 'بروتوكولات التطعيم',
        headerShown: true,
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { ...Typography.h4, color: '#fff' },
        headerTitleAlign: 'center',
      }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: Colors.error }]}>
            <Text style={[styles.statValue, { color: Colors.error }]}>{western(overdueCount)}</Text>
            <Text style={styles.statLabel}>متأخر</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.warning }]}>
            <Text style={[styles.statValue, { color: Colors.warning }]}>{western(upcomingCount)}</Text>
            <Text style={styles.statLabel}>قادم</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.primary }]}>
            <Text style={[styles.statValue, { color: Colors.primary }]}>{western(protocols.length)}</Text>
            <Text style={styles.statLabel}>بروتوكول</Text>
          </View>
        </View>

        {overdueCount > 0 && (
          <AlertBanner
            type="error"
            message={`يوجد ${western(overdueCount)} تطعيم متأخر يجب إجراؤه`}
          />
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'due' && styles.tabBtnActive]}
            onPress={() => setTab('due')}
          >
            <Ionicons name="time" size={16} color={tab === 'due' ? '#fff' : Colors.textSecondary} />
            <Text style={[styles.tabText, tab === 'due' && styles.tabTextActive]}>التطعيمات المطلوبة</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'protocols' && styles.tabBtnActive]}
            onPress={() => setTab('protocols')}
          >
            <Ionicons name="clipboard" size={16} color={tab === 'protocols' ? '#fff' : Colors.textSecondary} />
            <Text style={[styles.tabText, tab === 'protocols' && styles.tabTextActive]}>البروتوكولات</Text>
          </TouchableOpacity>
        </View>

        {/* Due vaccinations tab */}
        {tab === 'due' && (
          <View>
            {dueVaccinations.length === 0 ? (
              <EmptyState icon="checkmark-circle" title="لا توجد تطعيمات مطلوبة" message="جميع الحيوانات محدثة التطعيمات" />
            ) : (
              dueVaccinations.map((vac) => (
                <View key={vac.id} style={[styles.dueCard, vac.isOverdue && styles.dueCardOverdue]}>
                  <View style={styles.dueHeader}>
                    <View style={styles.dueLeft}>
                      <View style={[styles.dueIcon, { backgroundColor: vac.isOverdue ? Colors.error + '15' : Colors.warning + '15' }]}>
                        <Ionicons name="shield" size={20} color={vac.isOverdue ? Colors.error : Colors.warning} />
                      </View>
                      <View>
                        <Text style={styles.dueName}>{vac.vaccineName}</Text>
                        <Text style={styles.dueProtocol}>{vac.protocolName}</Text>
                      </View>
                    </View>
                    {vac.isOverdue && (
                      <View style={styles.overdueBadge}>
                        <Text style={styles.overdueText}>متأخر</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.dueInfo}>
                    <View style={styles.dueInfoItem}>
                      <Ionicons name="paw" size={14} color={Colors.textLight} />
                      <Text style={styles.dueInfoText}>{vac.goat.tagId}{vac.goat.name ? ` - ${vac.goat.name}` : ''}</Text>
                    </View>
                    <View style={styles.dueInfoItem}>
                      <Ionicons name="calendar" size={14} color={Colors.textLight} />
                      <Text style={[styles.dueInfoText, vac.isOverdue && { color: Colors.error }]}>
                        {formatDate(vac.dueDate)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Protocols tab */}
        {tab === 'protocols' && (
          <View>
            {protocols.length === 0 ? (
              <EmptyState icon="clipboard" title="لا توجد بروتوكولات" message="يمكنك إضافة بروتوكولات التطعيم من لوحة التحكم على الويب" />
            ) : (
              protocols.map((proto) => (
                <View key={proto.id} style={styles.protoCard}>
                  <View style={styles.protoHeader}>
                    <View style={[styles.protoIcon, { backgroundColor: Colors.info + '15' }]}>
                      <Ionicons name="clipboard" size={20} color={Colors.info} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.protoName}>{proto.nameAr || proto.name}</Text>
                      <Text style={styles.protoVaccine}>{proto.vaccineName}</Text>
                    </View>
                    <View style={[styles.activeBadge, !proto.isActive && styles.inactiveBadge]}>
                      <Text style={[styles.activeBadgeText, !proto.isActive && styles.inactiveBadgeText]}>
                        {proto.isActive ? 'نشط' : 'معطل'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.protoDetails}>
                    {proto.ageMonths != null && (
                      <View style={styles.protoDetail}>
                        <Text style={styles.protoDetailLabel}>العمر:</Text>
                        <Text style={styles.protoDetailValue}>{western(proto.ageMonths)} شهر</Text>
                      </View>
                    )}
                    {proto.gender && proto.gender !== 'ALL' && (
                      <View style={styles.protoDetail}>
                        <Text style={styles.protoDetailLabel}>الجنس:</Text>
                        <Text style={styles.protoDetailValue}>{proto.gender === 'MALE' ? 'ذكور' : 'إناث'}</Text>
                      </View>
                    )}
                    {proto.repeatIntervalDays != null && (
                      <View style={styles.protoDetail}>
                        <Text style={styles.protoDetailLabel}>التكرار:</Text>
                        <Text style={styles.protoDetailValue}>كل {western(proto.repeatIntervalDays)} يوم</Text>
                      </View>
                    )}
                  </View>
                  {proto.description && (
                    <Text style={styles.protoDesc}>{proto.description}</Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center', borderLeftWidth: 3, ...Shadows.sm,
  },
  statValue: { ...Typography.h3 },
  statLabel: { ...Typography.small, color: Colors.textSecondary, marginTop: 2 },
  tabs: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: Colors.surface, borderRadius: Radius.full,
    paddingVertical: Spacing.md, ...Shadows.sm,
  },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabText: { ...Typography.captionBold, color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  dueCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm,
  },
  dueCardOverdue: { borderLeftWidth: 3, borderLeftColor: Colors.error },
  dueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  dueLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dueIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  dueName: { ...Typography.bodyBold, color: Colors.text },
  dueProtocol: { ...Typography.small, color: Colors.textLight },
  overdueBadge: { backgroundColor: Colors.error + '15', borderRadius: Radius.full, paddingVertical: 2, paddingHorizontal: 8 },
  overdueText: { ...Typography.smallBold, color: Colors.error },
  dueInfo: { flexDirection: 'row', gap: Spacing.xl },
  dueInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueInfoText: { ...Typography.caption, color: Colors.textSecondary },
  protoCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm,
  },
  protoHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  protoIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  protoName: { ...Typography.bodyBold, color: Colors.text },
  protoVaccine: { ...Typography.small, color: Colors.textLight },
  activeBadge: { backgroundColor: Colors.success + '15', borderRadius: Radius.full, paddingVertical: 2, paddingHorizontal: 8 },
  activeBadgeText: { ...Typography.smallBold, color: Colors.success },
  inactiveBadge: { backgroundColor: Colors.textLight + '15' },
  inactiveBadgeText: { color: Colors.textLight },
  protoDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg, marginBottom: Spacing.sm },
  protoDetail: { flexDirection: 'row', gap: 4 },
  protoDetailLabel: { ...Typography.caption, color: Colors.textLight },
  protoDetailValue: { ...Typography.captionBold, color: Colors.text },
  protoDesc: { ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.sm },
});
