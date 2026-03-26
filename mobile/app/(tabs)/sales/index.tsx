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
import { Ionicons } from '@expo/vector-icons';
import { salesApi, resolveGoatByTag } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LoadingScreen, EmptyState, Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows, PaymentStatusLabels } from '@/lib/theme';
import { formatDate, formatNumber } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import { SearchBar } from '@/components/SearchBar';
import { validateNumber, validateDate, validateRequired } from '@/lib/validation';
import type { Sale } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  PAID: Colors.success,
  PARTIAL: Colors.warning,
  PENDING: Colors.error,
};

export default function SalesScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [search, setSearch] = useState('');
  const { showToast } = useToast();
  const { can } = useAuth();

  // Add form
  const [formGoatTag, setFormGoatTag] = useState('');
  const [formBuyer, setFormBuyer] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formPaid, setFormPaid] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSales = useCallback(async () => {
    try {
      const data = await salesApi.list();
      setSales(data as unknown as Sale[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل المبيعات';
      showToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const totalRevenue = sales.reduce((sum, s) => sum + (s.salePrice || 0), 0);
  const totalCollected = sales.reduce((sum, s) => sum + (s.totalPaid || 0), 0);
  const totalPending = totalRevenue - totalCollected;

  const handleAdd = async () => {
    if (!validateRequired(formGoatTag, 'رقم الحيوان')) return;
    if (!validateRequired(formBuyer, 'اسم المشتري')) return;
    const price = validateNumber(formPrice, 'السعر', { required: true, min: 0.01 });
    if (price === null) return;
    if (!validateDate(formDate, 'التاريخ', { required: true })) return;
    if (formPaid) {
      const paid = validateNumber(formPaid, 'المبلغ المدفوع', { min: 0, max: price as number });
      if (paid === null) return;
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
        buyerName: formBuyer.trim(),
        salePrice: parseFloat(formPrice),
        date: formDate,
      };
      if (formPhone.trim()) body.buyerPhone = formPhone.trim();
      if (formPaid) body.paidAmount = parseFloat(formPaid);
      if (formNotes.trim()) body.notes = formNotes.trim();

      await salesApi.create(body);
      setAddVisible(false);
      resetForm();
      fetchSales();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل تسجيل البيع';
      Alert.alert('خطأ', message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormGoatTag('');
    setFormBuyer('');
    setFormPhone('');
    setFormPrice('');
    setFormPaid('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNotes('');
  };

  const renderSale = ({ item }: { item: Sale }) => {
    const statusColor = STATUS_COLORS[item.paymentStatus] || Colors.textSecondary;
    return (
      <View style={styles.saleCard}>
        <View style={styles.saleTop}>
          <View style={styles.saleTagRow}>
            <Ionicons name="paw" size={16} color={Colors.primary} />
            <Text style={styles.saleTag}>{item.goat?.tagId || '—'}</Text>
          </View>
          <View style={[styles.paymentBadge, { backgroundColor: statusColor + '15' }]}>
            <Text style={[styles.paymentText, { color: statusColor }]}>
              {PaymentStatusLabels[item.paymentStatus]}
            </Text>
          </View>
        </View>

        <View style={styles.saleDetails}>
          <View style={styles.saleDetail}>
            <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.saleDetailText}>{item.buyerName}</Text>
          </View>
          <View style={styles.saleDetail}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.saleDetailText}>
              {formatDate(item.date)}
            </Text>
          </View>
        </View>

        <View style={styles.salePriceRow}>
          <View>
            <Text style={styles.priceLabel}>سعر البيع</Text>
            <Text style={styles.priceValue}>{formatNumber(item.salePrice)}</Text>
          </View>
          <View style={styles.priceDivider} />
          <View>
            <Text style={styles.priceLabel}>المدفوع</Text>
            <Text style={[styles.priceValue, { color: Colors.success }]}>
              {formatNumber(item.totalPaid || 0)}
            </Text>
          </View>
          {item.remaining > 0 && (
            <>
              <View style={styles.priceDivider} />
              <View>
                <Text style={styles.priceLabel}>المتبقي</Text>
                <Text style={[styles.priceValue, { color: Colors.error }]}>
                  {formatNumber(item.remaining)}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    );
  };

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatNumber(totalRevenue)}</Text>
          <Text style={styles.summaryLabel}>إجمالي المبيعات</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.success }]}>
            {formatNumber(totalCollected)}
          </Text>
          <Text style={styles.summaryLabel}>المحصّل</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.error }]}>
            {formatNumber(totalPending)}
          </Text>
          <Text style={styles.summaryLabel}>المعلّق</Text>
        </View>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="بحث بالمشتري أو الرقم..." />

      {/* List */}
      <FlatList
        data={search.trim() ? sales.filter(s => s.buyerName?.toLowerCase().includes(search.toLowerCase()) || s.goat?.tagId?.toLowerCase().includes(search.toLowerCase()) || s.buyerPhone?.includes(search)) : sales}
        renderItem={renderSale}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSales(); }} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="cash"
            title="لا يوجد مبيعات"
            message="سجّل أول عملية بيع"
            action={{ title: 'تسجيل بيع', onPress: () => setAddVisible(true) }}
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
          <Text style={styles.modalTitle}>تسجيل بيع</Text>
          <View style={{ width: 50 }} />
        </View>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Input label="رقم الحيوان *" placeholder="Tag ID" icon="paw-outline" value={formGoatTag} onChangeText={setFormGoatTag} />
          <Input label="اسم المشتري *" placeholder="الاسم" icon="person-outline" value={formBuyer} onChangeText={setFormBuyer} />
          <Input label="هاتف المشتري" placeholder="الرقم" icon="call-outline" value={formPhone} onChangeText={setFormPhone} keyboardType="phone-pad" />
          <Input label="سعر البيع *" placeholder="0" icon="pricetag-outline" value={formPrice} onChangeText={setFormPrice} keyboardType="decimal-pad" />
          <Input label="المبلغ المدفوع" placeholder="0" icon="cash-outline" value={formPaid} onChangeText={setFormPaid} keyboardType="decimal-pad" />
          <Input label="التاريخ" placeholder="YYYY-MM-DD" icon="calendar-outline" value={formDate} onChangeText={setFormDate} />
          <Input label="ملاحظات" placeholder="ملاحظات إضافية" icon="document-text-outline" value={formNotes} onChangeText={setFormNotes} multiline />

          <Button title="تسجيل البيع" onPress={handleAdd} loading={submitting} fullWidth size="lg" icon="checkmark-circle-outline" />
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
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  summaryLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
  },
  list: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  saleCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  saleTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  saleTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saleTag: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  paymentBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  paymentText: {
    ...Typography.smallBold,
  },
  saleDetails: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginBottom: Spacing.md,
  },
  saleDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saleDetailText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  salePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  priceLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  priceValue: {
    ...Typography.bodyBold,
    color: Colors.text,
    textAlign: 'center',
  },
  priceDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.borderLight,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    start: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
  },
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
});
