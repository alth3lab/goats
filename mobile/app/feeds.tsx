import React, { useState, useCallback, useMemo } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { feedsApi, pensApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LoadingScreen, EmptyState, Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { western } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import { SearchBar } from '@/components/SearchBar';
import { validateNumber, validateRequired } from '@/lib/validation';
import type { Feed } from '@/types';

// ─── Constants ───
type TabKey = 'today' | 'types' | 'stock' | 'schedules' | 'history';
const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'today', label: 'اليوم', icon: 'today' },
  { key: 'types', label: 'الأعلاف', icon: 'nutrition' },
  { key: 'stock', label: 'المخزون', icon: 'cube' },
  { key: 'schedules', label: 'الجداول', icon: 'calendar' },
  { key: 'history', label: 'السجل', icon: 'time' },
];

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

function todayStr() { return new Date().toISOString().split('T')[0]; }
function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString('ar-AE', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return d; }
}

interface Schedule {
  id: string; feedTypeId: string;
  feedType?: { nameAr: string; category?: string };
  pen?: { nameAr: string; _count?: { goats: number } };
  goat?: { tagId: string; name?: string };
  penId?: string; goatId?: string;
  quantity: number; frequency: number;
  startDate: string; endDate?: string;
  isActive: boolean; notes?: string;
}
interface StockEntry {
  id: string; feedTypeId: string;
  feedType?: { nameAr: string; category?: string; reorderLevel?: number };
  quantity: number; unit: string;
  purchaseDate: string; expiryDate?: string;
  cost?: number; supplier?: string;
}
interface ConsumptionDay {
  date: string; totalQty: number; totalCost: number;
  items: { feedType: string; pen: string | null; quantity: number; cost: number; category: string }[];
}
interface Pen { id: string; nameAr: string; _count?: { goats: number } }

