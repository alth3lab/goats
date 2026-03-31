import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { stockApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LoadingScreen, EmptyState, Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { western } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import { SearchBar } from '@/components/SearchBar';

// ─── Types ────────────────────────────────────────────────
type StockType = 'FEED' | 'MEDICINE' | 'VACCINE' | 'EQUIPMENT' | 'SUPPLY';
type MovementType = 'PURCHASE' | 'FEED_USAGE' | 'USAGE' | 'ADJUSTMENT' | 'EXPIRED' | 'RETURN';

interface StockItem {
  id: string;
  nameAr: string;
  name: string;
  type: StockType;
  feedCategory?: string;
  unit: string;
  currentStock: number;
  minStock?: number;
  unitPrice?: number;
  supplier?: string;
  notes?: string;
  isActive: boolean;
}

// ─── Constants ────────────────────────────────────────────
const STOCK_TYPES: { key: StockType | 'ALL'; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'ALL',       label: 'الكل',       icon: 'apps',          color: Colors.textSecondary },
  { key: 'FEED',      label: 'أعلاف',      icon: 'nutrition',     color: '#22c55e' },
  { key: 'MEDICINE',  label: 'أدوية',      icon: 'medical',       color: '#ef4444' },
  { key: 'VACCINE',   label: 'لقاحات',     icon: 'shield-checkmark', color: '#8b5cf6' },
  { key: 'EQUIPMENT', label: 'معدات',      icon: 'construct',     color: '#f59e0b' },
  { key: 'SUPPLY',    label: 'مستلزمات',   icon: 'cube',          color: '#06b6d4' },
];

const MOVEMENT_LABELS: Record<MovementType, string> = {
  PURCHASE:   'شراء / إضافة',
  FEED_USAGE: 'استهلاك علف',
  USAGE:      'استهلاك',
  ADJUSTMENT: 'تسوية',
  EXPIRED:    'منتهي الصلاحية',
  RETURN:     'إرجاع',
};

const OUT_MOVEMENTS: MovementType[] = ['FEED_USAGE', 'USAGE', 'EXPIRED'];

function isLowStock(item: StockItem) {
  return item.minStock != null && item.currentStock <= item.minStock;
}

