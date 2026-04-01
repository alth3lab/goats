import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '@/lib/api';
import { removeToken } from '@/lib/storage';
import { useAuth } from '@/lib/auth';
import { Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const CONFIRM_PHRASE = 'احذف حسابي';

export default function DeleteAccountScreen() {
  const { logout } = useAuth();
  const { showToast } = useToast();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const confirmed = confirmText.trim() === CONFIRM_PHRASE;

  const handleDelete = () => {
    Alert.alert(
      'تأكيد الحذف النهائي',
      'هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك وبيانات مزرعتك نهائياً.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف نهائياً',
          style: 'destructive',
          onPress: performDelete,
        },
      ]
    );
  };

  const performDelete = async () => {
    setDeleting(true);
    try {
      await authApi.deleteAccount();
      // Clear local auth state
      await removeToken();
      await logout();
      showToast('success', 'تم حذف الحساب بنجاح');
      // Navigate to login (replace so user can't go back)
      router.replace('/login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل حذف الحساب';
      showToast('error', message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'حذف الحساب',
          headerShown: true,
          headerStyle: { backgroundColor: Colors.error },
          headerTintColor: '#fff',
          headerTitleStyle: { ...Typography.h4, color: '#fff' },
          headerTitleAlign: 'center',
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Warning icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="warning" size={64} color={Colors.error} />
        </View>

        {/* Main warning */}
        <Text style={styles.title}>تحذير: حذف الحساب نهائي</Text>
        <Text style={styles.body}>
          سيؤدي حذف حسابك إلى إزالة جميع بياناتك بشكل دائم وغير قابل للتراجع،
          بما في ذلك:
        </Text>

        {/* Bullet list of data that will be deleted */}
        <View style={styles.listCard}>
          {[
            'بيانات الماعز والحيوانات',
            'سجلات الصحة والتطعيمات',
            'سجلات التغذية والأعلاف',
            'بيانات المبيعات والمصروفات',
            'بيانات التربية والتكاثر',
            'معلومات الحظائر والملاك',
            'جميع التقارير والإحصائيات',
            'بيانات أعضاء الفريق',
          ].map((item) => (
            <View key={item} style={styles.listItem}>
              <Ionicons name="close-circle" size={18} color={Colors.error} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Confirmation input */}
        <View style={styles.confirmSection}>
          <Text style={styles.confirmLabel}>
            لتأكيد الحذف، اكتب العبارة التالية بالضبط:
          </Text>
          <Text style={styles.confirmPhrase}>{CONFIRM_PHRASE}</Text>
          <Input
            placeholder={CONFIRM_PHRASE}
            value={confirmText}
            onChangeText={setConfirmText}
            icon="text-outline"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Delete button */}
        <Button
          title="حذف حسابي نهائياً"
          onPress={handleDelete}
          loading={deleting}
          disabled={!confirmed || deleting}
          fullWidth
          size="lg"
          icon="trash-outline"
          style={StyleSheet.flatten([styles.deleteButton, !confirmed && styles.deleteButtonDisabled]) as ViewStyle}
        />

        {/* Cancel link */}
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelLink}>
          <Text style={styles.cancelText}>إلغاء والعودة</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, alignItems: 'stretch' },
  iconContainer: { alignItems: 'center', marginVertical: Spacing.xl },
  title: {
    ...Typography.h3,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  body: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  listCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.error + '40',
    ...Shadows.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  listText: { ...Typography.body, color: Colors.text, flex: 1 },
  confirmSection: { marginBottom: Spacing.xl },
  confirmLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  confirmPhrase: {
    ...Typography.h4,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
    letterSpacing: 1,
  },
  deleteButton: { backgroundColor: Colors.error, marginBottom: Spacing.md },
  deleteButtonDisabled: { opacity: 0.5 },
  cancelLink: { alignItems: 'center', paddingVertical: Spacing.md },
  cancelText: { ...Typography.body, color: Colors.textSecondary, textDecorationLine: 'underline' },
});