export default function FeedsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [history, setHistory] = useState<ConsumptionDay[]>([]);
  const [pens, setPens] = useState<Pen[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [addTypeVisible, setAddTypeVisible] = useState(false);
  const [addStockVisible, setAddStockVisible] = useState(false);
  const [addScheduleVisible, setAddScheduleVisible] = useState(false);
  const [consuming, setConsuming] = useState(false);
  const { can } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  // Form: Add Feed Type
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('GRAINS');
  const [formProtein, setFormProtein] = useState('');
  const [formEnergy, setFormEnergy] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formReorder, setFormReorder] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form: Add Stock
  const [stockFeedTypeId, setStockFeedTypeId] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [stockUnit, setStockUnit] = useState('كجم');
  const [stockPrice, setStockPrice] = useState('');
  const [stockSupplier, setStockSupplier] = useState('');
  const [stockExpiry, setStockExpiry] = useState('');
  const [stockNotes, setStockNotes] = useState('');
  const [stockSubmitting, setStockSubmitting] = useState(false);

  // Form: Add Schedule
  const [schFeedTypeId, setSchFeedTypeId] = useState('');
  const [schPenId, setSchPenId] = useState('');
  const [schAmount, setSchAmount] = useState('');
  const [schMeals, setSchMeals] = useState('2');
  const [schNotes, setSchNotes] = useState('');
  const [schSubmitting, setSchSubmitting] = useState(false);

  // ─── Data Fetching ───
  const fetchAll = useCallback(async () => {
    try {
      const [feedsData, schedulesData, stockData, historyData, pensData] = await Promise.all([
        feedsApi.list(category !== 'ALL' ? category : undefined),
        feedsApi.schedules({ isActive: 'true' }),
        feedsApi.stock({ limit: '200' }),
        feedsApi.consumptionHistory(30),
        pensApi.list(),
      ]);
      setFeeds((feedsData || []) as unknown as Feed[]);
      setSchedules((schedulesData || []) as unknown as Schedule[]);
      setStockEntries((stockData || []) as unknown as StockEntry[]);
      setHistory((historyData || []) as unknown as ConsumptionDay[]);
      setPens((pensData || []) as unknown as Pen[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل البيانات';
      showToast('error', msg);
    } finally { setLoading(false); setRefreshing(false); }
  }, [category]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchAll(); }, [fetchAll]));
  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  // ─── Computed ───
  const todayFeedings = useMemo(() => {
    const byPen: Record<string, { pen: string; penId: string; heads: number; items: { feed: string; amount: number; meals: number; category: string }[] }> = {};
    schedules.forEach(s => {
      if (!s.isActive) return;
      const penId = s.penId || s.goat?.tagId || 'none';
      const penName = s.goat ? `${s.goat.tagId} — ${s.goat.name || ''}` : (s.pen?.nameAr || 'بدون حظيرة');
      const heads = s.goat ? 1 : (s.pen?._count?.goats || 0);
      if (!byPen[penId]) byPen[penId] = { pen: penName, penId, heads, items: [] };
      byPen[penId].items.push({ feed: s.feedType?.nameAr || '-', amount: s.quantity, meals: s.frequency, category: s.feedType?.category || 'OTHER' });
    });
    return Object.values(byPen);
  }, [schedules]);

  const todayTotalKg = useMemo(() => todayFeedings.reduce((s, p) => s + p.items.reduce((ss, i) => ss + i.amount * p.heads, 0), 0), [todayFeedings]);
  const todayTotalHeads = useMemo(() => todayFeedings.reduce((s, p) => s + p.heads, 0), [todayFeedings]);

  const stockByType = useMemo(() => {
    const byType: Record<string, { name: string; qty: number; isLow: boolean }> = {};
    stockEntries.forEach(s => { const id = s.feedTypeId; if (!byType[id]) byType[id] = { name: s.feedType?.nameAr || '-', qty: 0, isLow: false }; byType[id].qty += s.quantity; });
    Object.values(byType).forEach(v => { v.isLow = v.qty < 50; });
    return Object.values(byType);
  }, [stockEntries]);

  // ─── Handlers ───
  const handleAddType = async () => {
    if (!validateRequired(formName, 'اسم العلف')) return;
    if (formProtein) { if (validateNumber(formProtein, 'البروتين', { min: 0, max: 100 }) === null) return; }
    if (formEnergy) { if (validateNumber(formEnergy, 'الطاقة', { min: 0 }) === null) return; }
    if (formPrice) { if (validateNumber(formPrice, 'السعر', { min: 0 }) === null) return; }
    if (formReorder) { if (validateNumber(formReorder, 'حد الطلب', { min: 0, integer: true }) === null) return; }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { nameAr: formName.trim(), category: formCategory };
      if (formProtein) body.protein = parseFloat(formProtein);
      if (formEnergy) body.energy = parseFloat(formEnergy);
      if (formPrice) body.unitPrice = parseFloat(formPrice);
      if (formReorder) body.reorderLevel = parseInt(formReorder);
      if (formSupplier.trim()) body.supplier = formSupplier.trim();
      if (formDesc.trim()) body.description = formDesc.trim();
      await feedsApi.create(body);
      setAddTypeVisible(false);
      setFormName(''); setFormCategory('GRAINS'); setFormProtein(''); setFormEnergy('');
      setFormPrice(''); setFormReorder(''); setFormSupplier(''); setFormDesc('');
      showToast('success', 'تم إضافة العلف بنجاح');
      fetchAll();
    } catch (err: unknown) { Alert.alert('خطأ', err instanceof Error ? err.message : 'فشل إضافة العلف'); }
    finally { setSubmitting(false); }
  };

  const handleAddStock = async () => {
    if (!stockFeedTypeId) { Alert.alert('خطأ', 'اختر نوع العلف'); return; }
    const qty = validateNumber(stockQty, 'الكمية', { min: 0.1 });
    if (qty === null) return;
    setStockSubmitting(true);
    try {
      const body: Record<string, unknown> = { feedTypeId: stockFeedTypeId, quantity: qty, unit: stockUnit || 'كجم', purchaseDate: todayStr() };
      if (stockPrice) body.unitPrice = parseFloat(stockPrice);
      if (stockSupplier.trim()) body.supplier = stockSupplier.trim();
      if (stockExpiry.trim()) body.expiryDate = stockExpiry.trim();
      if (stockNotes.trim()) body.notes = stockNotes.trim();
      await feedsApi.addStock(body);
      setAddStockVisible(false);
      setStockFeedTypeId(''); setStockQty(''); setStockUnit('كجم'); setStockPrice(''); setStockSupplier(''); setStockExpiry(''); setStockNotes('');
      showToast('success', 'تم إضافة المخزون بنجاح');
      fetchAll();
    } catch (err: unknown) { Alert.alert('خطأ', err instanceof Error ? err.message : 'فشل إضافة المخزون'); }
    finally { setStockSubmitting(false); }
  };

  const handleAddSchedule = async () => {
    if (!schFeedTypeId) { Alert.alert('خطأ', 'اختر نوع العلف'); return; }
    if (!schPenId) { Alert.alert('خطأ', 'اختر الحظيرة'); return; }
    const amt = validateNumber(schAmount, 'الكمية', { min: 0.1 });
    if (amt === null) return;
    setSchSubmitting(true);
    try {
      await feedsApi.createSchedule({ feedTypeId: schFeedTypeId, penId: schPenId, dailyAmount: amt, feedingTimes: parseInt(schMeals) || 2, startDate: todayStr(), notes: schNotes.trim() || undefined });
      setAddScheduleVisible(false);
      setSchFeedTypeId(''); setSchPenId(''); setSchAmount(''); setSchMeals('2'); setSchNotes('');
      showToast('success', 'تم إضافة الجدول بنجاح');
      fetchAll();
    } catch (err: unknown) { Alert.alert('خطأ', err instanceof Error ? err.message : 'فشل إضافة الجدول'); }
    finally { setSchSubmitting(false); }
  };

  const executeConsumption = () => {
    Alert.alert('تنفيذ صرف الأعلاف', 'سيتم خصم الكميات من المخزون حسب الجداول النشطة.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تنفيذ', style: 'destructive', onPress: async () => {
        setConsuming(true);
        try {
          const res = await feedsApi.consumeToday(todayStr()) as Record<string, unknown>;
          showToast('success', (res.message as string) || 'تم صرف الأعلاف بنجاح');
          fetchAll();
        } catch (err: unknown) { Alert.alert('خطأ', err instanceof Error ? err.message : 'فشل تنفيذ الصرف'); }
        finally { setConsuming(false); }
      }},
    ]);
  };

  const deleteSchedule = (s: Schedule) => {
    Alert.alert('حذف الجدول', `حذف جدول "${s.feedType?.nameAr}"?`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        try { await feedsApi.deleteSchedule(s.id); showToast('success', 'تم حذف الجدول'); fetchAll(); }
        catch (err: unknown) { Alert.alert('خطأ', err instanceof Error ? err.message : 'فشل الحذف'); }
      }},
    ]);
  };

  const filteredFeeds = useMemo(() =>
    search.trim() ? feeds.filter(f => f.nameAr?.toLowerCase().includes(search.toLowerCase()) || f.supplier?.toLowerCase().includes(search.toLowerCase())) : feeds
  , [search, feeds]);

  // ─── Render Helpers ───
  const renderFeedCard = useCallback(({ item }: { item: Feed }) => {
    const isLowStock = item.reorderLevel && item.currentStock !== undefined && item.currentStock <= item.reorderLevel;
    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardNameRow}>
            <View style={[styles.cardIcon, { backgroundColor: Colors.warning + '15' }]}>
              <Ionicons name={CATEGORY_ICONS[item.category] || 'nutrition'} size={20} color={Colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.nameAr}</Text>
              <Text style={styles.cardSub}>{CATEGORIES.find(c => c.key === item.category)?.label || item.category}</Text>
            </View>
          </View>
          {isLowStock && (
            <View style={styles.lowBadge}><Ionicons name="warning" size={14} color={Colors.error} /><Text style={styles.lowBadgeText}>منخفض</Text></View>
          )}
        </View>
        <View style={styles.statsRow}>
          {item.currentStock !== undefined && (
            <View style={styles.stat}><Text style={styles.statLabel}>المخزون</Text><Text style={[styles.statValue, isLowStock ? { color: Colors.error } : undefined]}>{western(item.currentStock)} كجم</Text></View>
          )}
          {item.protein != null && (
            <View style={styles.stat}><Text style={styles.statLabel}>بروتين</Text><Text style={styles.statValue}>{western(item.protein)}%</Text></View>
          )}
          {item.unitPrice != null && (
            <View style={styles.stat}><Text style={styles.statLabel}>السعر</Text><Text style={styles.statValue}>{western(item.unitPrice)} د.إ</Text></View>
          )}
        </View>
      </View>
    );
  }, []);

  const renderStockCard = useCallback(({ item }: { item: StockEntry }) => {
    const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
    return (
      <View style={[styles.card, isExpired && { borderColor: Colors.error, borderWidth: 1 }]}>
        <View style={styles.cardRow}>
          <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{item.feedType?.nameAr || '-'}</Text><Text style={styles.cardSub}>{item.supplier || 'بدون مورد'}</Text></View>
          <View style={{ alignItems: 'flex-end' }}><Text style={[styles.statValue, { fontSize: 18 }]}>{western(item.quantity)} {item.unit}</Text>{item.cost ? <Text style={styles.cardSub}>{western(item.cost)} د.إ</Text> : null}</View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statLabel}>الشراء</Text><Text style={styles.statValue}>{formatDate(item.purchaseDate)}</Text></View>
          {item.expiryDate && <View style={styles.stat}><Text style={styles.statLabel}>الانتهاء</Text><Text style={[styles.statValue, isExpired ? { color: Colors.error } : undefined]}>{isExpired ? 'منتهي!' : formatDate(item.expiryDate)}</Text></View>}
        </View>
      </View>
    );
  }, []);

  const renderScheduleCard = useCallback(({ item }: { item: Schedule }) => {
    const heads = item.goat ? 1 : (item.pen?._count?.goats || 0);
    const totalDaily = item.quantity * heads;
    const target = item.goat ? `${item.goat.tagId} — ${item.goat.name || ''}` : (item.pen?.nameAr || 'غير محدد');
    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{target}</Text><Text style={styles.cardSub}>{item.feedType?.nameAr || '-'}</Text></View>
          <TouchableOpacity onPress={() => deleteSchedule(item)} style={styles.deleteBtn}><Ionicons name="trash-outline" size={18} color={Colors.error} /></TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statLabel}>الرؤوس</Text><Text style={styles.statValue}>{western(heads)}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>كجم/رأس</Text><Text style={styles.statValue}>{western(item.quantity)}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>الوجبات</Text><Text style={styles.statValue}>{western(item.frequency)}×</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>الإجمالي</Text><Text style={[styles.statValue, { color: Colors.primary }]}>{western(totalDaily.toFixed(1))} كجم</Text></View>
        </View>
      </View>
    );
  }, []);

  const renderHistoryCard = useCallback(({ item }: { item: ConsumptionDay }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Text style={styles.cardTitle}>{formatDate(item.date)}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={[styles.chipBadge, { backgroundColor: Colors.primary + '15' }]}><Text style={[styles.chipBadgeText, { color: Colors.primary }]}>{western(item.totalQty?.toFixed(1) || '0')} كجم</Text></View>
          <View style={[styles.chipBadge, { backgroundColor: Colors.warning + '15' }]}><Text style={[styles.chipBadgeText, { color: Colors.warning }]}>{western(item.totalCost?.toFixed(0) || '0')} د.إ</Text></View>
        </View>
      </View>
      {(item.items || []).map((sub, idx) => (
        <View key={idx} style={styles.histItem}><Text style={styles.histText}>{sub.feedType} — {sub.pen || 'عام'}</Text><Text style={styles.histQty}>{western(sub.quantity?.toFixed(1))} كجم</Text></View>
      ))}
    </View>
  ), []);

  // Picker Components
  const FeedTypePicker = ({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) => (
    <View><Text style={styles.fieldLabel}>نوع العلف *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
        {feeds.map(f => (<TouchableOpacity key={f.id} style={[styles.pickerChip, selectedId === f.id && styles.pickerChipActive]} onPress={() => onSelect(f.id)}><Text style={[styles.pickerChipText, selectedId === f.id && { color: '#fff' }]}>{f.nameAr}</Text></TouchableOpacity>))}
      </ScrollView>
    </View>
  );
  const PenPicker = ({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) => (
    <View><Text style={styles.fieldLabel}>الحظيرة *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
        {pens.map(p => (<TouchableOpacity key={p.id} style={[styles.pickerChip, selectedId === p.id && styles.pickerChipActive]} onPress={() => onSelect(p.id)}><Text style={[styles.pickerChipText, selectedId === p.id && { color: '#fff' }]}>{p.nameAr} ({western(p._count?.goats || 0)})</Text></TouchableOpacity>))}
      </ScrollView>
    </View>
  );

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;

  return (
    <>
      <Stack.Screen options={{ title: 'إدارة الأعلاف', headerShown: true,  headerTintColor: Colors.primary, headerTitleStyle: { ...Typography.h4, color: Colors.text }, headerTitleAlign: 'center' }} />
      <View style={styles.container}>
        {/* ─── Tabs ─── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} style={[styles.tab, activeTab === t.key && styles.tabActive]} onPress={() => setActiveTab(t.key)}>
              <Ionicons name={t.icon} size={16} color={activeTab === t.key ? '#fff' : Colors.textSecondary} />
              <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ═══ TAB: TODAY ═══ */}
        {activeTab === 'today' && (
          <FlatList data={todayFeedings} keyExtractor={(_, i) => String(i)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
            ListHeaderComponent={
              <View style={{ padding: Spacing.lg }}>
                <View style={styles.summaryStrip}>
                  <View style={styles.summaryItem}><Text style={styles.summaryVal}>{western(schedules.filter(s => s.isActive).length)}</Text><Text style={styles.summaryLbl}>جداول</Text></View>
                  <View style={styles.summaryItem}><Text style={styles.summaryVal}>{western(todayTotalHeads)}</Text><Text style={styles.summaryLbl}>رأس</Text></View>
                  <View style={styles.summaryItem}><Text style={[styles.summaryVal, { color: Colors.success }]}>{western(todayTotalKg.toFixed(1))}</Text><Text style={styles.summaryLbl}>كجم/يوم</Text></View>
                </View>
                {todayFeedings.length > 0 && can('__owner_admin__') && (
                  <TouchableOpacity style={[styles.consumeBtn, consuming && { opacity: 0.6 }]} onPress={executeConsumption} disabled={consuming} activeOpacity={0.8}>
                    {consuming ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark-done-circle" size={22} color="#fff" />}
                    <Text style={styles.consumeBtnText}>{consuming ? 'جاري التنفيذ...' : 'تنفيذ صرف اليوم'}</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.sectionTitle}>خطة التغذية اليوم</Text>
              </View>
            }
            renderItem={({ item: p }) => {
              const penKg = p.items.reduce((s, i) => s + i.amount * p.heads, 0);
              return (
                <View style={[styles.card, { marginHorizontal: Spacing.lg }]}>
                  <View style={styles.cardRow}>
                    <View style={styles.cardNameRow}>
                      <View style={[styles.cardIcon, { backgroundColor: Colors.primary + '15' }]}><Ionicons name="home" size={18} color={Colors.primary} /></View>
                      <View><Text style={styles.cardTitle}>{p.pen}</Text><Text style={styles.cardSub}>{western(p.heads)} رأس</Text></View>
                    </View>
                    <Text style={[styles.statValue, { color: Colors.primary }]}>{western(penKg.toFixed(1))} كجم</Text>
                  </View>
                  {p.items.map((item, i) => (
                    <View key={i} style={styles.todayItem}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name={CATEGORY_ICONS[item.category] || 'nutrition'} size={14} color={Colors.textSecondary} />
                        <Text style={styles.todayText}>{item.feed}</Text>
                      </View>
                      <Text style={styles.todayQty}>{western(item.amount)} كجم × {western(item.meals)} وجبات</Text>
                    </View>
                  ))}
                </View>
              );
            }}
            ListEmptyComponent={<EmptyState icon="calendar" title="لا توجد جداول نشطة" message="أنشئ جدول تغذية أولاً من تبويب الجداول" />}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}

        {/* ═══ TAB: TYPES ═══ */}
        {activeTab === 'types' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {CATEGORIES.map(c => (<TouchableOpacity key={c.key} style={[styles.filterTab, category === c.key && styles.filterTabActive]} onPress={() => setCategory(c.key)}><Text style={[styles.filterTabText, category === c.key && styles.filterTabTextActive]}>{c.label}</Text></TouchableOpacity>))}
            </ScrollView>
            <SearchBar value={search} onChangeText={setSearch} placeholder="بحث بالاسم أو المورد..." />
            <FlatList data={filteredFeeds} renderItem={renderFeedCard} keyExtractor={item => item.id} contentContainerStyle={styles.listPad}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
              ListEmptyComponent={<EmptyState icon="nutrition" title="لا يوجد أعلاف" message="أضف نوع علف جديد" />}
              ListFooterComponent={
                <TouchableOpacity style={styles.recipesLink} onPress={() => router.push('/feed-recipes')}>
                  <Ionicons name="beaker" size={18} color={Colors.primary} /><Text style={styles.recipesLinkText}>خلطات الأعلاف</Text><Ionicons name="chevron-back" size={16} color={Colors.primary} />
                </TouchableOpacity>
              }
            />
          </>
        )}

        {/* ═══ TAB: STOCK ═══ */}
        {activeTab === 'stock' && (
          <>
            {stockByType.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: 8 }}>
                {stockByType.map((s, i) => (<View key={i} style={[styles.chipBadge, { backgroundColor: s.isLow ? Colors.error + '15' : Colors.success + '15', paddingHorizontal: 12, paddingVertical: 6 }]}><Text style={[styles.chipBadgeText, { color: s.isLow ? Colors.error : Colors.success }]}>{s.name}: {western(s.qty.toFixed(0))} كجم</Text></View>))}
              </ScrollView>
            )}
            <FlatList data={stockEntries} renderItem={renderStockCard} keyExtractor={item => item.id} contentContainerStyle={styles.listPad}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
              ListEmptyComponent={<EmptyState icon="cube" title="لا يوجد مخزون" message="أضف للمخزون" action={{ title: 'إضافة مخزون', onPress: () => setAddStockVisible(true) }} />}
            />
          </>
        )}

        {/* ═══ TAB: SCHEDULES ═══ */}
        {activeTab === 'schedules' && (
          <FlatList data={schedules} renderItem={renderScheduleCard} keyExtractor={item => item.id} contentContainerStyle={styles.listPad}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
            ListEmptyComponent={<EmptyState icon="calendar" title="لا توجد جداول" message="أنشئ جدول تغذية" action={{ title: 'إضافة جدول', onPress: () => setAddScheduleVisible(true) }} />}
          />
        )}

        {/* ═══ TAB: HISTORY ═══ */}
        {activeTab === 'history' && (
          <FlatList data={history} renderItem={renderHistoryCard} keyExtractor={item => item.date} contentContainerStyle={styles.listPad}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
            ListEmptyComponent={<EmptyState icon="time" title="لا يوجد سجل" message="سيظهر بعد تنفيذ الصرف اليومي" />}
          />
        )}

        {/* ─── FABs ─── */}
        {can('__owner_admin__') && activeTab === 'types' && (
          <TouchableOpacity style={styles.fab} onPress={() => setAddTypeVisible(true)} activeOpacity={0.8}><Ionicons name="add" size={28} color="#fff" /></TouchableOpacity>
        )}
        {can('__owner_admin__') && activeTab === 'stock' && (
          <TouchableOpacity style={[styles.fab, { backgroundColor: Colors.secondary || Colors.primary }]} onPress={() => { if (!feeds.length) { Alert.alert('تنبيه', 'أضف نوع علف أولاً'); return; } setStockFeedTypeId(feeds[0]?.id || ''); setAddStockVisible(true); }} activeOpacity={0.8}><Ionicons name="add" size={28} color="#fff" /></TouchableOpacity>
        )}
        {can('__owner_admin__') && activeTab === 'schedules' && (
          <TouchableOpacity style={[styles.fab, { backgroundColor: Colors.success }]} onPress={() => { if (!feeds.length || !pens.length) { Alert.alert('تنبيه', 'تحتاج أنواع أعلاف وحظائر أولاً'); return; } setSchFeedTypeId(feeds[0]?.id || ''); setSchPenId(pens[0]?.id || ''); setAddScheduleVisible(true); }} activeOpacity={0.8}><Ionicons name="add" size={28} color="#fff" /></TouchableOpacity>
        )}

        {/* ═══ MODAL: Add Feed Type ═══ */}
        <Modal visible={addTypeVisible} animationType="slide" presentationStyle="pageSheet">
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.mHead}><TouchableOpacity onPress={() => setAddTypeVisible(false)}><Text style={styles.mCancel}>إلغاء</Text></TouchableOpacity><Text style={styles.mTitle}>إضافة علف</Text><View style={{ width: 50 }} /></View>
            <ScrollView contentContainerStyle={styles.mContent} keyboardShouldPersistTaps="handled">
              <Input label="اسم العلف *" placeholder="مثال: شعير" icon="nutrition-outline" value={formName} onChangeText={setFormName} />
              <Text style={styles.fieldLabel}>الفئة</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.filter(c => c.key !== 'ALL').map(c => (<TouchableOpacity key={c.key} style={[styles.pickerChip, formCategory === c.key && styles.pickerChipActive]} onPress={() => setFormCategory(c.key)}><Text style={[styles.pickerChipText, formCategory === c.key && { color: '#fff' }]}>{c.label}</Text></TouchableOpacity>))}
              </View>
              <Input label="نسبة البروتين %" placeholder="0" icon="flask-outline" value={formProtein} onChangeText={setFormProtein} keyboardType="decimal-pad" />
              <Input label="الطاقة" placeholder="0" icon="flash-outline" value={formEnergy} onChangeText={setFormEnergy} keyboardType="decimal-pad" />
              <Input label="سعر الوحدة" placeholder="0" icon="pricetag-outline" value={formPrice} onChangeText={setFormPrice} keyboardType="decimal-pad" />
              <Input label="حد إعادة الطلب" placeholder="0" icon="alert-circle-outline" value={formReorder} onChangeText={setFormReorder} keyboardType="number-pad" />
              <Input label="المورد" placeholder="اسم المورد" icon="business-outline" value={formSupplier} onChangeText={setFormSupplier} />
              <Input label="الوصف" placeholder="وصف العلف" icon="document-text-outline" value={formDesc} onChangeText={setFormDesc} multiline />
              <Button title="إضافة العلف" onPress={handleAddType} loading={submitting} fullWidth size="lg" icon="checkmark-circle-outline" />
              <View style={{ height: 100 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {/* ═══ MODAL: Add Stock ═══ */}
        <Modal visible={addStockVisible} animationType="slide" presentationStyle="pageSheet">
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.mHead}><TouchableOpacity onPress={() => setAddStockVisible(false)}><Text style={styles.mCancel}>إلغاء</Text></TouchableOpacity><Text style={styles.mTitle}>إضافة مخزون</Text><View style={{ width: 50 }} /></View>
            <ScrollView contentContainerStyle={styles.mContent} keyboardShouldPersistTaps="handled">
              <FeedTypePicker selectedId={stockFeedTypeId} onSelect={setStockFeedTypeId} />
              <Input label="الكمية *" placeholder="100" icon="cube-outline" value={stockQty} onChangeText={setStockQty} keyboardType="decimal-pad" />
              <Input label="الوحدة" placeholder="كجم" icon="resize-outline" value={stockUnit} onChangeText={setStockUnit} />
              <Input label="سعر الوحدة" placeholder="0" icon="pricetag-outline" value={stockPrice} onChangeText={setStockPrice} keyboardType="decimal-pad" />
              <Input label="المورد" placeholder="اسم المورد" icon="business-outline" value={stockSupplier} onChangeText={setStockSupplier} />
              <Input label="تاريخ الانتهاء (YYYY-MM-DD)" placeholder="2026-12-31" icon="calendar-outline" value={stockExpiry} onChangeText={setStockExpiry} />
              <Input label="ملاحظات" placeholder="" icon="document-text-outline" value={stockNotes} onChangeText={setStockNotes} multiline />
              <Button title="إضافة للمخزون" onPress={handleAddStock} loading={stockSubmitting} fullWidth size="lg" icon="checkmark-circle-outline" />
              <View style={{ height: 100 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {/* ═══ MODAL: Add Schedule ═══ */}
        <Modal visible={addScheduleVisible} animationType="slide" presentationStyle="pageSheet">
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.mHead}><TouchableOpacity onPress={() => setAddScheduleVisible(false)}><Text style={styles.mCancel}>إلغاء</Text></TouchableOpacity><Text style={styles.mTitle}>إضافة جدول تغذية</Text><View style={{ width: 50 }} /></View>
            <ScrollView contentContainerStyle={styles.mContent} keyboardShouldPersistTaps="handled">
              <FeedTypePicker selectedId={schFeedTypeId} onSelect={setSchFeedTypeId} />
              <PenPicker selectedId={schPenId} onSelect={setSchPenId} />
              <Input label="كجم / رأس / يوم *" placeholder="1.5" icon="speedometer-outline" value={schAmount} onChangeText={setSchAmount} keyboardType="decimal-pad" />
              <Input label="عدد الوجبات" placeholder="2" icon="restaurant-outline" value={schMeals} onChangeText={setSchMeals} keyboardType="number-pad" />
              <Input label="ملاحظات" placeholder="" icon="document-text-outline" value={schNotes} onChangeText={setSchNotes} multiline />
              <Button title="إنشاء الجدول" onPress={handleAddSchedule} loading={schSubmitting} fullWidth size="lg" icon="checkmark-circle-outline" />
              <View style={{ height: 100 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  // Tabs
  tabBar: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { ...Typography.small, color: Colors.textSecondary },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  // Filter
  filterRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm },
  filterTab: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterTabActive: { backgroundColor: Colors.warning, borderColor: Colors.warning },
  filterTabText: { ...Typography.small, color: Colors.textSecondary },
  filterTabTextActive: { color: '#fff', fontWeight: '600' },
  // List
  listPad: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  // Cards
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  cardIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { ...Typography.bodyBold, color: Colors.text },
  cardSub: { ...Typography.small, color: Colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  stat: { minWidth: '30%' },
  statLabel: { ...Typography.small, color: Colors.textSecondary },
  statValue: { ...Typography.captionBold, color: Colors.text, marginTop: 2 },
  deleteBtn: { padding: 8, borderRadius: Radius.md, backgroundColor: Colors.error + '10' },
  // Today
  summaryStrip: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.sm },
  summaryItem: { alignItems: 'center' },
  summaryVal: { ...Typography.h3, color: Colors.primary, fontWeight: '700' },
  summaryLbl: { ...Typography.small, color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.sm },
  consumeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.success, paddingVertical: 14, borderRadius: Radius.lg, marginBottom: Spacing.lg, ...Shadows.md },
  consumeBtnText: { ...Typography.bodyBold, color: '#fff' },
  todayItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  todayText: { ...Typography.caption, color: Colors.text },
  todayQty: { ...Typography.small, color: Colors.textSecondary },
  // Badges
  chipBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  chipBadgeText: { ...Typography.small, fontWeight: '600' },
  lowBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.error + '12', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full },
  lowBadgeText: { ...Typography.small, color: Colors.error },
  // History
  histItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  histText: { ...Typography.small, color: Colors.textSecondary },
  histQty: { ...Typography.small, color: Colors.text, fontWeight: '600' },
  // Link
  recipesLink: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary + '10', padding: Spacing.md, marginTop: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primary + '30' },
  recipesLinkText: { ...Typography.caption, color: Colors.primary, fontWeight: '600', flex: 1, textAlign: 'right' },
  // FAB
  fab: { position: 'absolute', bottom: 24, start: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.warning, justifyContent: 'center', alignItems: 'center', ...Shadows.lg },
  // Modal
  mHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, backgroundColor: Colors.surface },
  mTitle: { ...Typography.h4, color: Colors.text },
  mCancel: { ...Typography.captionBold, color: Colors.error },
  mContent: { padding: Spacing.xl },
  fieldLabel: { ...Typography.captionBold, color: Colors.text, marginBottom: Spacing.sm, textAlign: 'right' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  pickerChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  pickerChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pickerChipText: { ...Typography.small, color: Colors.textSecondary },
});
