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
import { ownersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LoadingScreen, EmptyState, Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { formatNumber, western } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import { SearchBar } from '@/components/SearchBar';
import { validateRequired } from '@/lib/validation';
import type { Owner } from '@/types';

export default function OwnersScreen() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [search, setSearch] = useState('');
  const { can } = useAuth();

  // Form
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formId, setFormId] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const fetchOwners = useCallback(async () => {
    try {
      const data = await ownersApi.list();
      setOwners(data as unknown as Owner[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل الملاك';
      showToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  const handleAdd = async () => {
    if (!validateRequired(formName, 'اسم المالك')) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: formName.trim(),
      };
      if (formPhone.trim()) body.phone = formPhone.trim();
      if (formId.trim()) body.idNumber = formId.trim();
      if (formAddress.trim()) body.address = formAddress.trim();
      if (formNotes.trim()) body.notes = formNotes.trim();

      await ownersApi.create(body);
      setAddVisible(false);
      setFormName('');
      setFormPhone('');
      setFormId('');
      setFormAddress('');
      setFormNotes('');
      fetchOwners();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل إضافة المالك';
      Alert.alert('خطأ', message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderOwner = ({ item }: { item: Owner }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.ownerInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={22} color={Colors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ownerName}>{item.name}</Text>
            {item.phone && (
              <View style={styles.phoneRow}>
                <Ionicons name="call-outline" size={13} color={Colors.textSecondary} />
                <Text style={styles.phoneText}>{item.phone}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="paw" size={16} color={Colors.primary} />
          <Text style={styles.statValue}>{western(item.activeGoats ?? 0)}</Text>
          <Text style={styles.statLabel}>حيوانات</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="cash" size={16} color={Colors.success} />
          <Text style={styles.statValue}>{formatNumber(item.totalSales ?? 0)}</Text>
          <Text style={styles.statLabel}>مبيعات</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="wallet" size={16} color={Colors.error} />
          <Text style={styles.statValue}>{formatNumber(item.totalExpenses ?? 0)}</Text>
          <Text style={styles.statLabel}>مصروفات</Text>
        </View>
      </View>

      {item.address && (
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color={Colors.textLight} />
          <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
        </View>
      )}
    </View>
  );

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;

  return (
    <>
      <Stack.Screen options={{ title: 'إدارة الملاك', headerShown: true, headerStyle: { backgroundColor: Colors.primary }, headerTintColor: '#fff', headerTitleStyle: { ...Typography.h4, color: '#fff' }, headerTitleAlign: 'center' }} />
      <View style={styles.container}>
        {/* Count */}
        <View style={styles.countRow}>
          <Text style={styles.countText}>{western(owners.length)} مالك</Text>
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder="بحث بالاسم أو الهاتف..." />

        <FlatList
          data={search.trim() ? owners.filter(o => o.name?.toLowerCase().includes(search.toLowerCase()) || o.phone?.includes(search) || o.idNumber?.includes(search)) : owners}
          renderItem={renderOwner}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOwners(); }} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <EmptyState icon="people" title="لا يوجد ملاك" message="أضف أول مالك" action={{ title: 'إضافة مالك', onPress: () => setAddVisible(true) }} />
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
            <Text style={styles.modalTitle}>إضافة مالك</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Input label="الاسم *" placeholder="اسم المالك" icon="person-outline" value={formName} onChangeText={setFormName} />
            <Input label="الهاتف" placeholder="رقم الهاتف" icon="call-outline" value={formPhone} onChangeText={setFormPhone} keyboardType="phone-pad" />
            <Input label="رقم الهوية" placeholder="رقم الهوية" icon="card-outline" value={formId} onChangeText={setFormId} />
            <Input label="العنوان" placeholder="العنوان" icon="location-outline" value={formAddress} onChangeText={setFormAddress} />
            <Input label="ملاحظات" placeholder="ملاحظات إضافية" icon="document-text-outline" value={formNotes} onChangeText={setFormNotes} multiline />

            <Button title="إضافة المالك" onPress={handleAdd} loading={submitting} fullWidth size="lg" icon="checkmark-circle-outline" />
            <View style={{ height: 40 }} />
          </ScrollView>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  countRow: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  countText: { ...Typography.caption, color: Colors.textSecondary },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  cardTop: { marginBottom: Spacing.md },
  ownerInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.secondary + '12', justifyContent: 'center', alignItems: 'center' },
  ownerName: { ...Typography.bodyBold, color: Colors.text },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  phoneText: { ...Typography.small, color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { ...Typography.captionBold, color: Colors.text },
  statLabel: { ...Typography.small, color: Colors.textSecondary },
  statDivider: { width: 1, backgroundColor: Colors.borderLight },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  addressText: { ...Typography.small, color: Colors.textLight, flex: 1 },
  fab: { position: 'absolute', bottom: 24, start: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center', ...Shadows.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, backgroundColor: Colors.surface },
  modalTitle: { ...Typography.h4, color: Colors.text },
  modalCancel: { ...Typography.captionBold, color: Colors.error },
  modalContent: { padding: Spacing.xl },
});
