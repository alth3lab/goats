import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { healthApi, goatsApi, resolveGoatByTag } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LoadingScreen, EmptyState, Button, Input, SectionHeader } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows, HealthTypeLabels } from '@/lib/theme';
import { formatDate, western } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import { SearchBar } from '@/components/SearchBar';
import { validateNumber, validateDate, validateRequired } from '@/lib/validation';
import type { HealthRecord } from '@/types';

const HEALTH_TYPES = ['VACCINATION', 'DEWORMING', 'TREATMENT', 'CHECKUP', 'SURGERY'] as const;
const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  VACCINATION: 'shield-checkmark',
  DEWORMING: 'bug',
  TREATMENT: 'bandage',
  CHECKUP: 'eye',
  SURGERY: 'cut',
};
const TYPE_COLORS: Record<string, string> = {
  VACCINATION: Colors.info,
  DEWORMING: Colors.warning,
  TREATMENT: Colors.error,
  CHECKUP: Colors.success,
  SURGERY: Colors.secondary,
};

export default function HealthScreen() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [search, setSearch] = useState('');
  const { showToast } = useToast();
  const { can } = useAuth();

  // Add form state
  const [formGoatTag, setFormGoatTag] = useState('');
  const [formType, setFormType] = useState<string>('VACCINATION');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDescription, setFormDescription] = useState('');
  const [formVet, setFormVet] = useState('');
  const [formCost, setFormCost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      const data = await healthApi.list();
      setRecords(data as unknown as HealthRecord[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل السجلات الصحية';
      showToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleAdd = async () => {
    if (!validateRequired(formGoatTag, 'رقم الحيوان')) return;
    if (!validateDate(formDate, 'التاريخ', { required: true })) return;
    if (formCost) {
      const c = validateNumber(formCost, 'التكلفة', { min: 0 });
      if (c === null) return;
    }
    setSubmitting(true);
    try {
      // Resolve tag ID to goat UUID
      const goatId = await resolveGoatByTag(formGoatTag);
      if (!goatId) {
        Alert.alert('خطأ', 'لم يتم العثور على حيوان بهذا الرقم');
        setSubmitting(false);
        return;
      }

      const body: Record<string, unknown> = {
        goatId,
        type: formType,
        date: formDate,
        description: formDescription.trim() || formType,
      };
      if (formVet.trim()) body.veterinarian = formVet.trim();
      if (formCost) body.cost = parseFloat(formCost);

      await healthApi.create(body);
      setAddVisible(false);
      resetForm();
      fetchRecords();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل إضافة السجل';
      Alert.alert('خطأ', message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormGoatTag('');
    setFormType('VACCINATION');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDescription('');
    setFormVet('');
    setFormCost('');
  };

  const renderRecord = ({ item }: { item: HealthRecord }) => {
    const typeColor = TYPE_COLORS[item.type] || Colors.textSecondary;
    const typeIcon = TYPE_ICONS[item.type] || 'medkit';

    return (
      <View style={styles.recordCard}>
        <View style={[styles.recordIcon, { backgroundColor: typeColor + '15' }]}>
          <Ionicons name={typeIcon} size={20} color={typeColor} />
        </View>
        <View style={styles.recordContent}>
          <View style={styles.recordTop}>
            <Text style={styles.recordType}>{HealthTypeLabels[item.type]}</Text>
            <Text style={styles.recordTag}>{item.goat?.tagId || '—'}</Text>
          </View>
          <Text style={styles.recordDate}>
            {formatDate(item.date)}
            {item.veterinarian ? ` — د. ${item.veterinarian}` : ''}
          </Text>
          {item.description && (
            <Text style={styles.recordDesc} numberOfLines={2}>{item.description}</Text>
          )}
        </View>
        {item.cost ? (
          <View style={styles.costBadge}>
            <Text style={styles.costText}>{item.cost}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        {HEALTH_TYPES.map(type => {
          const count = records.filter(r => r.type === type).length;
          return (
            <View key={type} style={styles.summaryItem}>
              <Ionicons name={TYPE_ICONS[type]} size={18} color={TYPE_COLORS[type]} />
              <Text style={styles.summaryCount}>{western(count)}</Text>
              <Text style={styles.summaryLabel}>{HealthTypeLabels[type]}</Text>
            </View>
          );
        })}
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="بحث بالرقم أو الوصف..." />

      {/* Records List */}
      <FlatList
        data={search.trim() ? records.filter(r => r.goat?.tagId?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase()) || r.veterinarian?.toLowerCase().includes(search.toLowerCase())) : records}
        renderItem={renderRecord}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRecords(); }} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="medkit"
            title="لا يوجد سجلات صحية"
            message="أضف أول سجل صحي لمتابعة صحة القطيع"
            action={{ title: 'إضافة سجل', onPress: () => setAddVisible(true) }}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      {can('__owner_admin__') && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setAddVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add Modal */}
      <Modal visible={addVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setAddVisible(false)}>
            <Text style={styles.modalCancel}>إلغاء</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>إضافة سجل صحي</Text>
          <View style={{ width: 50 }} />
        </View>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Input
            label="رقم الحيوان *"
            placeholder="أدخل Tag ID"
            icon="paw-outline"
            value={formGoatTag}
            onChangeText={setFormGoatTag}
          />

          <Text style={styles.fieldLabel}>نوع السجل</Text>
          <View style={styles.typeRow}>
            {HEALTH_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, formType === type && { backgroundColor: TYPE_COLORS[type], borderColor: TYPE_COLORS[type] }]}
                onPress={() => setFormType(type)}
              >
                <Ionicons name={TYPE_ICONS[type]} size={16} color={formType === type ? '#fff' : TYPE_COLORS[type]} />
                <Text style={[styles.typeChipText, formType === type && { color: '#fff' }]}>
                  {HealthTypeLabels[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="التاريخ"
            placeholder="YYYY-MM-DD"
            icon="calendar-outline"
            value={formDate}
            onChangeText={setFormDate}
          />
          <Input
            label="الوصف"
            placeholder="تفاصيل السجل"
            icon="document-text-outline"
            value={formDescription}
            onChangeText={setFormDescription}
            multiline
          />
          <Input
            label="الطبيب البيطري"
            placeholder="اسم الطبيب"
            icon="person-outline"
            value={formVet}
            onChangeText={setFormVet}
          />
          <Input
            label="التكلفة"
            placeholder="0"
            icon="cash-outline"
            value={formCost}
            onChangeText={setFormCost}
            keyboardType="decimal-pad"
          />

          <Button
            title="حفظ السجل"
            onPress={handleAdd}
            loading={submitting}
            fullWidth
            size="lg"
            icon="checkmark-circle-outline"
          />
          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  summaryItem: {
    alignItems: 'center',
    gap: 2,
  },
  summaryCount: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  summaryLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  list: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordContent: {
    flex: 1,
  },
  recordTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recordType: {
    ...Typography.captionBold,
    color: Colors.text,
  },
  recordTag: {
    ...Typography.smallBold,
    color: Colors.primary,
    backgroundColor: Colors.primary + '12',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  recordDate: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  recordDesc: {
    ...Typography.small,
    color: Colors.textLight,
    marginTop: 4,
  },
  costBadge: {
    backgroundColor: Colors.warning + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  costText: {
    ...Typography.smallBold,
    color: Colors.warning,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    start: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
  },

  // Modal
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  modalTitle: {
    ...Typography.h4,
    color: Colors.text,
  },
  modalCancel: {
    ...Typography.captionBold,
    color: Colors.error,
  },
  modalContent: {
    padding: Spacing.xl,
  },
  fieldLabel: {
    ...Typography.captionBold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'right',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeChipText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
});
