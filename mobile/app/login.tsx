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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography } from '@/lib/theme';
import { ApiError } from '@/lib/api';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(identifier.trim(), password);
      router.replace('/(tabs)');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err && typeof err === 'object' && 'message' in err) {
        setError(String((err as { message?: unknown }).message || 'حدث خطأ غير معروف'));
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
        {/* Logo / Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="paw" size={48} color={Colors.textOnPrimary} />
          </View>
          <Text style={styles.appName}>وبر وصوف</Text>
          <Text style={styles.subtitle}>نظام إدارة المواشي</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>تسجيل الدخول</Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={Colors.error} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="اسم المستخدم أو البريد"
            placeholder="أدخل اسم المستخدم"
            icon="person-outline"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <View>
            <Input
              label="كلمة المرور"
              placeholder="أدخل كلمة المرور"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
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

          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => router.push('/forgot-password')}
          >
            <Text style={styles.forgotLinkText}>نسيت كلمة المرور؟</Text>
          </TouchableOpacity>

          <Button
            title="دخول"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="lg"
            icon="log-in-outline"
          />

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.replace('/register')}
          >
            <Text style={styles.registerLinkText}>
              ليس لديك حساب؟{' '}
              <Text style={styles.registerLinkBold}>إنشاء حساب جديد</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>وبر وصوف © ٢٠٢٦</Text>
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
    marginBottom: Spacing.xxxl,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  appName: {
    ...Typography.h1,
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.8)',
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    marginBottom: Spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  formTitle: {
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
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
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.md,
  },
  forgotLinkText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  footer: {
    ...Typography.small,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  registerLink: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  registerLinkText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  registerLinkBold: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
