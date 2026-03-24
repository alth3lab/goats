import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { goatsApi, lookupApi } from '@/lib/api';
import { Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import type { Breed, Pen, Owner } from '@/types';
import { TouchableOpacity } from 'react-native';

export default function AddGoatScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form state
  const [tagId, setTagId] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [birthDate, setBirthDate] = useState('');
  const [weight, setWeight] = useState('');
  const [breedId, setBreedId] = useState('');
  const [penId, setPenId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [motherTagId, setMotherTagId] = useState('');
  const [fatherTagId, setFatherTagId] = useState('');

  // Lookup data
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [pens, setPens] = useState<Pen[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);

  useEffect(() => {
    Promise.all([
      lookupApi.breeds().catch(() => []),
      lookupApi.pens().catch(() => []),
      lookupApi.owners().catch(() => []),
    ]).then(([b, p, o]) => {
      setBreeds(b as unknown as Breed[]);
      setPens(p as unknown as Pen[]);
      setOwners(o as unknown as Owner[]);
    });
  }, []);

  const handleSubmit = async () => {
    if (!tagId.trim()) {
      Alert.alert('خطأ', 'رقم الحيوان مطلوب');
      return;
    }
    if (!birthDate.trim()) {
      Alert.alert('خطأ', 'تاريخ الميلاد مطلوب');
      return;
    }

    setLoading(true);
    try {
      const data: Record<string, unknown> = {
        tagId: tagId.trim(),
        gender,
        birthDate,
        status: 'ACTIVE',
      };

      if (name.trim()) data.name = name.trim();
      if (weight) data.weight = parseFloat(weight);
      if (breedId) data.breedId = breedId;
      if (penId) data.penId = penId;
      if (ownerId) data.ownerId = ownerId;
      if (motherTagId.trim()) data.motherTagId = motherTagId.trim();
      if (fatherTagId.trim()) data.fatherTagId = fatherTagId.trim();

      await goatsApi.create(data);
      Alert.alert('نجاح', 'تم إضافة الحيوان بنجاح', [
        { text: 'حسناً', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل إضافة الحيوان';
      Alert.alert('خطأ', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>المعلومات الأساسية</Text>

          <Input
            label="رقم الحيوان (Tag ID) *"
            placeholder="مثال: G-001"
            icon="barcode-outline"
            value={tagId}
            onChangeText={setTagId}
          />

          <Input
            label="الاسم (اختياري)"
            placeholder="اسم الحيوان"
            icon="text-outline"
            value={name}
            onChangeText={setName}
          />

          {/* Gender Toggle */}
          <Text style={styles.fieldLabel}>الجنس *</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'MALE' && styles.genderBtnActive, gender === 'MALE' && { borderColor: Colors.male }]}
              onPress={() => setGender('MALE')}
            >
              <Ionicons name="male" size={20} color={gender === 'MALE' ? Colors.male : Colors.textLight} />
              <Text style={[styles.genderBtnText, gender === 'MALE' && { color: Colors.male }]}>ذكر</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'FEMALE' && styles.genderBtnActive, gender === 'FEMALE' && { borderColor: Colors.female }]}
              onPress={() => setGender('FEMALE')}
            >
              <Ionicons name="female" size={20} color={gender === 'FEMALE' ? Colors.female : Colors.textLight} />
              <Text style={[styles.genderBtnText, gender === 'FEMALE' && { color: Colors.female }]}>أنثى</Text>
            </TouchableOpacity>
          </View>

          <Input
            label="تاريخ الميلاد *"
            placeholder="YYYY-MM-DD"
            icon="calendar-outline"
            value={birthDate}
            onChangeText={setBirthDate}
            keyboardType="numbers-and-punctuation"
          />

          <Input
            label="الوزن (كغ)"
            placeholder="0.0"
            icon="fitness-outline"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Breed & Location */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>السلالة والموقع</Text>

          {/* Breed Picker */}
          <Text style={styles.fieldLabel}>السلالة</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {breeds.map(b => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.chip, breedId === b.id && styles.chipActive]}
                  onPress={() => setBreedId(breedId === b.id ? '' : b.id)}
                >
                  <Text style={[styles.chipText, breedId === b.id && styles.chipTextActive]}>
                    {b.nameAr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Pen Picker */}
          <Text style={styles.fieldLabel}>الحظيرة</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {pens.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, penId === p.id && styles.chipActive]}
                  onPress={() => setPenId(penId === p.id ? '' : p.id)}
                >
                  <Text style={[styles.chipText, penId === p.id && styles.chipTextActive]}>
                    {p.nameAr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Owner Picker */}
          <Text style={styles.fieldLabel}>المالك</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {owners.map(o => (
                <TouchableOpacity
                  key={o.id}
                  style={[styles.chip, ownerId === o.id && styles.chipActive]}
                  onPress={() => setOwnerId(ownerId === o.id ? '' : o.id)}
                >
                  <Text style={[styles.chipText, ownerId === o.id && styles.chipTextActive]}>
                    {o.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Parentage */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>النسب</Text>

          <Input
            label="رقم الأب"
            placeholder="رقم الأب Tag ID"
            icon="male-outline"
            value={fatherTagId}
            onChangeText={setFatherTagId}
          />

          <Input
            label="رقم الأم"
            placeholder="رقم الأم Tag ID"
            icon="female-outline"
            value={motherTagId}
            onChangeText={setMotherTagId}
          />
        </View>

        {/* Submit */}
        <Button
          title="إضافة الحيوان"
          onPress={handleSubmit}
          loading={loading}
          fullWidth
          size="lg"
          icon="checkmark-circle-outline"
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
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
  fieldLabel: {
    ...Typography.captionBold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'right',
  },
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  genderBtnActive: {
    backgroundColor: Colors.surfaceVariant,
  },
  genderBtnText: {
    ...Typography.captionBold,
    color: Colors.textLight,
  },
  chipScroll: {
    marginBottom: Spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
