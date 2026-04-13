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
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { goatsApi, lookupApi } from '@/lib/api';
import { Button, Input, LoadingScreen } from '@/components/ui';
import DatePickerField from '@/components/DatePickerField';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { validateNumber, validateRequired } from '@/lib/validation';
import type { Breed, Pen, Owner, Goat, GoatStatus } from '@/types';
import { ApiError } from '@/lib/api';

const STATUS_OPTIONS: Array<{ value: GoatStatus; label: string }> = [
  { value: 'ACTIVE', label: 'نشط' },
  { value: 'SOLD', label: 'مباع' },
  { value: 'DECEASED', label: 'نافق' },
  { value: 'QUARANTINE', label: 'حجر' },
];

export default function EditGoatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tagId, setTagId] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [status, setStatus] = useState<GoatStatus>('ACTIVE');
  const [birthDate, setBirthDate] = useState('');
  const [weight, setWeight] = useState('');
  const [breedId, setBreedId] = useState('');
  const [penId, setPenId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [motherTagId, setMotherTagId] = useState('');
  const [fatherTagId, setFatherTagId] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);

  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [pens, setPens] = useState<Pen[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);

  const fillForm = (goat: Goat) => {
    setTagId(goat.tagId || '');
    setName(goat.name || '');
    setGender(goat.gender || 'MALE');
    setStatus(goat.status || 'ACTIVE');
    setBirthDate(goat.birthDate ? String(goat.birthDate).slice(0, 10) : '');
    setWeight(goat.weight ? String(goat.weight) : '');
    setBreedId(goat.breed?.id || '');
    setPenId(goat.penId || '');
    setOwnerId(goat.ownerId || goat.owner?.id || '');
    setMotherTagId(goat.motherTagId || '');
    setFatherTagId(goat.fatherTagId || '');
    setExistingPhotoUrl(goat.imageUrl || null);
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    };

    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('تنبيه', 'يجب السماح بالوصول إلى الكاميرا');
        return;
      }
      result = await ImagePicker.launchCameraAsync(opts);
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('تنبيه', 'يجب السماح بالوصول إلى المعرض');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync(opts);
    }

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const fetchData = useCallback(async () => {
    if (!id) {
      Alert.alert('خطأ', 'معرّف الحيوان غير صالح');
      router.back();
      return;
    }

    try {
      const [goatData, b, p, o] = await Promise.all([
        goatsApi.get(id),
        lookupApi.breeds().catch(() => []),
        lookupApi.pens().catch(() => []),
        lookupApi.owners().catch(() => []),
      ]);

      setBreeds(b as Breed[]);
      setPens(p as Pen[]);
      setOwners(o as Owner[]);
      fillForm(goatData as unknown as Goat);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذر تحميل بيانات الحيوان';
      Alert.alert('خطأ', msg);
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!id) {
      Alert.alert('خطأ', 'معرّف الحيوان غير صالح');
      return;
    }
    if (!validateRequired(tagId, 'رقم الحيوان')) return;
    if (!breedId) {
      Alert.alert('خطأ', 'يجب اختيار السلالة');
      return;
    }
    if (!birthDate) {
      Alert.alert('خطأ', 'تاريخ الميلاد مطلوب');
      return;
    }

    const parsedWeight = validateNumber(weight, 'الوزن', { min: 0.1, max: 2000 });
    if (parsedWeight === null) return;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        tagId: tagId.trim(),
        gender,
        status,
        birthDate: new Date(birthDate).toISOString(),
        breedId,
        name: name.trim() || null,
        weight: parsedWeight === -1 ? null : parsedWeight,
        penId: penId || null,
        ownerId: ownerId || null,
      };

      const updateResult = await goatsApi.update(id, payload) as Record<string, unknown>;

      // Upload new photo if selected
      if (photoUri) {
        try {
          await goatsApi.uploadImage(id, photoUri);
          setPhotoUri(null);
        } catch (photoErr) {
          const detail = photoErr instanceof Error ? photoErr.message : '';
          Alert.alert('تنبيه', `تم حفظ البيانات لكن فشل رفع الصورة${detail ? '\n' + detail : ''}`);
        }
      }

      try {
        await goatsApi.updateParentage(id, motherTagId.trim() || null, fatherTagId.trim() || null);
      } catch (parentageErr) {
        const parentageMessage = parentageErr instanceof ApiError
          ? parentageErr.message
          : 'تم حفظ البيانات الأساسية لكن فشل تحديث النسب';
        Alert.alert('تنبيه', parentageMessage);
      }

      // Verify the save
      const persisted = await goatsApi.get(id) as Record<string, unknown>;
      const persistedBreedObj = persisted?.breed as { id?: string } | undefined;
      const persistedBreedId = persistedBreedObj?.id || (persisted?.breedId as string);

      if (persistedBreedId && persistedBreedId !== breedId) {
        Alert.alert(
          'خطأ في السلالة',
          `المرسل: ${breedId}\nالمحفوظ: ${persistedBreedId}\nلم تتطابق. حاول مرة أخرى.`,
        );
        return;
      }

      Alert.alert('تم الحفظ', 'تم حفظ التعديلات بنجاح', [
        { text: 'حسناً', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const message = err instanceof ApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'فشل تحديث بيانات الحيوان';
      Alert.alert('خطأ', `${message}\n\n(breedId: ${breedId})`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen message="جارٍ تحميل البيانات..." />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Photo */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>صورة الحيوان</Text>
          <View style={styles.photoRow}>
            {photoUri ? (
              <TouchableOpacity onPress={() => setPhotoUri(null)} style={styles.photoPreview}>
                <Image source={{ uri: photoUri }} style={styles.photoImage} />
                <View style={styles.photoRemove}>
                  <Ionicons name="close-circle" size={24} color={Colors.error} />
                </View>
              </TouchableOpacity>
            ) : existingPhotoUrl ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: existingPhotoUrl }} style={styles.photoImage} />
                <View style={styles.photoExistingBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                </View>
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="image-outline" size={40} color={Colors.textLight} />
              </View>
            )}
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage('camera')}>
                <Ionicons name="camera" size={22} color={Colors.primary} />
                <Text style={styles.photoBtnText}>الكاميرا</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage('gallery')}>
                <Ionicons name="images" size={22} color={Colors.primary} />
                <Text style={styles.photoBtnText}>المعرض</Text>
              </TouchableOpacity>
            </View>
          </View>
          {photoUri && (
            <Text style={styles.photoHint}>✓ صورة جديدة جاهزة للرفع عند الحفظ</Text>
          )}
        </View>

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

          <DatePickerField
            label="تاريخ الميلاد"
            value={birthDate}
            onChange={setBirthDate}
            placeholder="اختر تاريخ الميلاد"
            required
          />

          <Input
            label="الوزن (كغ)"
            placeholder="0.0"
            icon="fitness-outline"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
          />

          <Text style={styles.fieldLabel}>الحالة</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map(s => (
              <TouchableOpacity
                key={s.value}
                style={[styles.statusChip, status === s.value && styles.statusChipActive]}
                onPress={() => setStatus(s.value)}
              >
                <Text style={[styles.statusChipText, status === s.value && styles.statusChipTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>السلالة والموقع</Text>

          <Text style={styles.fieldLabel}>السلالة *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {breeds.map(b => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.chip, breedId === b.id && styles.chipActive]}
                  onPress={() => setBreedId(b.id)}
                >
                  <Text style={[styles.chipText, breedId === b.id && styles.chipTextActive]}>{b.nameAr}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.fieldLabel}>الحظيرة</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {pens.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, penId === p.id && styles.chipActive]}
                  onPress={() => setPenId(penId === p.id ? '' : p.id)}
                >
                  <Text style={[styles.chipText, penId === p.id && styles.chipTextActive]}>{p.nameAr}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.fieldLabel}>المالك</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {owners.map(o => (
                <TouchableOpacity
                  key={o.id}
                  style={[styles.chip, ownerId === o.id && styles.chipActive]}
                  onPress={() => setOwnerId(ownerId === o.id ? '' : o.id)}
                >
                  <Text style={[styles.chipText, ownerId === o.id && styles.chipTextActive]}>{o.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

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
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  statusChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusChipText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  statusChipTextActive: {
    color: '#fff',
    fontWeight: '600',
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
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  photoPreview: {
    width: 90,
    height: 90,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: 90,
    height: 90,
    borderRadius: Radius.md,
  },
  photoRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  photoExistingBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: Colors.surface,
    borderRadius: 10,
  },
  photoPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  photoButtons: {
    flex: 1,
    gap: Spacing.sm,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  photoBtnText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
  },
  photoHint: {
    ...Typography.small,
    color: Colors.success,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
});
