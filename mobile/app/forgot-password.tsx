import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi, ApiError } from '@/lib/api';
import { Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography } from '@/lib/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('حدث خطأ في الاتصال. تأكد من اتصالك بالإنترنت.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="key-outline" size={40} color={Colors.textOnPrimary} />
          </View>
          <Text style={styles.title}>نسيت كلمة المرور</Text>
          <Text style={styles.subtitle}>أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين</Text>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          {sent ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
              </View>
              <Text style={styles.successTitle}>تم الإرسال</Text>
              <Text style={styles.successText}>
                إذا كان البريد الإلكتروني مسجلاً، ستتلقى رابط إعادة تعيين كلمة المرور. تحقق من بريدك الوارد.
              </Text>

              <Button
                title="إدخال رمز التعيين"
                onPress={() => router.push({ pathname: '/reset-password', params: { email: email.trim() } })}
                fullWidth
                size="lg"
                icon="key-outline"
              />

              <TouchableOpacity
                style={styles.backLink}
                onPress={() => router.replace('/login')}
              >
                <Text style={styles.backLinkText}>العودة لتسجيل الدخول</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {error ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color={Colors.error} />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              ) : null}

              <Input
                label="البريد الإلكتروني"
                placeholder="أدخل بريدك الإلكتروني"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Button
                title="إرسال رابط التعيين"
                onPress={handleSubmit}
                loading={loading}
                fullWidth
                size="lg"
                icon="send-outline"
              />

              <TouchableOpacity
                style={styles.backLink}
                onPress={() => router.replace('/login')}
              >
                <Text style={styles.backLinkText}>العودة لتسجيل الدخول</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h2,
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '10',
    borderColor: Colors.error + '30',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  errorBannerText: {
    ...Typography.caption,
    color: Colors.error,
    flex: 1,
    textAlign: 'right',
  },
  successContainer: {
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: Spacing.lg,
  },
  successTitle: {
    ...Typography.h3,
    color: Colors.success,
    marginBottom: Spacing.sm,
  },
  successText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    lineHeight: 24,
  },
  backLink: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  backLinkText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
});
