import React, { useState } from 'react';
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
import { breedingApi, resolveGoatByTag } from '@/lib/api';
import { Button, Input } from '@/components/ui';
import DatePickerField from '@/components/DatePickerField';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';

export default function AddBreedingScreen() {
  const router = useRouter();

  const [motherTag, setMotherTag] = useState('');
  const [fatherTag, setFatherTag] = useState('');
  const [matingDate, setMatingDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!motherTag.trim()) {
      Alert.alert('خطأ', 'رقم الأم مطلوب');
      return;
    }
    if (!matingDate) {
      Alert.alert('خطأ', 'تاريخ التلقيح مطلوب');
      return;
    }

    setSaving(true);
    try {
      const motherId = await resolveGoatByTag(motherTag);
      if (!motherId) {
        Alert.alert('خطأ', 'لم يتم العثور على الأم بهذا الرقم');
        setSaving(false);
        return;
      }

      const body: Record<string, unknown> = {
        motherId,
        matingDate,
      };

      if (fatherTag.trim()) {
        const fatherId = await resolveGoatByTag(fatherTag);
        if (!fatherId) {
          Alert.alert('خطأ', 'لم يتم العثور على الأب بهذا الرقم');
          setSaving(false);
          return;
        }
        body.fatherId = fatherId;
      }

      if (notes.trim()) body.notes = notes.trim();

      await breedingApi.create(body);
      Alert.alert('تم الحفظ', 'تم تسجيل التلقيح بنجاح', [
        { text: 'حسناً', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل تسجيل التلقيح';
      Alert.alert('خطأ', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>معلومات الأبوين</Text>

          <Input
            label="رقم الأم *"
            placeholder="Tag ID للأنثى"
            icon="female-outline"
            value={motherTag}
            onChangeText={setMotherTag}
          />

          <Input
            label="رقم الأب"
            placeholder="Tag ID للذكر (اختياري)"
            icon="male-outline"
            value={fatherTag}
            onChangeText={setFatherTag}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>تفاصيل التلقيح</Text>

          <DatePickerField
            label="تاريخ التلقيح"
            value={matingDate}
            onChange={setMatingDate}
            placeholder="اختر التاريخ"
            required
          />

          <Input
            label="ملاحظات"
            placeholder="ملاحظات إضافية"
            icon="document-text-outline"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        <Button
          title="تسجيل التلقيح"
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
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  cardTitle: {
    ...Typography.h4,
    color: Colors.text,
    marginBottom: Spacing.xl,
    textAlign: 'right',
  },
});
