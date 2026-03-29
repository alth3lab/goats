import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { breedingApi, resolveGoatByTag } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LoadingScreen, EmptyState, Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows, PregnancyStatusLabels, PregnancyStatusColors } from '@/lib/theme';
import { formatDate, western } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import { SearchBar } from '@/components/SearchBar';
import { validateDate, validateRequired } from '@/lib/validation';
import type { Breeding } from '@/types';

const STATUS_FILTERS = [
  { key: 'ALL', label: 'الكل' },
  { key: 'MATED', label: 'ملقح' },
  { key: 'PREGNANT', label: 'حامل' },
  { key: 'DELIVERED', label: 'ولدت' },
  { key: 'FAILED', label: 'فشل' },
];

export default function BreedingScreen() {
  const [records, setRecords] = useState<Breeding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [addVisible, setAddVisible] = useState(false);
  const [search, setSearch] = useState('');
  const { can } = useAuth();

  // Form
  const [formMotherTag, setFormMotherTag] = useState('');
  const [formFatherTag, setFormFatherTag] = useState('');
  const [formMatingDate, setFormMatingDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const fetchRecords = useCallback(async () => {
    try {
      const data = await breedingApi.list();
      setRecords(data as unknown as Breeding[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل سجلات التربية';
      showToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filteredRecords = (filter === 'ALL' ? records : records.filter(r => r.pregnancyStatus === filter))
    .filter(r => !search.trim() || r.mother?.tagId?.toLowerCase().includes(search.toLowerCase()) || r.father?.tagId?.toLowerCase().includes(search.toLowerCase()) || r.notes?.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total: records.length,
    pregnant: records.filter(r => r.pregnancyStatus === 'PREGNANT').length,
    delivered: records.filter(r => r.pregnancyStatus === 'DELIVERED').length,
    failed: records.filter(r => r.pregnancyStatus === 'FAILED').length,
  };

  const handleAdd = async () => {
    if (!validateRequired(formMotherTag, 'رقم الأم')) return;
    if (!validateDate(formMatingDate, 'تاريخ التلقيح', { required: true })) return;
    setSubmitting(true);
    try {
      // Resolve mother tag to UUID
      const motherId = await resolveGoatByTag(formMotherTag);
      if (!motherId) {
        Alert.alert('خطأ', 'لم يتم العثور على الأم بهذا الرقم');
        setSubmitting(false);
        return;
      }

      const body: Record<string, unknown> = {
        motherId,
        matingDate: formMatingDate,
      };

      // Resolve father tag to UUID if provided
      if (formFatherTag.trim()) {
        const fatherId = await resolveGoatByTag(formFatherTag);
        if (!fatherId) {
          Alert.alert('خطأ', 'لم يتم العثور على الأب بهذا الرقم');
          setSubmitting(false);
          return;
        }
        body.fatherId = fatherId;
      }

      if (formNotes.trim()) body.notes = formNotes.trim();

      await breedingApi.create(body);
      setAddVisible(false);
      resetForm();
      fetchRecords();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل تسجيل التلقيح';
      Alert.alert('خطأ', message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormMotherTag('');
    setFormFatherTag('');
    setFormMatingDate(new Date().toISOString().split('T')[0]);
    setFormNotes('');
  };

  const renderRecord = ({ item }: { item: Breeding }) => {
    const statusColor = PregnancyStatusColors[item.pregnancyStatus] || Colors.textSecondary;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.parentPair}>
            <View style={styles.parentChip}>
              <Ionicons name="female" size={16} color={Colors.female} />
              <Text style={styles.parentTag}>{item.mother?.tagId || '—'}</Text>
            </View>
            <Ionicons name="heart" size={14} color={Colors.female} />
            <View style={styles.parentChip}>
              <Ionicons name="male" size={16} color={Colors.male} />
              <Text style={styles.parentTag}>{item.father?.tagId || '—'}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {PregnancyStatusLabels[item.pregnancyStatus]}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.detailText}>التلقيح: {formatDate(item.matingDate)}</Text>
          </View>
          {item.dueDate && (
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={14} color={Colors.female} />
              <Text style={[styles.detailText, { color: Colors.female }]}>
                موعد الولادة: {formatDate(item.dueDate)}
              </Text>
            </View>
          )}
          {item.birthDate && (
            <View style={styles.detailItem}>
              <Ionicons name="heart-circle-outline" size={14} color={Colors.success} />
              <Text style={[styles.detailText, { color: Colors.success }]}>
                الولادة: {formatDate(item.birthDate)}
                {item.numberOfKids ? ` — ${western(item.numberOfKids)} مواليد` : ''}
              </Text>
            </View>
          )}
        </View>

        {item.notes && (
          <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
        )}
      </View>
    );
  };

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;

  return (
    <>
      <Stack.Screen options={{ title: 'التربية والتكاثر', headerShown: true, headerStyle: { backgroundColor: Colors.primary }, headerTintColor: '#fff', headerTitleStyle: { ...Typography.h4, color: '#fff' }, headerTitleAlign: 'center' }} />
      <View style={styles.container}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{western(stats.total)}</Text>
            <Text style={styles.statLabel}>إجمالي</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.female }]}>{western(stats.pregnant)}</Text>
            <Text style={styles.statLabel}>حوامل</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.success }]}>{western(stats.delivered)}</Text>
            <Text style={styles.statLabel}>ولادات</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.error }]}>{western(stats.failed)}</Text>
            <Text style={styles.statLabel}>فشل</Text>
          </View>
        </View>

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {STATUS_FILTERS.map(f => (
            <TouchableOpacity key={f.key} style={[styles.filterTab, filter === f.key && styles.filterTabActive]} onPress={() => setFilter(f.key)}>
              <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SearchBar value={search} onChangeText={setSearch} placeholder="بحث برقم الأم أو الأب..." />

        <FlatList
          data={filteredRecords}
          renderItem={renderRecord}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRecords(); }} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <EmptyState icon="git-merge" title="لا يوجد سجلات تربية" message="سجّل أول عملية تلقيح" action={{ title: 'تسجيل تلقيح', onPress: () => setAddVisible(true) }} />
          }
          showsVerticalScrollIndicator={false}
        />

        {can('__owner_admin__') && (
          <TouchableOpacity style={styles.fab} onPress={() => setAddVisible(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        <Modal visible={addVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAddVisible(false)}>
              <Text style={styles.modalCancel}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>تسجيل تلقيح</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Input label="رقم الأم *" placeholder="Tag ID للأنثى" icon="female-outline" value={formMotherTag} onChangeText={setFormMotherTag} />
            <Input label="رقم الأب" placeholder="Tag ID للذكر (اختياري)" icon="male-outline" value={formFatherTag} onChangeText={setFormFatherTag} />
            <Input label="تاريخ التلقيح" placeholder="YYYY-MM-DD" icon="calendar-outline" value={formMatingDate} onChangeText={setFormMatingDate} />
            <Input label="ملاحظات" placeholder="ملاحظات إضافية" icon="document-text-outline" value={formNotes} onChangeText={setFormNotes} multiline />

            <Button title="تسجيل التلقيح" onPress={handleAdd} loading={submitting} fullWidth size="lg" icon="checkmark-circle-outline" />
            <View style={{ height: 40 }} />
          </ScrollView>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.surface, padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...Typography.h3, color: Colors.text },
  statLabel: { ...Typography.small, color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.borderLight },
  filterRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  filterTab: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterTabActive: { backgroundColor: Colors.female, borderColor: Colors.female },
  filterTabText: { ...Typography.small, color: Colors.textSecondary },
  filterTabTextActive: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  parentPair: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  parentChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.background, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  parentTag: { ...Typography.captionBold, color: Colors.text },
  statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: 3, borderRadius: Radius.full },
  statusText: { ...Typography.smallBold },
  cardDetails: { gap: Spacing.sm },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { ...Typography.caption, color: Colors.textSecondary },
  notes: { ...Typography.small, color: Colors.textLight, marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  fab: { position: 'absolute', bottom: 24, start: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.female, justifyContent: 'center', alignItems: 'center', ...Shadows.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, backgroundColor: Colors.surface },
  modalTitle: { ...Typography.h4, color: Colors.text },
  modalCancel: { ...Typography.captionBold, color: Colors.error },
  modalContent: { padding: Spacing.xl },
});
