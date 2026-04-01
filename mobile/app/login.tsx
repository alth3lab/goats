import React, { useState, useEffect, useCallback } from 'react';
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
import {
  getAvailableBiometric,
  authenticateWithBiometrics,
  getBiometricEnabled,
  setBiometricEnabled,
  getBiometricIdentifier,
  setBiometricIdentifier,
  type BiometricType,
} from '@/lib/useBiometrics';
import { getToken } from '@/lib/storage';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  // Check biometric hardware + saved preference on mount
  useEffect(() => {
    (async () => {
      const type = await getAvailableBiometric();
      setBiometricType(type);
      if (type !== 'none') {
        const enabled = await getBiometricEnabled();
        setBiometricEnabledState(enabled);
        // Auto-prompt if already enrolled and token exists
        if (enabled) {
          const token = await getToken();
          if (token) {
            handleBiometricLogin(true);
          }
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBiometricLogin = useCallback(async (silent = false) => {
    setBiometricLoading(true);
    const label = biometricType === 'face' ? 'Face ID' : 'البصمة';
    const success = await authenticateWithBiometrics(`تسجيل الدخول بـ${label}`);
    setBiometricLoading(false);

    if (success) {
      // Token still valid — navigate directly
      const token = await getToken();
      if (token) {
        router.replace('/(tabs)');
        return;
      }
      // Token is gone; ask user to log in with password to re-enroll
      if (!silent) {
        Alert.alert('انتهت الجلسة', 'يرجى إدخال كلمة المرور لتجديد الجلسة.');
      }
    } else if (!silent) {
      Alert.alert('فشل التحقق', `تعذّر التحقق بـ${label}. يرجى استخدام كلمة المرور.`);
    }
  }, [biometricType, router]);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(identifier.trim(), password);

      // After successful password login, offer to enable biometrics if available and not yet on
      if (biometricType !== 'none' && !biometricEnabled) {
        const label = biometricType === 'face' ? 'Face ID' : 'البصمة';
        Alert.alert(
          `تفعيل ${label}`,
          `هل تريد تسجيل الدخول بـ${label} في المرات القادمة؟`,
          [
            { text: 'لا شكرًا', style: 'cancel' },
            {
              text: 'تفعيل',
              onPress: async () => {
                await setBiometricEnabled(true);
                await setBiometricIdentifier(identifier.trim());
                setBiometricEnabledState(true);
              },
            },
          ],
        );
      } else if (biometricEnabled) {
        // Update stored identifier in case user changed account
        await setBiometricIdentifier(identifier.trim());
      }

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

  const biometricIcon = biometricType === 'face' ? 'scan-outline' : 'finger-print-outline';
  const biometricLabel = biometricType === 'face' ? 'Face ID' : 'البصمة';

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

          {/* Biometric quick-login button */}
          {biometricType !== 'none' && biometricEnabled && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={() => handleBiometricLogin(false)}
              disabled={biometricLoading}
            >
              <Ionicons name={biometricIcon} size={28} color={Colors.primary} />
              <Text style={styles.biometricText}>
                {biometricLoading ? 'جارٍ التحقق...' : `تسجيل الدخول بـ${biometricLabel}`}
              </Text>
            </TouchableOpacity>
          )}

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

          {/* Enable/disable biometrics link */}
          {biometricType !== 'none' && (
            <TouchableOpacity
              style={styles.biometricToggle}
              onPress={async () => {
                const next = !biometricEnabled;
                await setBiometricEnabled(next);
                setBiometricEnabledState(next);
                if (next && identifier.trim()) {
                  await setBiometricIdentifier(identifier.trim());
                }
              }}
            >
              <Ionicons
                name={biometricEnabled ? 'shield-checkmark-outline' : 'shield-outline'}
                size={16}
                color={Colors.primary}
              />
              <Text style={styles.biometricToggleText}>
                {biometricEnabled ? `إيقاف ${biometricLabel}` : `تفعيل ${biometricLabel}`}
              </Text>
            </TouchableOpacity>
          )}

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
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary + '12',
    borderColor: Colors.primary + '40',
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  biometricText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  biometricToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  biometricToggleText: {
    ...Typography.caption,
    color: Colors.primary,
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
