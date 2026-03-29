import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi, ApiError } from '@/lib/api';
import { Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography } from '@/lib/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email || '');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    if (!email.trim()) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!token.trim()) {
      setError('يرجى إدخال رمز إعادة التعيين');
      return;
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await authApi.resetPassword(email.trim(), token.trim(), password);
      Alert.alert(
        'تم بنجاح',
        'تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.',
        [{ text: 'تسجيل الدخول', onPress: () => router.replace('/login') }]
      );
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
            <Ionicons name="lock-open-outline" size={40} color={Colors.textOnPrimary} />
          </View>
          <Text style={styles.title}>إعادة تعيين كلمة المرور</Text>
          <Text style={styles.subtitle}>أدخل الرمز المرسل إلى بريدك وكلمة المرور الجديدة</Text>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
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

          <Input
            label="رمز إعادة التعيين"
            placeholder="الصق الرمز من رابط البريد الإلكتروني"
            icon="key-outline"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
          />

          <View>
            <Input
              label="كلمة المرور الجديدة"
              placeholder="6 أحرف على الأقل"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <Input
            label="تأكيد كلمة المرور"
            placeholder="أعد إدخال كلمة المرور"
            icon="shield-checkmark-outline"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
          />

          <Button
            title="تغيير كلمة المرور"
            onPress={handleReset}
            loading={loading}
            fullWidth
            size="lg"
            icon="checkmark-circle-outline"
          />

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.backLinkText}>العودة لتسجيل الدخول</Text>
          </TouchableOpacity>
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
  eyeButton: {
    position: 'absolute',
    start: Spacing.lg,
    top: 38,
    padding: Spacing.sm,
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
