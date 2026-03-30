import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
  Modal, Pressable, Alert,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { teamApi } from '@/lib/api';
import { LoadingScreen, EmptyState, Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { formatDate, western } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'مدير النظام',
  OWNER: 'مالك',
  ADMIN: 'مسؤول',
  USER: 'مستخدم',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: Colors.error,
  OWNER: Colors.primary,
  ADMIN: Colors.info,
  USER: Colors.textSecondary,
};

const AVAILABLE_ROLES = ['ADMIN', 'USER'];

interface Member {
  id: string;
  fullName: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export default function TeamScreen() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const { can, user } = useAuth();

  // Form state
  const [form, setForm] = useState({
    fullName: '', username: '', email: '', password: '', phone: '', role: 'USER',
  });

  const fetchData = useCallback(async () => {
    try {
      const data = await teamApi.list();
      setMembers((data as unknown as Member[]) || []);
    } catch {
      showToast('error', 'فشل تحميل أعضاء الفريق');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const resetForm = () => {
    setForm({ fullName: '', username: '', email: '', password: '', phone: '', role: 'USER' });
  };

  const handleCreate = async () => {
    if (!form.fullName.trim() || !form.username.trim() || !form.password.trim()) {
      showToast('error', 'يرجى إدخال الاسم واسم المستخدم وكلمة المرور');
      return;
    }
    if (form.password.length < 6) {
      showToast('error', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setSaving(true);
    try {
      await teamApi.create(form);
      showToast('success', 'تم إضافة العضو بنجاح');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل إضافة العضو';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (member: Member) => {
    if (member.id === user?.id) {
      showToast('error', 'لا يمكنك حذف حسابك');
      return;
    }
    Alert.alert('حذف العضو', `هل تريد حذف ${member.fullName}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: async () => {
          try {
            await teamApi.delete(member.id);
            showToast('success', 'تم حذف العضو');
            fetchData();
          } catch {
            showToast('error', 'فشل حذف العضو');
          }
        },
      },
    ]);
  };

  const handleChangeRole = (member: Member) => {
    if (member.id === user?.id) return;
    const newRole = member.role === 'ADMIN' ? 'USER' : 'ADMIN';
    Alert.alert('تغيير الدور', `تغيير دور ${member.fullName} إلى ${ROLE_LABELS[newRole]}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تغيير',
        onPress: async () => {
          try {
            await teamApi.update(member.id, { role: newRole });
            showToast('success', 'تم تغيير الدور');
            fetchData();
          } catch {
            showToast('error', 'فشل تغيير الدور');
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;

  return (
    <>
      <Stack.Screen options={{
        title: 'إدارة الفريق',
        headerShown: true,
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { ...Typography.h4, color: '#fff' },
        headerTitleAlign: 'center',
      }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{western(members.length)}</Text>
            <Text style={styles.statLabel}>إجمالي الأعضاء</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.statValue}>{western(members.filter(m => m.isActive).length)}</Text>
            <Text style={styles.statLabel}>نشط</Text>
          </View>
        </View>

        {/* Members List */}
        {members.length === 0 ? (
          <EmptyState
            icon="people"
            title="لا يوجد أعضاء"
            message="أضف أعضاء الفريق لمشاركة إدارة المزرعة"
            action={can('__owner_admin__') ? { title: 'إضافة عضو', onPress: () => setShowModal(true) } : undefined}
          />
        ) : (
          members.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberHeader}>
                <View style={[styles.avatarIcon, { backgroundColor: ROLE_COLORS[member.role] + '15' }]}>
                  <Ionicons name="person" size={22} color={ROLE_COLORS[member.role] || Colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{member.fullName}</Text>
                  <Text style={styles.memberUsername}>@{member.username}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLORS[member.role] || Colors.textSecondary) + '15' }]}>
                  <Text style={[styles.roleBadgeText, { color: ROLE_COLORS[member.role] || Colors.textSecondary }]}>
                    {ROLE_LABELS[member.role] || member.role}
                  </Text>
                </View>
              </View>

              <View style={styles.memberInfo}>
                {member.email && (
                  <View style={styles.memberInfoRow}>
                    <Ionicons name="mail" size={14} color={Colors.textLight} />
                    <Text style={styles.memberInfoText}>{member.email}</Text>
                  </View>
                )}
                {member.phone && (
                  <View style={styles.memberInfoRow}>
                    <Ionicons name="call" size={14} color={Colors.textLight} />
                    <Text style={styles.memberInfoText}>{member.phone}</Text>
                  </View>
                )}
                <View style={styles.memberInfoRow}>
                  <Ionicons name="time" size={14} color={Colors.textLight} />
                  <Text style={styles.memberInfoText}>
                    انضم {formatDate(member.createdAt)}
                    {member.lastLoginAt ? ` — آخر دخول ${formatDate(member.lastLoginAt)}` : ''}
                  </Text>
                </View>
              </View>

              {can('__owner_admin__') && member.id !== user?.id && (
                <View style={styles.memberActions}>
                  <TouchableOpacity style={styles.memberActionBtn} onPress={() => handleChangeRole(member)}>
                    <Ionicons name="swap-horizontal" size={16} color={Colors.info} />
                    <Text style={[styles.memberActionText, { color: Colors.info }]}>تغيير الدور</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.memberActionBtn} onPress={() => handleDelete(member)}>
                    <Ionicons name="trash" size={16} color={Colors.error} />
                    <Text style={[styles.memberActionText, { color: Colors.error }]}>حذف</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* FAB */}
      {can('__owner_admin__') && (
        <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setShowModal(true); }}>
          <Ionicons name="person-add" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add Member Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modalContent}>
            <Text style={styles.modalTitle}>إضافة عضو جديد</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Input label="الاسم الكامل *" value={form.fullName} onChangeText={v => setForm(p => ({ ...p, fullName: v }))} placeholder="أدخل الاسم" />
              <Input label="اسم المستخدم *" value={form.username} onChangeText={v => setForm(p => ({ ...p, username: v }))} placeholder="اسم المستخدم" autoCapitalize="none" />
              <Input label="البريد الإلكتروني" value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} placeholder="البريد" keyboardType="email-address" autoCapitalize="none" />
              <Input label="كلمة المرور *" value={form.password} onChangeText={v => setForm(p => ({ ...p, password: v }))} placeholder="6 أحرف على الأقل" secureTextEntry />
              <Input label="الهاتف" value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} placeholder="رقم الهاتف" keyboardType="phone-pad" />

              <Text style={styles.formLabel}>الدور</Text>
              <View style={styles.roleSelector}>
                {AVAILABLE_ROLES.map(role => (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleOption, form.role === role && styles.roleOptionActive]}
                    onPress={() => setForm(p => ({ ...p, role }))}
                  >
                    <Text style={[styles.roleOptionText, form.role === role && styles.roleOptionTextActive]}>
                      {ROLE_LABELS[role]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Button title="إلغاء" onPress={() => setShowModal(false)} variant="ghost" />
                <Button title="إضافة" onPress={handleCreate} loading={saving} />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', ...Shadows.sm, gap: 4 },
  statValue: { ...Typography.h3, color: Colors.text },
  statLabel: { ...Typography.small, color: Colors.textSecondary },
  memberCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm,
  },
  memberHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  avatarIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  memberName: { ...Typography.bodyBold, color: Colors.text },
  memberUsername: { ...Typography.small, color: Colors.textLight },
  roleBadge: { borderRadius: Radius.full, paddingVertical: 2, paddingHorizontal: 10 },
  roleBadgeText: { ...Typography.smallBold },
  memberInfo: { gap: Spacing.sm, marginBottom: Spacing.md },
  memberInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberInfoText: { ...Typography.caption, color: Colors.textSecondary },
  memberActions: { flexDirection: 'row', gap: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.md },
  memberActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberActionText: { ...Typography.captionBold },
  fab: {
    position: 'absolute', bottom: 24, left: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    ...Shadows.lg,
  },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xxl, maxHeight: '85%' },
  modalTitle: { ...Typography.h3, color: Colors.text, textAlign: 'center', marginBottom: Spacing.xl },
  modalActions: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg, marginTop: Spacing.lg },
  formLabel: { ...Typography.captionBold, color: Colors.text, marginBottom: Spacing.sm, textAlign: 'right' },
  roleSelector: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  roleOption: { flex: 1, backgroundColor: Colors.background, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  roleOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  roleOptionText: { ...Typography.captionBold, color: Colors.textSecondary },
  roleOptionTextActive: { color: Colors.primary },
});
