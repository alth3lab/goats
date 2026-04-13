import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { breedingApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LoadingScreen, Button, SectionHeader, ConfirmDialog } from '@/components/ui';
import {
  Colors, Spacing, Radius, Typography, Shadows,
  PregnancyStatusLabels, PregnancyStatusColors,
} from '@/lib/theme';
import { formatDate, western } from '@/lib/formatters';
import type { Breeding, BirthRecord } from '@/types';

const BIRTH_STATUS_LABELS: Record<string, string> = {
  ALIVE: 'حي',
  STILLBORN: 'ميت عند الولادة',
  DIED: 'نفق',
};

export default function BreedingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const [breeding, setBreeding] = useState<Breeding | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await breedingApi.get(id!);
      setBreeding(data as unknown as Breeding);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'لم يتم العثور على السجل';
      Alert.alert('خطأ', msg);
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleDelete = async () => {
    try {
      await breedingApi.delete(id!);
      Alert.alert('تم', 'تم حذف السجل بنجاح');
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل حذف السجل';
      Alert.alert('خطأ', msg);
    }
    setDeleteVisible(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await breedingApi.update(id!, { pregnancyStatus: newStatus });
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحديث الحالة';
      Alert.alert('خطأ', msg);
    }
  };

  const getDaysRemaining = (dueDate?: string) => {
    if (!dueDate) return null;
    return Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  if (loading) return <LoadingScreen />;
  if (!breeding) return null;

  const statusColor = PregnancyStatusColors[breeding.pregnancyStatus] || Colors.textSecondary;
  const daysLeft = getDaysRemaining(breeding.dueDate);
  const canRecordBirth = breeding.pregnancyStatus === 'PREGNANT' || breeding.pregnancyStatus === 'MATED';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[Colors.primary]} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {PregnancyStatusLabels[breeding.pregnancyStatus]}
            </Text>
          </View>
        </View>

        <View style={styles.parentsSection}>
          <View style={styles.parentBox}>
            <Ionicons name="female" size={24} color={Colors.female} />
            <Text style={styles.parentLabel}>الأم</Text>
            <Text style={styles.parentTag}>{breeding.mother?.tagId || '—'}</Text>
            {breeding.mother?.name && <Text style={styles.parentName}>{breeding.mother.name}</Text>}
          </View>
          <View style={styles.heartIcon}>
            <Ionicons name="heart" size={20} color={Colors.female} />
          </View>
          <View style={styles.parentBox}>
            <Ionicons name="male" size={24} color={Colors.male} />
            <Text style={styles.parentLabel}>الأب</Text>
            <Text style={styles.parentTag}>{breeding.father?.tagId || '—'}</Text>
            {breeding.father?.name && <Text style={styles.parentName}>{breeding.father.name}</Text>}
          </View>
        </View>

        {daysLeft !== null && breeding.pregnancyStatus !== 'DELIVERED' && breeding.pregnancyStatus !== 'FAILED' && (
          <View style={[styles.daysRemainingBanner, daysLeft < 0 && { backgroundColor: Colors.error + '15' }]}>
            <Ionicons name="time-outline" size={18} color={daysLeft < 0 ? Colors.error : Colors.female} />
            <Text style={[styles.daysRemainingText, daysLeft < 0 && { color: Colors.error }]}>
              {daysLeft < 0
                ? `متأخرة ${western(Math.abs(daysLeft))} يوم عن الموعد المتوقع`
                : `${western(daysLeft)} يوم متبقي على الولادة المتوقعة`
              }
            </Text>
          </View>
        )}
      </View>

      {/* Dates Info */}
      <View style={styles.section}>
        <SectionHeader title="التواريخ" />
        <View style={styles.infoCard}>
          <InfoRow icon="calendar" label="تاريخ التلقيح" value={formatDate(breeding.matingDate)} />
          {breeding.dueDate && <InfoRow icon="time" label="الموعد المتوقع" value={formatDate(breeding.dueDate)} color={Colors.female} />}
          {breeding.birthDate && <InfoRow icon="heart-circle" label="تاريخ الولادة" value={formatDate(breeding.birthDate)} color={Colors.success} />}
          {breeding.numberOfKids !== null && breeding.numberOfKids !== undefined && (
            <InfoRow icon="people" label="عدد المواليد" value={western(breeding.numberOfKids)} />
          )}
        </View>
      </View>

      {/* Notes */}
      {breeding.notes && (
        <View style={styles.section}>
          <SectionHeader title="ملاحظات" />
          <View style={styles.infoCard}>
            <Text style={styles.notesText}>{breeding.notes}</Text>
          </View>
        </View>
      )}

      {/* Quick Status Update */}
      {breeding.pregnancyStatus !== 'DELIVERED' && (
        <View style={styles.section}>
          <SectionHeader title="تحديث الحالة" />
          <View style={styles.statusActions}>
            {breeding.pregnancyStatus === 'MATED' && (
              <TouchableOpacity
                style={[styles.statusBtn, { backgroundColor: Colors.female + '15', borderColor: Colors.female }]}
                onPress={() => handleStatusChange('PREGNANT')}
              >
                <Ionicons name="checkmark-circle" size={20} color={Colors.female} />
                <Text style={[styles.statusBtnText, { color: Colors.female }]}>تأكيد الحمل</Text>
              </TouchableOpacity>
            )}
            {breeding.pregnancyStatus !== 'FAILED' && (
              <TouchableOpacity
                style={[styles.statusBtn, { backgroundColor: Colors.error + '15', borderColor: Colors.error }]}
                onPress={() => {
                  Alert.alert('تأكيد', 'هل أنت متأكد من تسجيل فشل التلقيح؟', [
                    { text: 'إلغاء', style: 'cancel' },
                    { text: 'نعم', onPress: () => handleStatusChange('FAILED'), style: 'destructive' },
                  ]);
                }}
              >
                <Ionicons name="close-circle" size={20} color={Colors.error} />
                <Text style={[styles.statusBtnText, { color: Colors.error }]}>تسجيل فشل</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Births */}
      <View style={styles.section}>
        <SectionHeader
          title="المواليد"
          action={canRecordBirth ? {
            title: 'تسجيل ولادة',
            onPress: () => router.push({ pathname: '/(tabs)/breeding/births', params: { id: breeding.id } }),
          } : undefined}
        />
        {(!breeding.births || breeding.births.length === 0) ? (
          <View style={styles.emptySection}>
            <Ionicons name="paw-outline" size={32} color={Colors.textLight} />
            <Text style={styles.emptySectionText}>لا يوجد مواليد مسجلة</Text>
            {canRecordBirth && (
              <Button
                title="تسجيل ولادة"
                variant="outline"
                size="sm"
                icon="add-circle-outline"
                onPress={() => router.push({ pathname: '/(tabs)/breeding/births', params: { id: breeding.id } })}
                style={{ marginTop: Spacing.md }}
              />
            )}
          </View>
        ) : (
          breeding.births.map((birth: BirthRecord) => (
            <View key={birth.id} style={styles.birthCard}>
              <View style={styles.birthHeader}>
                <View style={[styles.genderIcon, { backgroundColor: (birth.gender === 'MALE' ? Colors.male : Colors.female) + '15' }]}>
                  <Ionicons name={birth.gender === 'MALE' ? 'male' : 'female'} size={18} color={birth.gender === 'MALE' ? Colors.male : Colors.female} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.birthTag}>{birth.kidTagId || '—'}</Text>
                  <Text style={styles.birthStatus}>
                    {BIRTH_STATUS_LABELS[birth.status] || birth.status}
                    {birth.weight ? ` — ${western(birth.weight)} كغ` : ''}
                  </Text>
                </View>
                <View style={[
                  styles.birthStatusDot,
                  { backgroundColor: birth.status === 'ALIVE' ? Colors.success : Colors.error },
                ]} />
              </View>
              {birth.notes && <Text style={styles.birthNotes}>{birth.notes}</Text>}
            </View>
          ))
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="تعديل"
          icon="create-outline"
          variant="outline"
          onPress={() => router.push({ pathname: '/(tabs)/breeding/edit', params: { id: breeding.id } })}
          style={{ flex: 1 }}
        />
        <Button
          title="حذف"
          icon="trash-outline"
          variant="danger"
          onPress={() => setDeleteVisible(true)}
          style={{ flex: 1 }}
        />
      </View>

      <ConfirmDialog
        visible={deleteVisible}
        title="حذف سجل التلقيح"
        message="هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع."
        variant="danger"
        confirmLabel="حذف"
        onConfirm={handleDelete}
        onCancel={() => setDeleteVisible(false)}
      />

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, color }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={18} color={color || Colors.textSecondary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  headerTop: { alignItems: 'flex-end', marginBottom: Spacing.lg },
  statusBadge: { paddingHorizontal: Spacing.lg, paddingVertical: 6, borderRadius: Radius.full },
  statusBadgeText: { ...Typography.captionBold },
  parentsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  parentBox: { alignItems: 'center', flex: 1, gap: 4 },
  parentLabel: { ...Typography.small, color: Colors.textSecondary },
  parentTag: { ...Typography.h4, color: Colors.text },
  parentName: { ...Typography.small, color: Colors.textLight },
  heartIcon: { paddingHorizontal: Spacing.md },
  daysRemainingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.female + '10',
  },
  daysRemainingText: { ...Typography.captionBold, color: Colors.female, flex: 1 },
  section: { marginBottom: Spacing.xl },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoLabel: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
  infoValue: { ...Typography.captionBold, color: Colors.text },
  notesText: { ...Typography.body, color: Colors.text, textAlign: 'right', lineHeight: 24 },
  statusActions: { flexDirection: 'row', gap: Spacing.md },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  statusBtnText: { ...Typography.captionBold },
  emptySection: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.sm,
  },
  emptySectionText: { ...Typography.caption, color: Colors.textLight, marginTop: Spacing.sm },
  birthCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  birthHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  genderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  birthTag: { ...Typography.captionBold, color: Colors.text },
  birthStatus: { ...Typography.small, color: Colors.textSecondary },
  birthStatusDot: { width: 10, height: 10, borderRadius: 5 },
  birthNotes: { ...Typography.small, color: Colors.textLight, marginTop: Spacing.sm },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
});
