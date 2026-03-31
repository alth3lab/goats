import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, Modal, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { farmsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LoadingScreen, EmptyState, Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { western } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import type { Farm } from '@/types';

const FARM_TYPES: Record<string, string> = {
  GOAT: 'أغنام',
  CAMEL: 'إبل',
  MIXED: 'مختلط',
};

const FARM_TYPE_OPTIONS = [
  { key: 'GOAT', label: 'أغنام' },
  { key: 'CAMEL', label: 'إبل' },
  { key: 'MIXED', label: 'مختلط' },
];

export default function FarmsScreen() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const { farm: currentFarm, switchFarm, refresh } = useAuth();
  const { showToast } = useToast();

  // Form state
  const [formName, setFormName] = useState('');
  const [formNameAr, setFormNameAr] = useState('');
  const [formType, setFormType] = useState('GOAT');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  const fetchFarms = useCallback(async () => {
    try {
      const data = await farmsApi.list();
      setFarms(data as unknown as Farm[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل المزارع';
      showToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchFarms(); }, [fetchFarms]));

  const handleSwitch = async (farmId: string) => {
    if (farmId === currentFarm?.id) return;
    setSwitching(farmId);
    try {
      await switchFarm(farmId);
      await refresh();
      showToast('success', 'تم تبديل المزرعة بنجاح');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تبديل المزرعة';
      showToast('error', msg);
    } finally {
      setSwitching(null);
    }
  };

  const handleCreate = async () => {
    if (!formName.trim()) { showToast('error', 'اسم المزرعة مطلوب'); return; }
    setSubmitting(true);
    try {
      await farmsApi.create({
        name: formName.trim(),
        nameAr: formNameAr.trim() || formName.trim(),
        farmType: formType,
        phone: formPhone.trim() || undefined,
        address: formAddress.trim() || undefined,
      });
      showToast('success', 'تم إنشاء المزرعة بنجاح');
      setAddVisible(false);
      resetForm();
      fetchFarms();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل إنشاء المزرعة';
      showToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormNameAr('');
    setFormType('GOAT');
    setFormPhone('');
    setFormAddress('');
  };

  const renderFarm = ({ item }: { item: Farm }) => {
    const isCurrent = item.id === currentFarm?.id;
    return (
      <TouchableOpacity
        style={[styles.card, isCurrent && styles.cardActive]}
        onPress={() => handleSwitch(item.id)}
        activeOpacity={0.7}
        disabled={switching !== null}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.farmIcon, { backgroundColor: isCurrent ? Colors.primary + '20' : Colors.background }]}>
            <Ionicons name="home" size={22} color={isCurrent ? Colors.primary : Colors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.farmName}>{item.nameAr || item.name}</Text>
            <Text style={styles.farmType}>{FARM_TYPES[item.farmType] || item.farmType}</Text>
          </View>
          {isCurrent ? (
            <View style={styles.currentBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              <Text style={styles.currentText}>الحالية</Text>
            </View>
          ) : switching === item.id ? (
            <Text style={styles.switchingText}>جاري التبديل...</Text>
          ) : (
            <Ionicons name="swap-horizontal" size={20} color={Colors.textSecondary} />
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{western(String(item.goatsCount || 0))}</Text>
            <Text style={styles.statLabel}>رؤوس</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{western(String(item.pensCount || 0))}</Text>
            <Text style={styles.statLabel}>حظائر</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{western(String(item.usersCount || 0))}</Text>
            <Text style={styles.statLabel}>أعضاء</Text>
          </View>
        </View>

        {item.role && (
          <View style={styles.roleRow}>
            <Ionicons name="shield-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title: 'إدارة المزارع',
        headerShown: true,
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { ...Typography.h4, color: '#fff' },
        headerTitleAlign: 'center',
        headerBackTitle: '',
      }} />

      <View style={styles.summary}>
        <Ionicons name="business" size={20} color={Colors.primary} />
        <Text style={styles.summaryText}>
          {western(String(farms.length))} مزرعة
        </Text>
      </View>

      <FlatList
        data={farms}
        keyExtractor={it => it.id}
        renderItem={renderFarm}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFarms(); }} />
        }
        ListEmptyComponent={
          <EmptyState icon="home-outline" title="لا توجد مزارع" message="أنشئ مزرعة جديدة" />
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setAddVisible(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Create Farm Modal */}
      <Modal visible={addVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setAddVisible(false); resetForm(); }}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>مزرعة جديدة</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
            <Input label="اسم المزرعة (English) *" value={formName} onChangeText={setFormName} placeholder="Farm name" />
            <Input label="اسم المزرعة (عربي)" value={formNameAr} onChangeText={setFormNameAr} placeholder="اسم المزرعة" />

            <Text style={styles.fieldLabel}>نوع المزرعة</Text>
            <View style={styles.typeRow}>
              {FARM_TYPE_OPTIONS.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeChip, formType === t.key && styles.typeChipActive]}
                  onPress={() => setFormType(t.key)}
                >
                  <Text style={[styles.typeChipText, formType === t.key && styles.typeChipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input label="الهاتف" value={formPhone} onChangeText={setFormPhone} placeholder="رقم الهاتف" keyboardType="phone-pad" />
            <Input label="العنوان" value={formAddress} onChangeText={setFormAddress} placeholder="العنوان" multiline />

            <Button title={submitting ? 'جاري الإنشاء...' : 'إنشاء المزرعة'} onPress={handleCreate} disabled={submitting} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  summary: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  summaryText: { ...Typography.body, fontWeight: '600', color: Colors.text },
  list: { padding: Spacing.md, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    ...Shadows.sm,
  },
  cardActive: { borderWidth: 2, borderColor: Colors.primary },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  farmIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  farmName: { ...Typography.body, fontWeight: '700', color: Colors.text, textAlign: 'right' },
  farmType: { ...Typography.caption, color: Colors.textSecondary },
  currentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary + '15', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  currentText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
  switchingText: { ...Typography.caption, color: Colors.textSecondary, fontStyle: 'italic' },
  statsRow: {
    flexDirection: 'row', marginTop: Spacing.md, paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...Typography.h4, color: Colors.text },
  statLabel: { ...Typography.caption, color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  roleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  roleText: { ...Typography.caption, color: Colors.textSecondary },
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
  fieldLabel: { ...Typography.body, fontWeight: '700', marginTop: Spacing.md, marginBottom: Spacing.sm, textAlign: 'right' },
  typeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  typeChip: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  typeChipActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
  typeChipText: { ...Typography.body, color: Colors.textSecondary },
  typeChipTextActive: { color: Colors.primary, fontWeight: '600' },
});
