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

const FARM_TYPES = [
  { value: 'SHEEP', label: 'أغنام' },
  { value: 'CAMEL', label: 'إبل' },
  { value: 'MIXED', label: 'مختلط' },
];

export default function RegisterScreen() {
  const [farmName, setFarmName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [farmType, setFarmType] = useState('SHEEP');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!farmName.trim()) {
      setError('يرجى إدخال اسم المزرعة');
      return;
    }
    if (!fullName.trim()) {
      setError('يرجى إدخال الاسم الكامل');
      return;
    }
    if (!email.trim()) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!username.trim()) {
      setError('يرجى إدخال اسم المستخدم');
      return;
    }
    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('كلمة المرور يجب أن تحتوي على حرف كبير ورقم على الأقل');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await register({
        farmName: farmName.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        username: username.trim(),
        password,
        phone: phone.trim() || undefined,
        farmType,
      });
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="paw" size={40} color={Colors.textOnPrimary} />
          </View>
          <Text style={styles.appName}>إنشاء حساب جديد</Text>
          <Text style={styles.subtitle}>أنشئ مزرعتك وابدأ إدارة قطيعك</Text>
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
            label="اسم المزرعة *"
            placeholder="مثال: مزرعة النخيل"
            icon="business-outline"
            value={farmName}
            onChangeText={setFarmName}
          />

          {/* Farm Type Selector */}
          <Text style={styles.fieldLabel}>نوع المزرعة</Text>
          <View style={styles.farmTypeRow}>
            {FARM_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.farmTypeBtn,
                  farmType === type.value && styles.farmTypeBtnActive,
                ]}
                onPress={() => setFarmType(type.value)}
              >
                <Text
                  style={[
                    styles.farmTypeBtnText,
                    farmType === type.value && styles.farmTypeBtnTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="الاسم الكامل *"
            placeholder="أدخل اسمك الكامل"
            icon="person-outline"
            value={fullName}
            onChangeText={setFullName}
          />

          <Input
            label="البريد الإلكتروني *"
            placeholder="example@email.com"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Input
            label="اسم المستخدم *"
            placeholder="أدخل اسم المستخدم"
            icon="at-outline"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <View>
            <Input
              label="كلمة المرور *"
              placeholder="8 أحرف على الأقل مع حرف كبير ورقم"
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
            label="رقم الهاتف (اختياري)"
            placeholder="05xxxxxxxx"
            icon="call-outline"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Button
            title="إنشاء الحساب"
            onPress={handleRegister}
            loading={loading}
            fullWidth
            size="lg"
            icon="person-add-outline"
          />

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.loginLinkText}>
              لديك حساب بالفعل؟{' '}
              <Text style={styles.loginLinkBold}>تسجيل الدخول</Text>
            </Text>
          </TouchableOpacity>
        </View>

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
  appName: {
    ...Typography.h2,
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
    marginBottom: Spacing.xl,
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
  fieldLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textAlign: 'right',
  },
  farmTypeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  farmTypeBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  farmTypeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  farmTypeBtnText: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  farmTypeBtnTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  eyeButton: {
    position: 'absolute',
    start: Spacing.lg,
    top: 38,
    padding: Spacing.sm,
  },
  loginLink: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  loginLinkText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  loginLinkBold: {
    color: Colors.primary,
    fontWeight: '700',
  },
  footer: {
    ...Typography.small,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
});
