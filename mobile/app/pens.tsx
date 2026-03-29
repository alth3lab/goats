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
import { pensApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LoadingScreen, EmptyState, Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { western } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import { SearchBar } from '@/components/SearchBar';
import { validateNumber, validateRequired } from '@/lib/validation';
import type { Pen } from '@/types';

export default function PensScreen() {
  const [pens, setPens] = useState<Pen[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [search, setSearch] = useState('');
  const { can } = useAuth();

  // Form
  const [formName, setFormName] = useState('');
  const [formCapacity, setFormCapacity] = useState('');
  const [formType, setFormType] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const fetchPens = useCallback(async () => {
    try {
      const data = await pensApi.list();
      setPens(data as unknown as Pen[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل الحظائر';
      showToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPens();
  }, [fetchPens]);

  const handleAdd = async () => {
    if (!validateRequired(formName, 'اسم الحظيرة')) return;
    if (formCapacity) { const v = validateNumber(formCapacity, 'السعة', { min: 1, integer: true }); if (v === null) return; }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        nameAr: formName.trim(),
      };
      if (formCapacity) body.capacity = parseInt(formCapacity);
      if (formType.trim()) body.type = formType.trim();
      if (formNotes.trim()) body.notes = formNotes.trim();

      await pensApi.create(body);
      setAddVisible(false);
      setFormName('');
      setFormCapacity('');
      setFormType('');
      setFormNotes('');
      fetchPens();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل إضافة الحظيرة';
      Alert.alert('خطأ', message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderPen = ({ item }: { item: Pen }) => {
    const current = item.currentCount || 0;
    const capacity = item.capacity || 0;
    const usage = capacity > 0 ? (current / capacity) * 100 : 0;
    const isOverCapacity = capacity > 0 && current >= capacity;
    const isNearCapacity = capacity > 0 && usage >= 80;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardNameRow}>
            <View style={[styles.penIcon, { backgroundColor: isOverCapacity ? Colors.error + '15' : Colors.info + '15' }]}>
              <Ionicons name="home" size={22} color={isOverCapacity ? Colors.error : Colors.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.penName}>{item.nameAr}</Text>
              {item.type && <Text style={styles.penType}>{item.type}</Text>}
            </View>
          </View>
          {isNearCapacity && (
            <View style={[styles.alertBadge, { backgroundColor: isOverCapacity ? Colors.error + '15' : Colors.warning + '15' }]}>
              <Ionicons name="warning" size={14} color={isOverCapacity ? Colors.error : Colors.warning} />
            </View>
          )}
        </View>

        {/* Capacity Bar */}
        <View style={styles.capacitySection}>
          <View style={styles.capacityInfo}>
            <Text style={styles.capacityLabel}>السعة</Text>
            <Text style={styles.capacityText}>
              <Text style={[styles.capacityCount, isOverCapacity && { color: Colors.error }]}>{western(current)}</Text>
              {capacity > 0 ? ` / ${western(capacity)}` : ''}
            </Text>
          </View>
          {capacity > 0 && (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(usage, 100)}%`,
                    backgroundColor: isOverCapacity ? Colors.error : isNearCapacity ? Colors.warning : Colors.success,
                  },
                ]}
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;

  const totalAnimals = pens.reduce((sum, p) => sum + (p.currentCount || 0), 0);
  const totalCapacity = pens.reduce((sum, p) => sum + (p.capacity || 0), 0);

  return (
    <>
      <Stack.Screen options={{ title: 'إدارة الحظائر', headerShown: true, headerStyle: { backgroundColor: Colors.primary }, headerTintColor: '#fff', headerTitleStyle: { ...Typography.h4, color: '#fff' }, headerTitleAlign: 'center' }} />
      <View style={styles.container}>
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{western(pens.length)}</Text>
            <Text style={styles.summaryLabel}>حظائر</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{western(totalAnimals)}</Text>
            <Text style={styles.summaryLabel}>حيوانات</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalCapacity > 0 ? `${western(Math.round((totalAnimals / totalCapacity) * 100))}%` : '—'}</Text>
            <Text style={styles.summaryLabel}>نسبة الإشغال</Text>
          </View>
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder="بحث باسم الحظيرة..." />

        <FlatList
          data={search.trim() ? pens.filter(p => p.nameAr?.toLowerCase().includes(search.toLowerCase()) || p.type?.toLowerCase().includes(search.toLowerCase())) : pens}
          renderItem={renderPen}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPens(); }} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <EmptyState icon="home" title="لا يوجد حظائر" message="أضف أول حظيرة" action={{ title: 'إضافة حظيرة', onPress: () => setAddVisible(true) }} />
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
            <Text style={styles.modalTitle}>إضافة حظيرة</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Input label="اسم الحظيرة *" placeholder="مثال: حظيرة أ" icon="home-outline" value={formName} onChangeText={setFormName} />
            <Input label="السعة" placeholder="عدد الحيوانات" icon="people-outline" value={formCapacity} onChangeText={setFormCapacity} keyboardType="number-pad" />
            <Input label="النوع" placeholder="مثال: مفتوحة / مغلقة" icon="layers-outline" value={formType} onChangeText={setFormType} />
            <Input label="ملاحظات" placeholder="ملاحظات إضافية" icon="document-text-outline" value={formNotes} onChangeText={setFormNotes} multiline />

            <Button title="إضافة الحظيرة" onPress={handleAdd} loading={submitting} fullWidth size="lg" icon="checkmark-circle-outline" />
            <View style={{ height: 40 }} />
          </ScrollView>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  summaryRow: { flexDirection: 'row', backgroundColor: Colors.surface, padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { ...Typography.h3, color: Colors.text },
  summaryLabel: { ...Typography.small, color: Colors.textSecondary, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: Colors.borderLight },
  list: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingBottom: 100 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  penIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  penName: { ...Typography.bodyBold, color: Colors.text },
  penType: { ...Typography.small, color: Colors.textSecondary, marginTop: 2 },
  alertBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  capacitySection: { paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  capacityInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  capacityLabel: { ...Typography.small, color: Colors.textSecondary },
  capacityText: { ...Typography.caption, color: Colors.textSecondary },
  capacityCount: { ...Typography.captionBold, color: Colors.text },
  progressTrack: { height: 6, backgroundColor: Colors.borderLight, borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: 6, borderRadius: 3 },
  fab: { position: 'absolute', bottom: 24, start: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.info, justifyContent: 'center', alignItems: 'center', ...Shadows.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, backgroundColor: Colors.surface },
  modalTitle: { ...Typography.h4, color: Colors.text },
  modalCancel: { ...Typography.captionBold, color: Colors.error },
  modalContent: { padding: Spacing.xl },
});
