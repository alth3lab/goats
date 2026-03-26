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
import { inventoryApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LoadingScreen, EmptyState, Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { formatDate, western } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import { SearchBar } from '@/components/SearchBar';
import { validateNumber, validateRequired } from '@/lib/validation';
import type { InventoryItem } from '@/types';

const CATEGORIES = [
  { key: 'ALL', label: 'الكل' },
  { key: 'MEDICINE', label: 'أدوية' },
  { key: 'VACCINE', label: 'لقاحات' },
  { key: 'SUPPLIES', label: 'مستلزمات' },
  { key: 'EQUIPMENT', label: 'معدات' },
  { key: 'CLEANING', label: 'تنظيف' },
  { key: 'OTHER', label: 'أخرى' },
];

export default function InventoryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('ALL');
  const [addVisible, setAddVisible] = useState(false);
  const [search, setSearch] = useState('');
  const { can } = useAuth();

  // Form
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('MEDICINE');
  const [formStock, setFormStock] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formMinStock, setFormMinStock] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const fetchItems = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (category !== 'ALL') params.category = category;
      const data = await inventoryApi.list(params);
      setItems(data as unknown as InventoryItem[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل المخزون';
      showToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category]);

  useEffect(() => {
    setLoading(true);
    fetchItems();
  }, [fetchItems]);

  const lowStockCount = items.filter(i => i.minStock && i.currentStock <= i.minStock).length;

  const handleAdd = async () => {
    if (!validateRequired(formName, 'اسم الصنف')) return;
    if (!validateRequired(formUnit, 'الوحدة')) return;
    if (formStock) { const v = validateNumber(formStock, 'الكمية', { min: 0 }); if (v === null) return; }
    if (formMinStock) { const v = validateNumber(formMinStock, 'الحد الأدنى', { min: 0 }); if (v === null) return; }
    if (formPrice) { const v = validateNumber(formPrice, 'السعر', { min: 0 }); if (v === null) return; }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: formName.trim(),
        nameAr: formName.trim(),
        category: formCategory,
        unit: formUnit.trim(),
      };
      if (formStock) body.currentStock = parseFloat(formStock);
      if (formMinStock) body.minStock = parseFloat(formMinStock);
      if (formPrice) body.unitPrice = parseFloat(formPrice);
      if (formSupplier.trim()) body.supplier = formSupplier.trim();
      if (formNotes.trim()) body.notes = formNotes.trim();

      await inventoryApi.create(body);
      setAddVisible(false);
      setFormName('');
      setFormCategory('MEDICINE');
      setFormStock('');
      setFormUnit('');
      setFormMinStock('');
      setFormPrice('');
      setFormSupplier('');
      setFormNotes('');
      fetchItems();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل إضافة الصنف';
      Alert.alert('خطأ', message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const isLow = item.minStock !== undefined && item.minStock !== null && item.currentStock <= item.minStock;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.itemInfo}>
            <View style={[styles.itemIcon, { backgroundColor: isLow ? Colors.error + '15' : Colors.primary + '15' }]}>
              <Ionicons name="cube" size={20} color={isLow ? Colors.error : Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.nameAr || item.name}</Text>
              <Text style={styles.itemCategory}>
                {CATEGORIES.find(c => c.key === item.category)?.label || item.category}
                {item.unit ? ` • ${item.unit}` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.stockWrap}>
            <Text style={[styles.stockValue, isLow && { color: Colors.error }]}>
              {western(item.currentStock)}
            </Text>
            {isLow && <Ionicons name="arrow-down" size={14} color={Colors.error} />}
          </View>
        </View>

        <View style={styles.cardMeta}>
          {item.unitPrice !== undefined && item.unitPrice !== null && (
            <View style={styles.metaItem}>
              <Ionicons name="pricetag-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{western(item.unitPrice)}</Text>
            </View>
          )}
          {item.supplier && (
            <View style={styles.metaItem}>
              <Ionicons name="business-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{item.supplier}</Text>
            </View>
          )}
          {item.minStock !== undefined && item.minStock !== null && (
            <View style={styles.metaItem}>
              <Ionicons name="alert-circle-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.metaText}>حد أدنى: {western(item.minStock)}</Text>
            </View>
          )}
        </View>

        {item.transactions && item.transactions.length > 0 && (
          <View style={styles.lastTransaction}>
            <Text style={styles.lastTransLabel}>آخر حركة:</Text>
            <Text style={styles.lastTransValue}>
              {item.transactions[0].type === 'IN' ? '+' : '-'}{western(item.transactions[0].quantity)} • {formatDate(item.transactions[0].date)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;

  return (
    <>
      <Stack.Screen options={{ title: 'المخزون', headerShown: true, headerStyle: { backgroundColor: Colors.primary }, headerTintColor: '#fff', headerTitleStyle: { ...Typography.h4, color: '#fff' }, headerTitleAlign: 'center' }} />
      <View style={styles.container}>
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{western(items.length)}</Text>
            <Text style={styles.summaryLabel}>أصناف</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, lowStockCount > 0 && { color: Colors.error }]}>{western(lowStockCount)}</Text>
            <Text style={styles.summaryLabel}>مخزون منخفض</Text>
          </View>
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c.key} style={[styles.filterTab, category === c.key && styles.filterTabActive]} onPress={() => setCategory(c.key)}>
              <Text style={[styles.filterTabText, category === c.key && styles.filterTabTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SearchBar value={search} onChangeText={setSearch} placeholder="بحث بالاسم أو المورد..." />

        <FlatList
          data={search.trim() ? items.filter(i => (i.nameAr || i.name)?.toLowerCase().includes(search.toLowerCase()) || i.supplier?.toLowerCase().includes(search.toLowerCase())) : items}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchItems(); }} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <EmptyState icon="cube" title="لا يوجد أصناف" message="أضف أول صنف في المخزون" action={{ title: 'إضافة صنف', onPress: () => setAddVisible(true) }} />
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
            <Text style={styles.modalTitle}>إضافة صنف</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Input label="اسم الصنف *" placeholder="مثال: أموكسيسيلين" icon="cube-outline" value={formName} onChangeText={setFormName} />

            <Text style={styles.fieldLabel}>الفئة</Text>
            <View style={styles.typeRow}>
              {CATEGORIES.filter(c => c.key !== 'ALL').map(c => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.typeChip, formCategory === c.key && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}
                  onPress={() => setFormCategory(c.key)}
                >
                  <Text style={[styles.typeChipText, formCategory === c.key && { color: '#fff' }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input label="الكمية الحالية" placeholder="0" icon="layers-outline" value={formStock} onChangeText={setFormStock} keyboardType="decimal-pad" />
            <Input label="الوحدة *" placeholder="مثال: حبة / لتر / كغ" icon="resize-outline" value={formUnit} onChangeText={setFormUnit} />
            <Input label="الحد الأدنى" placeholder="0" icon="alert-circle-outline" value={formMinStock} onChangeText={setFormMinStock} keyboardType="decimal-pad" />
            <Input label="سعر الوحدة" placeholder="0" icon="pricetag-outline" value={formPrice} onChangeText={setFormPrice} keyboardType="decimal-pad" />
            <Input label="المورد" placeholder="اسم المورد" icon="business-outline" value={formSupplier} onChangeText={setFormSupplier} />
            <Input label="ملاحظات" placeholder="ملاحظات" icon="document-text-outline" value={formNotes} onChangeText={setFormNotes} multiline />

            <Button title="إضافة الصنف" onPress={handleAdd} loading={submitting} fullWidth size="lg" icon="checkmark-circle-outline" />
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
  filterRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  filterTab: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterTabText: { ...Typography.small, color: Colors.textSecondary },
  filterTabTextActive: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  itemInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  itemIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  itemName: { ...Typography.captionBold, color: Colors.text },
  itemCategory: { ...Typography.small, color: Colors.textSecondary, marginTop: 2 },
  stockWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stockValue: { ...Typography.h3, color: Colors.text },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...Typography.small, color: Colors.textSecondary },
  lastTransaction: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  lastTransLabel: { ...Typography.small, color: Colors.textLight },
  lastTransValue: { ...Typography.smallBold, color: Colors.text },
  fab: { position: 'absolute', bottom: 24, start: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', ...Shadows.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, backgroundColor: Colors.surface },
  modalTitle: { ...Typography.h4, color: Colors.text },
  modalCancel: { ...Typography.captionBold, color: Colors.error },
  modalContent: { padding: Spacing.xl },
  fieldLabel: { ...Typography.captionBold, color: Colors.text, marginBottom: Spacing.sm, textAlign: 'right' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  typeChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  typeChipText: { ...Typography.small, color: Colors.textSecondary },
});