// ─── Movement Form Modal ──────────────────────────────────
function MovementModal({
  item,
  visible,
  onClose,
  onSuccess,
}: {
  item: StockItem | null;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [type, setType] = useState<MovementType>('PURCHASE');
  const [qty, setQty] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setType('PURCHASE');
      setQty('');
      setUnitCost('');
      setNotes('');
    }
  }, [item?.id]);

  const movementTypes: MovementType[] =
    item?.type === 'FEED'
      ? ['PURCHASE', 'FEED_USAGE', 'ADJUSTMENT', 'EXPIRED', 'RETURN']
      : ['PURCHASE', 'USAGE', 'ADJUSTMENT', 'EXPIRED', 'RETURN'];

  const handleSubmit = async () => {
    if (!item) return;
    const qtyNum = parseFloat(qty);
    if (!qty || isNaN(qtyNum) || qtyNum <= 0) {
      showToast('error', 'أدخل كمية صحيحة أكبر من صفر');
      return;
    }
    setLoading(true);
    try {
      await stockApi.addMovement({
        itemId: item.id,
        type,
        qty: qtyNum,
        unitCost: unitCost ? parseFloat(unitCost) : undefined,
        notes: notes || undefined,
      });
      showToast('success', 'تم تسجيل الحركة بنجاح');
      setQty('');
      setUnitCost('');
      setNotes('');
      onSuccess();
    } catch (e: any) {
      showToast('error', e?.message || 'فشل في تسجيل الحركة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>حركة مخزون — {item?.nameAr}</Text>

          {/* Movement type selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
            {movementTypes.map(mt => (
              <TouchableOpacity
                key={mt}
                style={[styles.typeChip, type === mt && styles.typeChipActive]}
                onPress={() => setType(mt)}
              >
                <Text style={[styles.typeChipText, type === mt && styles.typeChipTextActive]}>
                  {MOVEMENT_LABELS[mt]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Input
            label="الكمية *"
            value={qty}
            onChangeText={setQty}
            keyboardType="decimal-pad"
            placeholder={`بـ ${item?.unit ?? 'وحدة'}`}
          />

          {['PURCHASE', 'RETURN'].includes(type) && (
            <Input
              label="سعر الوحدة (اختياري)"
              value={unitCost}
              onChangeText={setUnitCost}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          )}

          <Input
            label="ملاحظات (اختياري)"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />

          <View style={styles.modalActions}>
            <Button title="إلغاء" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            <Button title={OUT_MOVEMENTS.includes(type) ? 'تسجيل صرف' : 'تسجيل إضافة'} onPress={handleSubmit} loading={loading} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Add / Edit Item Modal ────────────────────────────────
function ItemFormModal({
  visible,
  onClose,
  onSuccess,
  initialType,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialType: StockType;
}) {
  const [nameAr, setNameAr] = useState('');
  const [type, setType] = useState<StockType>(initialType);
  const [unit, setUnit] = useState('كجم');

  // Keep type in sync with parent tab selection
  useEffect(() => { setType(initialType); }, [initialType]);
  const [minStock, setMinStock] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const editableTypes: StockType[] = ['FEED', 'MEDICINE', 'VACCINE', 'EQUIPMENT', 'SUPPLY'];

  const handleSubmit = async () => {
    if (!nameAr.trim()) {
      showToast('error', 'الاسم بالعربية مطلوب');
      return;
    }
    setLoading(true);
    try {
      await stockApi.create({
        nameAr: nameAr.trim(),
        type,
        unit,
        minStock: minStock || undefined,
        unitPrice: unitPrice || undefined,
        supplier: supplier || undefined,
        notes: notes || undefined,
      });
      showToast('success', 'تمت الإضافة بنجاح');
      setNameAr(''); setUnit('كجم'); setMinStock(''); setUnitPrice(''); setSupplier(''); setNotes('');
      onSuccess();
    } catch (e: any) {
      showToast('error', e?.message || 'فشل في الإضافة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <ScrollView>
          <View style={[styles.modalSheet, { marginTop: 60 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>إضافة مادة جديدة</Text>

            <Input
              label="الاسم بالعربية *"
              value={nameAr}
              onChangeText={setNameAr}
              placeholder="مثال: برسيم — بنسلين — محقنة"
            />

            {/* Type selector */}
            <Text style={styles.fieldLabel}>التصنيف *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              {editableTypes.map(t => {
                const meta = STOCK_TYPES.find(s => s.key === t)!;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, type === t && styles.typeChipActive]}
                    onPress={() => setType(t)}
                  >
                    <Ionicons name={meta.icon} size={14} color={type === t ? '#fff' : meta.color} />
                    <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}> {meta.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Input label="الوحدة" value={unit} onChangeText={setUnit} placeholder="كجم / لتر / حبة / علبة" />
            <Input label="الحد الأدنى للمخزون" value={minStock} onChangeText={setMinStock} keyboardType="decimal-pad" />
            <Input label="سعر الوحدة" value={unitPrice} onChangeText={setUnitPrice} keyboardType="decimal-pad" />
            <Input label="المورد" value={supplier} onChangeText={setSupplier} />
            <Input label="ملاحظات" value={notes} onChangeText={setNotes} multiline numberOfLines={2} />

            <View style={styles.modalActions}>
              <Button title="إلغاء" variant="outline" onPress={onClose} style={{ flex: 1 }} />
              <Button title="إضافة" onPress={handleSubmit} loading={loading} style={{ flex: 1 }} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Stock Card ───────────────────────────────────────────
function StockCard({
  item,
  onMovement,
}: {
  item: StockItem;
  onMovement: (item: StockItem) => void;
}) {
  const low = isLowStock(item);
  const meta = STOCK_TYPES.find(t => t.key === item.type) ?? STOCK_TYPES[0];

  return (
    <View style={[styles.card, low && styles.cardLow]}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeTag, { backgroundColor: `${meta.color}22` }]}>
          <Ionicons name={meta.icon} size={13} color={meta.color} />
          <Text style={[styles.typeTagText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        {low && (
          <View style={styles.lowBadge}>
            <Ionicons name="warning" size={12} color="#ef4444" />
            <Text style={styles.lowText}>مخزون منخفض</Text>
          </View>
        )}
      </View>

      <Text style={styles.cardName}>{item.nameAr}</Text>

      <View style={styles.cardRow}>
        <Text style={styles.stockValue}>{western(item.currentStock)} {item.unit}</Text>
        {item.minStock != null && (
          <Text style={styles.minStockText}>الحد الأدنى: {western(item.minStock)}</Text>
        )}
      </View>

      {item.unitPrice != null && (
        <Text style={styles.priceText}>سعر الوحدة: {western(item.unitPrice)} ر.ع.</Text>
      )}
      {item.supplier && (
        <Text style={styles.supplierText}>المورد: {item.supplier}</Text>
      )}

      <TouchableOpacity style={styles.movementBtn} onPress={() => onMovement(item)}>
        <Ionicons name="swap-horizontal" size={16} color={'#fff'} />
        <Text style={styles.movementBtnText}>تسجيل حركة</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────
export default function StockScreen() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeType, setActiveType] = useState<StockType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [movementTarget, setMovementTarget] = useState<StockItem | null>(null);
  const [addVisible, setAddVisible] = useState(false);
  const { can } = useAuth();

  const loadItems = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (activeType !== 'ALL') params.type = activeType;
      const data = await stockApi.list(params);
      setItems(data as unknown as StockItem[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeType]);

  useFocusEffect(useCallback(() => { setLoading(true); loadItems(); }, [loadItems]));

  const filtered = items.filter(i =>
    !search || i.nameAr.includes(search) || (i.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'المواد والمخزون',
          headerStyle: { backgroundColor: Colors.primary },
          headerTitleStyle: { color: '#fff', fontFamily: 'Cairo-Bold' },
          headerTintColor: '#fff',
          headerShadowVisible: false,
          headerRight: can('add_inventory')
            ? () => (
                <TouchableOpacity onPress={() => setAddVisible(true)} style={{ marginLeft: 12 }}>
                  <Ionicons name="add-circle" size={28} color={'#fff'} />
                </TouchableOpacity>
              )
            : undefined,
        }}
      />

      {/* Type filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: Spacing.md }}
      >
        {STOCK_TYPES.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.filterTab, activeType === t.key && styles.filterTabActive]}
            onPress={() => setActiveType(t.key as StockType | 'ALL')}
          >
            <Ionicons name={t.icon} size={14} color={activeType === t.key ? '#fff' : t.color} />
            <Text style={[styles.filterTabText, activeType === t.key && styles.filterTabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <SearchBar value={search} onChangeText={setSearch} placeholder="بحث في المواد…" />

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <StockCard item={item} onMovement={setMovementTarget} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadItems(); }} />}
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title={search ? 'لا توجد نتائج' : 'لا توجد مواد بعد'}
            message={search ? 'جرّب بحثاً آخر' : 'اضغط + لإضافة مادة أو علف جديد'}
          />
        }
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
      />

      {/* Movement modal */}
      <MovementModal
        item={movementTarget}
        visible={!!movementTarget}
        onClose={() => setMovementTarget(null)}
        onSuccess={() => { setMovementTarget(null); loadItems(); }}
      />

      {/* Add item modal */}
      <ItemFormModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSuccess={() => { setAddVisible(false); loadItems(); }}
        initialType={activeType === 'ALL' ? 'FEED' : activeType}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  filterRow: { backgroundColor: Colors.surface, paddingVertical: Spacing.sm, maxHeight: 52 },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginRight: 6,
    backgroundColor: Colors.surface,
    gap: 4,
  },
  filterTabActive: { backgroundColor: Colors.primary },
  filterTabText: { ...Typography.caption, color: Colors.textSecondary },
  filterTabTextActive: { color: '#fff', fontFamily: 'Cairo-SemiBold' },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  cardLow: { borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    gap: 4,
  },
  typeTagText: { ...Typography.caption, fontFamily: 'Cairo-SemiBold' },
  lowBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lowText: { ...Typography.caption, color: '#ef4444', fontFamily: 'Cairo-SemiBold' },

  cardName: { ...Typography.h4, color: Colors.text, marginBottom: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 },
  stockValue: { ...Typography.h3, color: Colors.primary, fontFamily: 'Cairo-Bold' },
  minStockText: { ...Typography.caption, color: Colors.textSecondary },
  priceText: { ...Typography.caption, color: Colors.textSecondary },
  supplierText: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 8 },

  movementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    gap: 6,
    marginTop: 8,
  },
  movementBtnText: { color: '#fff', fontFamily: 'Cairo-SemiBold', fontSize: 13 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: Spacing.md,
  },
  modalTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.md, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },

  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 6,
    backgroundColor: Colors.surface,
  },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipText: { ...Typography.caption, color: Colors.textSecondary },
  typeChipTextActive: { color: '#fff', fontFamily: 'Cairo-SemiBold' },

  fieldLabel: { ...Typography.captionBold, color: Colors.textSecondary, marginBottom: 6 },
});
