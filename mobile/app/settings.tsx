import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { settingsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LoadingScreen, Button, Input, SectionHeader } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import type { FarmSettings } from '@/types';

export default function SettingsScreen() {
  const { farm } = useAuth();
  const [settings, setSettings] = useState<FarmSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  // Editable fields
  const [farmName, setFarmName] = useState('');
  const [farmNameAr, setFarmNameAr] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('');
  const [penCapacity, setPenCapacity] = useState('');
  const [deathCount, setDeathCount] = useState('');
  const [deathWindow, setDeathWindow] = useState('');
  const [breedingOverdue, setBreedingOverdue] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      const data = await settingsApi.get();
      const s = data as unknown as FarmSettings;
      setSettings(s);
      setFarmName(s.farmName || '');
      setFarmNameAr(s.farmNameAr || '');
      setPhone(s.phone || '');
      setAddress(s.address || '');
      setCurrency(s.currency || '');
      setPenCapacity(s.alertPenCapacityPercent?.toString() || '');
      setDeathCount(s.alertDeathCount?.toString() || '');
      setDeathWindow(s.alertDeathWindowDays?.toString() || '');
      setBreedingOverdue(s.alertBreedingOverdueDays?.toString() || '');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل الإعدادات';
      showToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        farmName,
        farmNameAr,
        phone,
        address,
        currency,
      };
      if (penCapacity) body.alertPenCapacityPercent = parseInt(penCapacity);
      if (deathCount) body.alertDeathCount = parseInt(deathCount);
      if (deathWindow) body.alertDeathWindowDays = parseInt(deathWindow);
      if (breedingOverdue) body.alertBreedingOverdueDays = parseInt(breedingOverdue);

      await settingsApi.update(body);
      Alert.alert('نجاح', 'تم حفظ الإعدادات بنجاح');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل حفظ الإعدادات';
      Alert.alert('خطأ', message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;

  return (
    <>
      <Stack.Screen options={{ title: 'الإعدادات', headerShown: true, headerStyle: { backgroundColor: Colors.primary }, headerTintColor: '#fff', headerTitleStyle: { ...Typography.h4, color: '#fff' }, headerTitleAlign: 'center' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSettings(); }} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Farm Info */}
        <View style={styles.section}>
          <SectionHeader title="معلومات المزرعة" />
          <View style={styles.card}>
            <Input label="اسم المزرعة (إنجليزي)" placeholder="Farm Name" icon="business-outline" value={farmName} onChangeText={setFarmName} />
            <Input label="اسم المزرعة (عربي)" placeholder="اسم المزرعة" icon="business-outline" value={farmNameAr} onChangeText={setFarmNameAr} />
            <Input label="الهاتف" placeholder="رقم الهاتف" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Input label="العنوان" placeholder="عنوان المزرعة" icon="location-outline" value={address} onChangeText={setAddress} />
            <Input label="العملة" placeholder="مثال: AED / SAR" icon="cash-outline" value={currency} onChangeText={setCurrency} />
          </View>
        </View>

        {/* Alert Settings */}
        <View style={styles.section}>
          <SectionHeader title="إعدادات التنبيهات" />
          <View style={styles.card}>
            <Input label="نسبة سعة الحظيرة للتنبيه %" placeholder="80" icon="home-outline" value={penCapacity} onChangeText={setPenCapacity} keyboardType="number-pad" />
            <Input label="عدد حالات النفوق للتنبيه" placeholder="3" icon="alert-circle-outline" value={deathCount} onChangeText={setDeathCount} keyboardType="number-pad" />
            <Input label="فترة متابعة النفوق (أيام)" placeholder="30" icon="calendar-outline" value={deathWindow} onChangeText={setDeathWindow} keyboardType="number-pad" />
            <Input label="أيام تأخر التلقيح للتنبيه" placeholder="180" icon="time-outline" value={breedingOverdue} onChangeText={setBreedingOverdue} keyboardType="number-pad" />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <SectionHeader title="معلومات التطبيق" />
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>المزرعة الحالية</Text>
              <Text style={styles.infoValue}>{farm?.nameAr || farm?.name || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>نوع المزرعة</Text>
              <Text style={styles.infoValue}>{farm?.farmType || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>إصدار التطبيق</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
          </View>
        </View>

        <Button
          title="حفظ الإعدادات"
          onPress={handleSave}
          loading={saving}
          fullWidth
          size="lg"
          icon="save-outline"
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  section: { marginBottom: Spacing.xl },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, ...Shadows.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  infoLabel: { ...Typography.caption, color: Colors.textSecondary },
  infoValue: { ...Typography.captionBold, color: Colors.text },
});
