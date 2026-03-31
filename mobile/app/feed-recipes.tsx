import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, Modal, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { feedsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LoadingScreen, EmptyState, Button, Input, AlertBanner } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { western } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import type { Feed, FeedRecipe, ReorderSuggestion } from '@/types';

type TabKey = 'recipes' | 'reorder';

const URGENCY_COLORS: Record<string, string> = {
  HIGH: Colors.error,
  MEDIUM: '#f59e0b',
  LOW: Colors.success,
};
const URGENCY_LABELS: Record<string, string> = {
  HIGH: 'عاجل',
  MEDIUM: 'متوسط',
  LOW: 'منخفض',
};

export default function FeedRecipesScreen() {
  const [tab, setTab] = useState<TabKey>('recipes');
  const [recipes, setRecipes] = useState<FeedRecipe[]>([]);
  const [reorders, setReorders] = useState<ReorderSuggestion[]>([]);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const { can } = useAuth();
  const { showToast } = useToast();

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formItems, setFormItems] = useState<{ feedTypeId: string; percentage: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [recipesData, feedsData] = await Promise.all([
        feedsApi.recipes(),
        feedsApi.list(),
      ]);
      setRecipes(recipesData as unknown as FeedRecipe[]);
      setFeeds(feedsData as unknown as Feed[]);

      if (tab === 'reorder') {
        const reorderData = await feedsApi.reorder();
        setReorders(reorderData as unknown as ReorderSuggestion[]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل التحميل';
      showToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const fetchReorders = useCallback(async () => {
    try {
      const data = await feedsApi.reorder();
      setReorders(data as unknown as ReorderSuggestion[]);
    } catch { /* silently fail */ }
  }, []);

  const onTabChange = (t: TabKey) => {
    setTab(t);
    if (t === 'reorder' && reorders.length === 0) fetchReorders();
  };

  const addItem = () => {
    if (feeds.length === 0) return;
    setFormItems([...formItems, { feedTypeId: feeds[0].id, percentage: '' }]);
  };
  const removeItem = (idx: number) => setFormItems(formItems.filter((_, i) => i !== idx));
  const updateItem = (idx: number, key: 'feedTypeId' | 'percentage', val: string) => {
    const copy = [...formItems];
    copy[idx] = { ...copy[idx], [key]: val };
    setFormItems(copy);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) { showToast('error', 'اسم الخلطة مطلوب'); return; }
    if (formItems.length === 0) { showToast('error', 'أضف مكون واحد على الأقل'); return; }
    const total = formItems.reduce((s, it) => s + (parseFloat(it.percentage) || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      showToast('error', `مجموع النسب يجب أن يكون 100% (الآن ${western(total.toFixed(1))}%)`);
      return;
    }
    setSubmitting(true);
    try {
      await feedsApi.createRecipe({
        nameAr: formName.trim(),
        description: formDesc.trim() || undefined,
        items: formItems.map(it => ({
          feedTypeId: it.feedTypeId,
          percentage: parseFloat(it.percentage),
        })),
      });
      showToast('success', 'تم إنشاء الخلطة بنجاح');
      setAddVisible(false);
      resetForm();
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل الحفظ';
      showToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDesc('');
    setFormItems([]);
  };

  const renderRecipe = ({ item }: { item: FeedRecipe }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="beaker" size={22} color={Colors.primary} />
        <Text style={styles.cardTitle}>{item.nameAr}</Text>
        <View style={[styles.badge, { backgroundColor: item.isActive ? Colors.success + '20' : Colors.border }]}>
          <Text style={[styles.badgeText, { color: item.isActive ? Colors.success : Colors.textSecondary }]}>
            {item.isActive ? 'مفعّلة' : 'معطّلة'}
          </Text>
        </View>
      </View>
      {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
      <View style={styles.ingredients}>
        {(item.items || []).map((it, i) => (
          <View key={i} style={styles.ingredientRow}>
            <Text style={styles.ingredientName}>{it.feedType?.nameAr || '—'}</Text>
            <Text style={styles.ingredientPct}>{western(String(it.percentage))}%</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderReorder = ({ item }: { item: ReorderSuggestion }) => {
    const color = URGENCY_COLORS[item.urgency] || Colors.textSecondary;
    return (
      <View style={[styles.card, { borderRightColor: color, borderRightWidth: 4 }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="alert-circle" size={20} color={color} />
          <Text style={styles.cardTitle}>{item.feedType?.nameAr}</Text>
          <View style={[styles.badge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.badgeText, { color }]}>{URGENCY_LABELS[item.urgency]}</Text>
          </View>
        </View>
        <View style={styles.reorderInfo}>
          <View style={styles.reorderStat}>
            <Text style={styles.reorderLabel}>المخزون الحالي</Text>
            <Text style={styles.reorderValue}>{western(String(item.currentStock))}</Text>
          </View>
          <View style={styles.reorderStat}>
            <Text style={styles.reorderLabel}>يكفي لـ</Text>
            <Text style={[styles.reorderValue, item.daysUntilEmpty <= 7 && { color: Colors.error }]}>
              {western(String(Math.round(item.daysUntilEmpty)))} يوم
            </Text>
          </View>
          <View style={styles.reorderStat}>
            <Text style={styles.reorderLabel}>الكمية المقترحة</Text>
            <Text style={[styles.reorderValue, { color: Colors.primary }]}>
              {western(String(Math.round(item.suggestedQuantity)))}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <LoadingScreen />;

  const highUrgent = reorders.filter(r => r.urgency === 'HIGH').length;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title: 'خلطات الأعلاف وإعادة الطلب',
        headerShown: true,
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { ...Typography.h4, color: '#fff' },
        headerTitleAlign: 'center',
        headerBackTitle: '',
      }} />

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'recipes' && styles.tabActive]} onPress={() => onTabChange('recipes')}>
          <Ionicons name="beaker" size={18} color={tab === 'recipes' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.tabText, tab === 'recipes' && styles.tabTextActive]}>الخلطات</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'reorder' && styles.tabActive]} onPress={() => onTabChange('reorder')}>
          <Ionicons name="cart" size={18} color={tab === 'reorder' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.tabText, tab === 'reorder' && styles.tabTextActive]}>إعادة الطلب</Text>
          {highUrgent > 0 && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentBadgeText}>{western(String(highUrgent))}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {tab === 'reorder' && highUrgent > 0 && (
        <AlertBanner type="warning" message={`${western(String(highUrgent))} أعلاف تحتاج إعادة طلب عاجل`} />
      )}

      {tab === 'recipes' ? (
        <FlatList
          data={recipes}
          keyExtractor={it => it.id}
          renderItem={renderRecipe}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
          ListEmptyComponent={<EmptyState icon="beaker-outline" title="لا توجد خلطات" message="أضف خلطة علف جديدة" />}
        />
      ) : (
        <FlatList
          data={reorders}
          keyExtractor={(it, i) => it.feedType?.id || String(i)}
          renderItem={renderReorder}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
          ListEmptyComponent={<EmptyState icon="checkmark-circle-outline" title="لا توجد توصيات" message="مستويات المخزون جيدة" />}
        />
      )}

      {/* FAB */}
      {tab === 'recipes' && can('manage_feeds') && (
        <TouchableOpacity style={styles.fab} onPress={() => setAddVisible(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add Recipe Modal */}
      <Modal visible={addVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setAddVisible(false); resetForm(); }}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>خلطة جديدة</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
            <Input label="اسم الخلطة *" value={formName} onChangeText={setFormName} placeholder="مثال: خلطة انتاج" />
            <Input label="الوصف" value={formDesc} onChangeText={setFormDesc} placeholder="وصف اختياري" multiline />

            <Text style={styles.sectionLabel}>المكونات</Text>
            {formItems.map((it, idx) => (
              <View key={idx} style={styles.ingredientForm}>
                <View style={styles.ingredientSelect}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {feeds.map(f => (
                      <TouchableOpacity
                        key={f.id}
                        style={[styles.feedChip, it.feedTypeId === f.id && styles.feedChipActive]}
                        onPress={() => updateItem(idx, 'feedTypeId', f.id)}
                      >
                        <Text style={[styles.feedChipText, it.feedTypeId === f.id && styles.feedChipTextActive]}>
                          {f.nameAr}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.ingredientPctRow}>
                  <Input
                    label="النسبة %"
                    value={it.percentage}
                    onChangeText={v => updateItem(idx, 'percentage', v)}
                    keyboardType="decimal-pad"
                    style={{ flex: 1 }}
                  />
                  <TouchableOpacity onPress={() => removeItem(idx)} style={styles.removeBtn}>
                    <Ionicons name="trash" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
              <Ionicons name="add-circle" size={20} color={Colors.primary} />
              <Text style={styles.addItemText}>إضافة مكون</Text>
            </TouchableOpacity>

            {formItems.length > 0 && (
              <Text style={styles.totalPct}>
                المجموع: {western(formItems.reduce((s, it) => s + (parseFloat(it.percentage) || 0), 0).toFixed(1))}%
              </Text>
            )}

            <Button title={submitting ? 'جاري الحفظ...' : 'حفظ الخلطة'} onPress={handleSubmit} disabled={submitting} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: Spacing.sm },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.surface,
  },
  tabActive: { backgroundColor: Colors.primary + '15', borderWidth: 1, borderColor: Colors.primary + '40' },
  tabText: { ...Typography.body, color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary, fontWeight: '600' },
  urgentBadge: {
    backgroundColor: Colors.error, borderRadius: 10, minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  urgentBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  list: { padding: Spacing.md, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    ...Shadows.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTitle: { ...Typography.body, fontWeight: '600', flex: 1, textAlign: 'right' },
  cardDesc: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4, textAlign: 'right' },
  badge: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  ingredients: { marginTop: Spacing.sm, gap: 4 },
  ingredientRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  ingredientName: { ...Typography.caption, color: Colors.text, textAlign: 'right' },
  ingredientPct: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
  reorderInfo: { flexDirection: 'row', marginTop: Spacing.sm, gap: Spacing.md },
  reorderStat: { flex: 1, alignItems: 'center' },
  reorderLabel: { ...Typography.caption, color: Colors.textSecondary, fontSize: 11 },
  reorderValue: { ...Typography.body, fontWeight: '700', marginTop: 2 },
  fab: {
    position: 'absolute', bottom: 24, left: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    ...Shadows.md,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  modalTitle: { ...Typography.h3, textAlign: 'center' },
  modalBody: { flex: 1, padding: Spacing.md },
  sectionLabel: { ...Typography.body, fontWeight: '700', marginTop: Spacing.md, marginBottom: Spacing.sm, textAlign: 'right' },
  ingredientForm: {
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.sm,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  ingredientSelect: { marginBottom: Spacing.xs },
  feedChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginLeft: 6,
  },
  feedChipActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
  feedChipText: { ...Typography.caption, color: Colors.textSecondary },
  feedChipTextActive: { color: Colors.primary, fontWeight: '600' },
  ingredientPctRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  removeBtn: { padding: 8 },
  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: Spacing.sm, marginVertical: Spacing.sm,
    borderWidth: 1, borderColor: Colors.primary + '40', borderRadius: Radius.md, borderStyle: 'dashed',
  },
  addItemText: { ...Typography.body, color: Colors.primary },
  totalPct: {
    ...Typography.body, fontWeight: '700', textAlign: 'center',
    marginBottom: Spacing.md, color: Colors.primary,
  },
});
