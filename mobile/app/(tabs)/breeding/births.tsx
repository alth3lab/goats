import React, { useState } from 'react';
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
import { Button, Input } from '@/components/ui';
import DatePickerField from '@/components/DatePickerField';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';

type Gender = 'MALE' | 'FEMALE';
type BirthStatus = 'ALIVE' | 'STILLBORN' | 'DIED';

interface KidEntry {
  key: string;
  tagId: string;
  gender: Gender;
  weight: string;
  status: BirthStatus;
  notes: string;
}

const GENDER_OPTIONS: Array<{ value: Gender; label: string; icon: string; color: string }> = [
  { value: 'MALE', label: 'ذكر', icon: 'male', color: Colors.male },
  { value: 'FEMALE', label: 'أنثى', icon: 'female', color: Colors.female },
];

const STATUS_OPTIONS: Array<{ value: BirthStatus; label: string; color: string }> = [
  { value: 'ALIVE', label: 'حي', color: Colors.success },
  { value: 'STILLBORN', label: 'ميت', color: Colors.error },
  { value: 'DIED', label: 'نفق لاحقاً', color: Colors.warning },
];

let kidKeyCounter = 0;
function newKid(): KidEntry {
  return {
    key: `kid-${++kidKeyCounter}`,
    tagId: '',
    gender: 'MALE',
    weight: '',
    status: 'ALIVE',
    notes: '',
  };
}

export default function RecordBirthsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [birthDate, setBirthDate] = useState(new Date().toISOString().slice(0, 10));
  const [kids, setKids] = useState<KidEntry[]>([newKid()]);
  const [saving, setSaving] = useState(false);

  const updateKid = (key: string, field: keyof KidEntry, value: string) => {
    setKids(prev => prev.map(k => (k.key === key ? { ...k, [field]: value } : k)));
  };

  const addKid = () => setKids(prev => [...prev, newKid()]);

  const removeKid = (key: string) => {
    if (kids.length <= 1) return;
    setKids(prev => prev.filter(k => k.key !== key));
  };

  const handleSave = async () => {
    if (!id) return;
    if (!birthDate) {
      Alert.alert('خطأ', 'تاريخ الولادة مطلوب');
      return;
    }
    if (kids.length === 0) {
      Alert.alert('خطأ', 'أضف مولوداً واحداً على الأقل');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        birthDate: new Date(birthDate).toISOString(),
        kids: kids.map(k => ({
          ...(k.tagId.trim() ? { tagId: k.tagId.trim() } : {}),
          gender: k.gender,
          ...(k.weight ? { weight: parseFloat(k.weight) } : {}),
          status: k.status,
          ...(k.notes.trim() ? { notes: k.notes.trim() } : {}),
        })),
      };

      await breedingApi.recordBirths(id, payload);
      Alert.alert('تم', 'تم تسجيل المواليد بنجاح', [
        { text: 'حسناً', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل تسجيل المواليد';
      Alert.alert('خطأ', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Birth Date */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>تاريخ الولادة</Text>
          <DatePickerField
            label=""
            value={birthDate}
            onChange={setBirthDate}
            required
            maximumDate={new Date()}
          />
        </View>

        {/* Kids */}
        {kids.map((kid, index) => (
          <View key={kid.key} style={styles.card}>
            <View style={styles.kidHeader}>
              <Text style={styles.cardTitle}>المولود {index + 1}</Text>
              {kids.length > 1 && (
                <TouchableOpacity onPress={() => removeKid(kid.key)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={24} color={Colors.error} />
                </TouchableOpacity>
              )}
            </View>

            {/* Tag */}
            <Input
              label="رقم التعريف"
              placeholder="رقم تعريف المولود (اختياري)"
              icon="pricetag-outline"
              value={kid.tagId}
              onChangeText={v => updateKid(kid.key, 'tagId', v)}
            />

            {/* Gender */}
            <Text style={styles.fieldLabel}>الجنس</Text>
            <View style={styles.toggleRow}>
              {GENDER_OPTIONS.map(g => (
                <TouchableOpacity
                  key={g.value}
                  style={[styles.toggleChip, kid.gender === g.value && { backgroundColor: g.color, borderColor: g.color }]}
                  onPress={() => updateKid(kid.key, 'gender', g.value)}
                >
                  <Ionicons name={g.icon as any} size={18} color={kid.gender === g.value ? '#fff' : Colors.textSecondary} />
                  <Text style={[styles.toggleText, kid.gender === g.value && { color: '#fff' }]}>{g.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Weight */}
            <Input
              label="الوزن (كجم)"
              placeholder="الوزن عند الولادة"
              icon="fitness-outline"
              value={kid.weight}
              onChangeText={v => updateKid(kid.key, 'weight', v)}
              keyboardType="decimal-pad"
            />

            {/* Status */}
            <Text style={styles.fieldLabel}>الحالة</Text>
            <View style={styles.toggleRow}>
              {STATUS_OPTIONS.map(s => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.toggleChip, kid.status === s.value && { backgroundColor: s.color, borderColor: s.color }]}
                  onPress={() => updateKid(kid.key, 'status', s.value)}
                >
                  <Text style={[styles.toggleText, kid.status === s.value && { color: '#fff' }]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Input
              label="ملاحظات"
              placeholder="ملاحظات عن المولود (اختياري)"
              icon="document-text-outline"
              value={kid.notes}
              onChangeText={v => updateKid(kid.key, 'notes', v)}
            />
          </View>
        ))}

        {/* Add Kid Button */}
        <TouchableOpacity style={styles.addKidBtn} onPress={addKid}>
          <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
          <Text style={styles.addKidText}>إضافة مولود آخر</Text>
        </TouchableOpacity>

        <Button
          title={`تسجيل ${kids.length} مولود`}
          onPress={handleSave}
          loading={saving}
          fullWidth
          size="lg"
          icon="checkmark-circle-outline"
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
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  kidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    ...Typography.h4,
    color: Colors.text,
    textAlign: 'right',
  },
  fieldLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: Spacing.md,
    textAlign: 'right',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  toggleText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  addKidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
  },
  addKidText: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
});
