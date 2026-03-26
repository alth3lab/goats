import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { goatsApi, healthApi } from '@/lib/api';
import { LoadingScreen, Button, SectionHeader, ConfirmDialog } from '@/components/ui';
import {
  Colors, Spacing, Radius, Typography, Shadows,
  StatusColors, StatusLabels, GenderLabels, HealthTypeLabels,
} from '@/lib/theme';
import { formatDate, western } from '@/lib/formatters';
import type { Goat, HealthRecord } from '@/types';

export default function GoatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [goat, setGoat] = useState<Goat | null>(null);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [goatData, healthData] = await Promise.all([
        goatsApi.get(id!),
        healthApi.list(id).catch(() => []),
      ]);
      setGoat(goatData as unknown as Goat);
      setHealthRecords(healthData as unknown as HealthRecord[]);
    } catch {
      Alert.alert('خطأ', 'لم يتم العثور على الحيوان');
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    try {
      await goatsApi.delete(id!);
      router.back();
    } catch {
      Alert.alert('خطأ', 'فشل حذف الحيوان');
    }
    setDeleteVisible(false);
  };

  if (loading) return <LoadingScreen />;
  if (!goat) return null;

  const statusColor = StatusColors[goat.status] || Colors.textSecondary;
  const genderColor = goat.gender === 'MALE' ? Colors.male : Colors.female;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[Colors.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.tagWrap}>
            <View style={[styles.tagDot, { backgroundColor: goat.tagColor || Colors.primary }]} />
            <Text style={styles.tagId}>{goat.tagId}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {StatusLabels[goat.status]}
            </Text>
          </View>
        </View>

        {goat.name && <Text style={styles.goatName}>{goat.name}</Text>}

        <View style={styles.genderAge}>
          <View style={[styles.genderBadge, { backgroundColor: genderColor + '15' }]}>
            <Ionicons name={goat.gender === 'MALE' ? 'male' : 'female'} size={16} color={genderColor} />
            <Text style={[styles.genderText, { color: genderColor }]}>{GenderLabels[goat.gender]}</Text>
          </View>
          {goat.age && (
            <Text style={styles.ageText}>العمر: {goat.age.formatted}</Text>
          )}
        </View>

        {goat.pregnancyStatus && (
          <View style={styles.pregnancyBanner}>
            <Ionicons name="heart" size={16} color={Colors.female} />
            <Text style={styles.pregnancyText}>
              حامل {goat.dueDate ? `— الموعد المتوقع: ${formatDate(goat.dueDate)}` : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Info Grid */}
      <View style={styles.section}>
        <SectionHeader title="المعلومات الأساسية" />
        <View style={styles.infoCard}>
          <InfoRow icon="pricetag" label="السلالة" value={goat.breed?.nameAr || '—'} />
          <InfoRow icon="layers" label="النوع" value={goat.breed?.type?.nameAr || '—'} />
          <InfoRow icon="home" label="الحظيرة" value={goat.pen?.nameAr || '—'} />
          <InfoRow icon="person" label="المالك" value={goat.owner?.name || '—'} />
          <InfoRow icon="fitness" label="الوزن" value={goat.weight ? `${western(goat.weight)} كغ` : '—'} />
          <InfoRow icon="calendar" label="تاريخ الميلاد" value={goat.birthDate ? formatDate(goat.birthDate) : '—'} />
        </View>
      </View>

      {/* Parents */}
      <View style={styles.section}>
        <SectionHeader title="النسب" />
        <View style={styles.parentsRow}>
          <View style={styles.parentCard}>
            <Ionicons name="male" size={20} color={Colors.male} />
            <Text style={styles.parentLabel}>الأب</Text>
            <Text style={styles.parentValue}>{goat.fatherTagId || '—'}</Text>
          </View>
          <View style={styles.parentCard}>
            <Ionicons name="female" size={20} color={Colors.female} />
            <Text style={styles.parentLabel}>الأم</Text>
            <Text style={styles.parentValue}>{goat.motherTagId || '—'}</Text>
          </View>
        </View>
      </View>

      {/* Health Records */}
      <View style={styles.section}>
        <SectionHeader
          title="السجل الصحي"
          action={{ title: `عرض الكل (${healthRecords.length})`, onPress: () => {} }}
        />
        {healthRecords.length === 0 ? (
          <View style={styles.emptySection}>
            <Ionicons name="medkit-outline" size={32} color={Colors.textLight} />
            <Text style={styles.emptySectionText}>لا يوجد سجلات صحية</Text>
          </View>
        ) : (
          healthRecords.slice(0, 5).map(record => (
            <View key={record.id} style={styles.healthItem}>
              <View style={[styles.healthIcon, { backgroundColor: Colors.success + '15' }]}>
                <Ionicons name="medkit" size={18} color={Colors.success} />
              </View>
              <View style={styles.healthContent}>
                <Text style={styles.healthType}>{HealthTypeLabels[record.type] || record.type}</Text>
                <Text style={styles.healthDate}>
                  {formatDate(record.date)}
                  {record.veterinarian ? ` — ${record.veterinarian}` : ''}
                </Text>
                {record.description && (
                  <Text style={styles.healthDesc} numberOfLines={2}>{record.description}</Text>
                )}
              </View>
              {record.cost ? (
                <Text style={styles.healthCost}>{record.cost}</Text>
              ) : null}
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
          onPress={() => {}}
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
        title="حذف الحيوان"
        message={`هل أنت متأكد من حذف الحيوان ${goat.tagId}؟ لا يمكن التراجع عن هذا الإجراء.`}
        variant="danger"
        confirmLabel="حذف"
        onConfirm={handleDelete}
        onCancel={() => setDeleteVisible(false)}
      />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowLeft}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={Colors.textSecondary} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },

  // Header Card
  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tagDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  tagId: {
    ...Typography.h3,
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusText: {
    ...Typography.captionBold,
  },
  goatName: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  genderAge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  genderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  genderText: {
    ...Typography.captionBold,
  },
  ageText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  pregnancyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.female + '10',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  pregnancyText: {
    ...Typography.caption,
    color: Colors.female,
    flex: 1,
  },

  // Info Card
  section: {
    marginBottom: Spacing.xl,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  infoValue: {
    ...Typography.captionBold,
    color: Colors.text,
  },

  // Parents
  parentsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  parentCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  parentLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  parentValue: {
    ...Typography.bodyBold,
    color: Colors.text,
    marginTop: 2,
  },

  // Health
  emptySection: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadows.sm,
  },
  emptySectionText: {
    ...Typography.caption,
    color: Colors.textLight,
    marginTop: Spacing.sm,
  },
  healthItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  healthIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthContent: {
    flex: 1,
  },
  healthType: {
    ...Typography.captionBold,
    color: Colors.text,
  },
  healthDate: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  healthDesc: {
    ...Typography.small,
    color: Colors.textLight,
    marginTop: 4,
  },
  healthCost: {
    ...Typography.captionBold,
    color: Colors.warning,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
});
