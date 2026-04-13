import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
import { healthApi, goatsApi, resolveGoatByTag } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LoadingScreen, EmptyState, Button, Input, SectionHeader } from '@/components/ui';
import DatePickerField from '@/components/DatePickerField';
import { Colors, Spacing, Radius, Typography, Shadows, Gradients, HealthTypeLabels } from '@/lib/theme';
import { formatDate, formatNumber, western } from '@/lib/formatters';
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

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
    }, [fetchRecords])
  );

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

  const handleDelete = (id: string) => {
    if (!can('__owner_admin__')) return;
    Alert.alert(
      'حذف السجل الصحي',
      'هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await healthApi.delete(id);
              setRecords(prev => prev.filter(r => r.id !== id));
              showToast('success', 'تم حذف السجل الصحي');
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'فشل حذف السجل';
              Alert.alert('خطأ', msg);
            }
          },
        },
      ]
    );
  };

  const renderRecord = useCallback(({ item }: { item: HealthRecord }) => {
    const typeColor = TYPE_COLORS[item.type] || Colors.textSecondary;
    const typeIcon = TYPE_ICONS[item.type] || 'medkit';
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handlePressOut = () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    const handleLongPress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      handleDelete(item.id);
    };

    return (
      <AnimatedPressable
        style={[styles.recordCard, animatedStyle]}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={500}
      >
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
            <Text style={styles.costText}>{formatNumber(item.cost)}</Text>
          </View>
        ) : null}
      </AnimatedPressable>
    );
  }, [handleDelete]);

  const filteredRecords = useMemo(() =>
    search.trim() ? records.filter(r => r.goat?.tagId?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase()) || r.veterinarian?.toLowerCase().includes(search.toLowerCase())) : records
  , [search, records]);

  const typeCounts = useMemo(() =>
    Object.fromEntries(HEALTH_TYPES.map(type => [type, records.filter(r => r.type === type).length]))
  , [records]) as Record<string, number>;

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        {HEALTH_TYPES.map(type => {
          const count = typeCounts[type] || 0;
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
        data={filteredRecords}
        renderItem={renderRecord}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
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
        <AnimatedPressable
          style={styles.fab}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setAddVisible(true);
          }}
          onPressIn={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
        >
          <LinearGradient
            colors={Gradients.heroBlue as unknown as readonly [string, string, ...string[]]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Ionicons name="add" size={28} color="#fff" />
        </AnimatedPressable>
      )}

      {/* Add Modal */}
      <Modal visible={addVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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

          <DatePickerField
            label="التاريخ"
            value={formDate}
            onChange={setFormDate}
            placeholder="اختر التاريخ"
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
          <View style={{ height: 100 }} />
        </ScrollView>
        </KeyboardAvoidingView>
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
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Shadows.fab,
    shadowColor: Colors.info,
    shadowOpacity: 0.3,
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
