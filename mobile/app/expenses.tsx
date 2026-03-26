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
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { expensesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LoadingScreen, EmptyState, Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows, ExpenseCategoryLabels } from '@/lib/theme';
import { formatDate, formatNumber } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import { SearchBar } from '@/components/SearchBar';
import { validateNumber, validateDate, validateRequired } from '@/lib/validation';
import type { Expense, ExpenseCategory } from '@/types';

const CATEGORIES: ExpenseCategory[] = ['FEED', 'MEDICINE', 'VETERINARY', 'EQUIPMENT', 'LABOR', 'UTILITIES', 'MAINTENANCE', 'OTHER'];

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  FEED: 'nutrition',
  MEDICINE: 'medkit',
  VETERINARY: 'medical',
  EQUIPMENT: 'construct',
  LABOR: 'people',
  UTILITIES: 'flash',
  MAINTENANCE: 'build',
  OTHER: 'ellipsis-horizontal',
};

const CATEGORY_COLORS: Record<string, string> = {
  FEED: Colors.warning,
  MEDICINE: Colors.error,
  VETERINARY: Colors.info,
  EQUIPMENT: Colors.secondary,
  LABOR: Colors.primary,
  UTILITIES: '#9C27B0',
  MAINTENANCE: Colors.textSecondary,
  OTHER: Colors.textLight,
};

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [addVisible, setAddVisible] = useState(false);
  const [search, setSearch] = useState('');
  const { can } = useAuth();

  // Form
  const [formCategory, setFormCategory] = useState<string>('FEED');
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPayment, setFormPayment] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const fetchExpenses = useCallback(async (pageNum = 0, append = false) => {
    try {
      const result = await expensesApi.list({ page: String(pageNum), limit: '30' });
      const data = Array.isArray(result) ? result : (result as { data?: Record<string, unknown>[] }).data || [];
      const items = data as unknown as Expense[];
      if (append) {
        setExpenses(prev => [...prev, ...items]);
      } else {
        setExpenses(items);
      }
      setHasMore(items.length >= 30);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل المصروفات';
      showToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchExpenses(nextPage, true);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const categoryTotals = CATEGORIES.map(cat => ({
    category: cat,
    total: expenses.filter(e => e.category === cat).reduce((sum, e) => sum + (e.amount || 0), 0),
    count: expenses.filter(e => e.category === cat).length,
  })).filter(c => c.count > 0);

  const handleAdd = async () => {
    if (!validateRequired(formDesc, 'الوصف')) return;
    const amt = validateNumber(formAmount, 'المبلغ', { required: true, min: 0.01 });
    if (amt === null) return;
    if (!validateDate(formDate, 'التاريخ', { required: true })) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        category: formCategory,
        description: formDesc.trim(),
        amount: parseFloat(formAmount),
        date: formDate,
      };
      if (formPayment.trim()) body.paymentMethod = formPayment.trim();
      if (formNotes.trim()) body.notes = formNotes.trim();

      await expensesApi.create(body);
      setAddVisible(false);
      resetForm();
      fetchExpenses();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل إضافة المصروف';
      Alert.alert('خطأ', message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormCategory('FEED');
    setFormDesc('');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormPayment('');
    setFormNotes('');
  };

  const renderExpense = ({ item }: { item: Expense }) => {
    const catColor = CATEGORY_COLORS[item.category] || Colors.textSecondary;
    const catIcon = CATEGORY_ICONS[item.category] || 'ellipsis-horizontal';
    return (
      <View style={styles.card}>
        <View style={[styles.cardIcon, { backgroundColor: catColor + '15' }]}>
          <Ionicons name={catIcon} size={20} color={catColor} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <Text style={styles.cardDesc}>{item.description}</Text>
            <Text style={styles.cardAmount}>{formatNumber(item.amount)}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.cardCategory}>{ExpenseCategoryLabels[item.category]}</Text>
            <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
          </View>
          {item.owner && <Text style={styles.cardOwner}>{item.owner.name}</Text>}
        </View>
      </View>
    );
  };

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;

  return (
    <>
      <Stack.Screen options={{ title: 'المصروفات', headerShown: true, headerStyle: { backgroundColor: Colors.primary }, headerTintColor: '#fff', headerTitleStyle: { ...Typography.h4, color: '#fff' }, headerTitleAlign: 'center' }} />
      <View style={styles.container}>
        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>إجمالي المصروفات</Text>
          <Text style={styles.summaryValue}>{formatNumber(totalExpenses)}</Text>
        </View>

        {/* Category Breakdown */}
        {categoryTotals.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {categoryTotals.map(ct => (
              <View key={ct.category} style={styles.catChip}>
                <Ionicons name={CATEGORY_ICONS[ct.category]} size={16} color={CATEGORY_COLORS[ct.category]} />
                <Text style={styles.catChipLabel}>{ExpenseCategoryLabels[ct.category]}</Text>
                <Text style={styles.catChipValue}>{formatNumber(ct.total)}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        <SearchBar value={search} onChangeText={setSearch} placeholder="بحث بالوصف أو الملاحظات..." />

        <FlatList
          data={search.trim() ? expenses.filter(e => e.description?.toLowerCase().includes(search.toLowerCase()) || e.notes?.toLowerCase().includes(search.toLowerCase())) : expenses}
          renderItem={renderExpense}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setPage(0); fetchExpenses(0); }} colors={[Colors.primary]} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <EmptyState icon="wallet" title="لا يوجد مصروفات" message="سجّل أول مصروف" action={{ title: 'إضافة مصروف', onPress: () => setAddVisible(true) }} />
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={Colors.primary} style={{ paddingVertical: 16 }} /> : null}
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
            <Text style={styles.modalTitle}>إضافة مصروف</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>الفئة</Text>
            <View style={styles.typeRow}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.typeChip, formCategory === cat && { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] }]}
                  onPress={() => setFormCategory(cat)}
                >
                  <Ionicons name={CATEGORY_ICONS[cat]} size={14} color={formCategory === cat ? '#fff' : CATEGORY_COLORS[cat]} />
                  <Text style={[styles.typeChipText, formCategory === cat && { color: '#fff' }]}>{ExpenseCategoryLabels[cat]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input label="الوصف *" placeholder="وصف المصروف" icon="document-text-outline" value={formDesc} onChangeText={setFormDesc} />
            <Input label="المبلغ *" placeholder="0" icon="cash-outline" value={formAmount} onChangeText={setFormAmount} keyboardType="decimal-pad" />
            <Input label="التاريخ" placeholder="YYYY-MM-DD" icon="calendar-outline" value={formDate} onChangeText={setFormDate} />
            <Input label="طريقة الدفع" placeholder="نقد / تحويل / شيك" icon="card-outline" value={formPayment} onChangeText={setFormPayment} />
            <Input label="ملاحظات" placeholder="ملاحظات إضافية" icon="create-outline" value={formNotes} onChangeText={setFormNotes} multiline />

            <Button title="إضافة المصروف" onPress={handleAdd} loading={submitting} fullWidth size="lg" icon="checkmark-circle-outline" />
            <View style={{ height: 40 }} />
          </ScrollView>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  summaryCard: { backgroundColor: Colors.error + '12', padding: Spacing.xl, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  summaryLabel: { ...Typography.caption, color: Colors.textSecondary },
  summaryValue: { ...Typography.h2, color: Colors.error, marginTop: 4 },
  catRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, ...Shadows.sm },
  catChipLabel: { ...Typography.small, color: Colors.textSecondary },
  catChipValue: { ...Typography.smallBold, color: Colors.text },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.md, ...Shadows.sm },
  cardIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardDesc: { ...Typography.captionBold, color: Colors.text, flex: 1 },
  cardAmount: { ...Typography.bodyBold, color: Colors.error },
  cardMeta: { flexDirection: 'row', gap: Spacing.lg },
  cardCategory: { ...Typography.small, color: Colors.textSecondary },
  cardDate: { ...Typography.small, color: Colors.textSecondary },
  cardOwner: { ...Typography.small, color: Colors.primary, marginTop: 4 },
  fab: { position: 'absolute', bottom: 24, start: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.error, justifyContent: 'center', alignItems: 'center', ...Shadows.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, backgroundColor: Colors.surface },
  modalTitle: { ...Typography.h4, color: Colors.text },
  modalCancel: { ...Typography.captionBold, color: Colors.error },
  modalContent: { padding: Spacing.xl },
  fieldLabel: { ...Typography.captionBold, color: Colors.text, marginBottom: Spacing.sm, textAlign: 'right' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  typeChipText: { ...Typography.small, color: Colors.textSecondary },
});
