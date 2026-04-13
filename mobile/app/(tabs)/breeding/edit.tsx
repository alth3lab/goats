import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { breedingApi } from '@/lib/api';
import { Button, Input, LoadingScreen } from '@/components/ui';
import DatePickerField from '@/components/DatePickerField';
import { Colors, Spacing, Radius, Typography, Shadows, PregnancyStatusLabels } from '@/lib/theme';
import type { Breeding, PregnancyStatus } from '@/types';

const STATUS_OPTIONS: Array<{ value: PregnancyStatus; label: string }> = [
  { value: 'MATED', label: 'تم التلقيح' },
  { value: 'PREGNANT', label: 'حامل' },
  { value: 'DELIVERED', label: 'ولدت' },
  { value: 'FAILED', label: 'فشل' },
];

export default function EditBreedingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [breeding, setBreeding] = useState<Breeding | null>(null);

  const [pregnancyStatus, setPregnancyStatus] = useState<PregnancyStatus>('MATED');
  const [matingDate, setMatingDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [numberOfKids, setNumberOfKids] = useState('');
  const [notes, setNotes] = useState('');

  const fetchData = useCallback(async () => {
    if (!id) { router.back(); return; }
    try {
      const data = await breedingApi.get(id);
      const b = data as unknown as Breeding;
      setBreeding(b);
      setPregnancyStatus(b.pregnancyStatus);
      setMatingDate(b.matingDate ? String(b.matingDate).slice(0, 10) : '');
      setDueDate(b.dueDate ? String(b.dueDate).slice(0, 10) : '');
      setBirthDate(b.birthDate ? String(b.birthDate).slice(0, 10) : '');
      setNumberOfKids(b.numberOfKids ? String(b.numberOfKids) : '');
      setNotes(b.notes || '');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذر تحميل البيانات';
      Alert.alert('خطأ', msg);
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!id) return;
    if (!matingDate) {
      Alert.alert('خطأ', 'تاريخ التلقيح مطلوب');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        pregnancyStatus,
        matingDate: new Date(matingDate).toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        birthDate: birthDate ? new Date(birthDate).toISOString() : null,
        numberOfKids: numberOfKids ? parseInt(numberOfKids, 10) : null,
        notes: notes.trim() || null,
      };

      await breedingApi.update(id, payload);
      Alert.alert('تم الحفظ', 'تم تحديث السجل بنجاح', [
        { text: 'حسناً', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل تحديث السجل';
      Alert.alert('خطأ', message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;
  if (!breeding) return null;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Parents (read-only) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>الأبوين</Text>
          <View style={styles.parentsRow}>
            <View style={styles.parentChip}>
              <Ionicons name="female" size={18} color={Colors.female} />
              <Text style={styles.parentTag}>{breeding.mother?.tagId || '—'}</Text>
            </View>
            <Ionicons name="heart" size={14} color={Colors.female} />
            <View style={styles.parentChip}>
              <Ionicons name="male" size={18} color={Colors.male} />
              <Text style={styles.parentTag}>{breeding.father?.tagId || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>حالة الحمل</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map(s => (
              <TouchableOpacity
                key={s.value}
                style={[styles.statusChip, pregnancyStatus === s.value && styles.statusChipActive]}
                onPress={() => setPregnancyStatus(s.value)}
              >
                <Text style={[styles.statusChipText, pregnancyStatus === s.value && styles.statusChipTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dates */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>التواريخ</Text>

          <DatePickerField
            label="تاريخ التلقيح"
            value={matingDate}
            onChange={setMatingDate}
            required
          />

          <DatePickerField
            label="الموعد المتوقع للولادة"
            value={dueDate}
            onChange={setDueDate}
            placeholder="اختر التاريخ (اختياري)"
            maximumDate={new Date(Date.now() + 400 * 24 * 60 * 60 * 1000)}
          />

          {(pregnancyStatus === 'DELIVERED') && (
            <DatePickerField
              label="تاريخ الولادة"
              value={birthDate}
              onChange={setBirthDate}
              placeholder="اختر تاريخ الولادة"
            />
          )}

          {(pregnancyStatus === 'DELIVERED') && (
            <Input
              label="عدد المواليد"
              placeholder="مثال: 2"
              icon="people-outline"
              value={numberOfKids}
              onChangeText={setNumberOfKids}
              keyboardType="number-pad"
            />
          )}
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ملاحظات</Text>
          <Input
            label=""
            placeholder="ملاحظات إضافية"
            icon="document-text-outline"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        <Button
          title="حفظ التعديلات"
          onPress={handleSave}
          loading={saving}
          fullWidth
          size="lg"
          icon="save-outline"
        />

        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  cardTitle: {
    ...Typography.h4,
    color: Colors.text,
    marginBottom: Spacing.xl,
    textAlign: 'right',
  },
  parentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  parentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  parentTag: { ...Typography.captionBold, color: Colors.text },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  statusChipActive: {
    backgroundColor: Colors.female,
    borderColor: Colors.female,
  },
  statusChipText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  statusChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
