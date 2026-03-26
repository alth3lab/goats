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
import { feedsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LoadingScreen, EmptyState, Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { western } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import { SearchBar } from '@/components/SearchBar';
import { validateNumber, validateRequired } from '@/lib/validation';
import type { Feed } from '@/types';

const CATEGORIES = [
  { key: 'ALL', label: 'الكل' },
  { key: 'GRAINS', label: 'حبوب' },
  { key: 'HAY', label: 'تبن' },
  { key: 'SUPPLEMENTS', label: 'مكملات' },
  { key: 'MINERALS', label: 'معادن' },
  { key: 'CONCENTRATE', label: 'مركزات' },
  { key: 'OTHER', label: 'أخرى' },
];

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  GRAINS: 'leaf',
  HAY: 'nutrition',
  SUPPLEMENTS: 'flask',
  MINERALS: 'diamond',
  CONCENTRATE: 'cube',
  OTHER: 'ellipse',
};

export default function FeedsScreen() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('ALL');
  const [addVisible, setAddVisible] = useState(false);
  const [search, setSearch] = useState('');
  const { can } = useAuth();

  // Form
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('GRAINS');
  const [formProtein, setFormProtein] = useState('');
  const [formEnergy, setFormEnergy] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formReorder, setFormReorder] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const fetchFeeds = useCallback(async () => {
    try {
      const data = await feedsApi.list(category);
      setFeeds(data as unknown as Feed[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل الأعلاف';
      showToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category]);

  useEffect(() => {
    setLoading(true);
    fetchFeeds();
  }, [fetchFeeds]);

  const handleAdd = async () => {
    if (!validateRequired(formName, 'اسم العلف')) return;
    if (formProtein) { const v = validateNumber(formProtein, 'البروتين', { min: 0, max: 100 }); if (v === null) return; }
    if (formEnergy) { const v = validateNumber(formEnergy, 'الطاقة', { min: 0 }); if (v === null) return; }
    if (formPrice) { const v = validateNumber(formPrice, 'السعر', { min: 0 }); if (v === null) return; }
    if (formReorder) { const v = validateNumber(formReorder, 'حد إعادة الطلب', { min: 0, integer: true }); if (v === null) return; }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        nameAr: formName.trim(),
        category: formCategory,
      };
      if (formProtein) body.protein = parseFloat(formProtein);
      if (formEnergy) body.energy = parseFloat(formEnergy);
      if (formPrice) body.unitPrice = parseFloat(formPrice);
      if (formReorder) body.reorderLevel = parseInt(formReorder);
      if (formSupplier.trim()) body.supplier = formSupplier.trim();
      if (formDesc.trim()) body.description = formDesc.trim();

      await feedsApi.create(body);
      setAddVisible(false);
      resetForm();
      fetchFeeds();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل إضافة العلف';
      Alert.alert('خطأ', message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormCategory('GRAINS');
    setFormProtein('');
    setFormEnergy('');
    setFormPrice('');
    setFormReorder('');
    setFormSupplier('');
    setFormDesc('');
  };

  const renderFeed = ({ item }: { item: Feed }) => {
    const isLowStock = item.reorderLevel && item.currentStock !== undefined && item.currentStock <= item.reorderLevel;
    return (
      <View style={styles.feedCard}>
        <View style={styles.feedTop}>
          <View style={styles.feedNameRow}>
            <View style={[styles.feedIcon, { backgroundColor: Colors.warning + '15' }]}>
              <Ionicons name={CATEGORY_ICONS[item.category] || 'nutrition'} size={20} color={Colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.feedName}>{item.nameAr}</Text>
              <Text style={styles.feedCategory}>
                {CATEGORIES.find(c => c.key === item.category)?.label || item.category}
              </Text>
            </View>
          </View>
          {isLowStock && (
            <View style={styles.lowStockBadge}>
              <Ionicons name="warning" size={14} color={Colors.error} />
              <Text style={styles.lowStockText}>مخزون منخفض</Text>
            </View>
          )}
        </View>

        <View style={styles.feedStats}>
          {item.currentStock !== undefined && (
            <View style={styles.feedStat}>
              <Text style={styles.feedStatLabel}>المخزون</Text>
              <Text style={[styles.feedStatValue, isLowStock ? { color: Colors.error } : undefined]}>
                {western(item.currentStock)}
              </Text>
            </View>
          )}
          {item.protein !== undefined && item.protein !== null && (
            <View style={styles.feedStat}>
              <Text style={styles.feedStatLabel}>بروتين</Text>
              <Text style={styles.feedStatValue}>{western(item.protein)}%</Text>
            </View>
          )}
          {item.unitPrice !== undefined && item.unitPrice !== null && (
            <View style={styles.feedStat}>
              <Text style={styles.feedStatLabel}>السعر</Text>
              <Text style={styles.feedStatValue}>{western(item.unitPrice)}</Text>
            </View>
          )}
          {item.supplier && (
            <View style={styles.feedStat}>
              <Text style={styles.feedStatLabel}>المورد</Text>
              <Text style={styles.feedStatValue}>{item.supplier}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;

  return (
    <>
      <Stack.Screen options={{ title: 'إدارة الأعلاف', headerShown: true, headerStyle: { backgroundColor: Colors.primary }, headerTintColor: '#fff', headerTitleStyle: { ...Typography.h4, color: '#fff' }, headerTitleAlign: 'center' }} />
      <View style={styles.container}>
        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.key}
              style={[styles.filterTab, category === c.key && styles.filterTabActive]}
              onPress={() => setCategory(c.key)}
            >
              <Text style={[styles.filterTabText, category === c.key && styles.filterTabTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SearchBar value={search} onChangeText={setSearch} placeholder="بحث بالاسم أو المورد..." />

        <FlatList
          data={search.trim() ? feeds.filter(f => f.nameAr?.toLowerCase().includes(search.toLowerCase()) || f.supplier?.toLowerCase().includes(search.toLowerCase())) : feeds}
          renderItem={renderFeed}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFeeds(); }} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <EmptyState icon="nutrition" title="لا يوجد أعلاف" message="أضف أول نوع علف" action={{ title: 'إضافة علف', onPress: () => setAddVisible(true) }} />
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
            <Text style={styles.modalTitle}>إضافة علف</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Input label="اسم العلف *" placeholder="مثال: شعير" icon="nutrition-outline" value={formName} onChangeText={setFormName} />

            <Text style={styles.fieldLabel}>الفئة</Text>
            <View style={styles.typeRow}>
              {CATEGORIES.filter(c => c.key !== 'ALL').map(c => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.typeChip, formCategory === c.key && { backgroundColor: Colors.warning, borderColor: Colors.warning }]}
                  onPress={() => setFormCategory(c.key)}
                >
                  <Text style={[styles.typeChipText, formCategory === c.key && { color: '#fff' }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input label="نسبة البروتين %" placeholder="0" icon="flask-outline" value={formProtein} onChangeText={setFormProtein} keyboardType="decimal-pad" />
            <Input label="الطاقة" placeholder="0" icon="flash-outline" value={formEnergy} onChangeText={setFormEnergy} keyboardType="decimal-pad" />
            <Input label="سعر الوحدة" placeholder="0" icon="pricetag-outline" value={formPrice} onChangeText={setFormPrice} keyboardType="decimal-pad" />
            <Input label="حد إعادة الطلب" placeholder="0" icon="alert-circle-outline" value={formReorder} onChangeText={setFormReorder} keyboardType="number-pad" />
            <Input label="المورد" placeholder="اسم المورد" icon="business-outline" value={formSupplier} onChangeText={setFormSupplier} />
            <Input label="الوصف" placeholder="وصف العلف" icon="document-text-outline" value={formDesc} onChangeText={setFormDesc} multiline />

            <Button title="إضافة العلف" onPress={handleAdd} loading={submitting} fullWidth size="lg" icon="checkmark-circle-outline" />
            <View style={{ height: 40 }} />
          </ScrollView>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  filterRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  filterTab: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterTabActive: { backgroundColor: Colors.warning, borderColor: Colors.warning },
  filterTabText: { ...Typography.small, color: Colors.textSecondary },
  filterTabTextActive: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  feedCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  feedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  feedNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  feedIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  feedName: { ...Typography.bodyBold, color: Colors.text },
  feedCategory: { ...Typography.small, color: Colors.textSecondary, marginTop: 2 },
  lowStockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.error + '12', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full },
  lowStockText: { ...Typography.small, color: Colors.error },
  feedStats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  feedStat: { minWidth: '40%' },
  feedStatLabel: { ...Typography.small, color: Colors.textSecondary },
  feedStatValue: { ...Typography.captionBold, color: Colors.text, marginTop: 2 },
  fab: { position: 'absolute', bottom: 24, start: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.warning, justifyContent: 'center', alignItems: 'center', ...Shadows.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, backgroundColor: Colors.surface },
  modalTitle: { ...Typography.h4, color: Colors.text },
  modalCancel: { ...Typography.captionBold, color: Colors.error },
  modalContent: { padding: Spacing.xl },
  fieldLabel: { ...Typography.captionBold, color: Colors.text, marginBottom: Spacing.sm, textAlign: 'right' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  typeChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  typeChipText: { ...Typography.small, color: Colors.textSecondary },
});
