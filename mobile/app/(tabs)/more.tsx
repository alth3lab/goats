import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  I18nManager,
  Platform,
} from 'react-native';import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useAuth } from '@/lib/auth';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  subtitle?: string;
  onPress: () => void;
}

export default function MoreScreen() {
  const { user, farm, farms, logout, switchFarm } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد أنك تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: () => { logout(); router.replace('/login'); } },
    ]);
  };

  const handleSwitchFarm = () => {
    if (farms.length <= 1) {
      Alert.alert('ملاحظة', 'لا يوجد مزارع أخرى للتبديل');
      return;
    }
    Alert.alert(
      'تبديل المزرعة',
      'اختر المزرعة',
      farms.map(f => ({
        text: f.nameAr || f.name,
        onPress: () => switchFarm(f.id),
      })),
    );
  };

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'إدارة المزرعة',
      items: [
        { icon: 'nutrition', label: 'الأعلاف', subtitle: 'إدارة المخزون والتغذية', color: Colors.warning, onPress: () => router.push('/feeds') },
        { icon: 'beaker', label: 'خلطات الأعلاف', subtitle: 'الخلطات وإعادة الطلب', color: '#8b5cf6', onPress: () => router.push('/feed-recipes') },
        { icon: 'home', label: 'الحظائر', subtitle: 'إدارة الحظائر والسعة', color: Colors.info, onPress: () => router.push('/pens') },
        { icon: 'people', label: 'الملاك', subtitle: 'إدارة ملاك الحيوانات', color: Colors.secondary, onPress: () => router.push('/owners') },
        { icon: 'cube', label: 'المخزون', subtitle: 'الأدوية والمستلزمات مع سجل الحركات', color: Colors.primary, onPress: () => router.push('/inventory') },
        { icon: 'wallet', label: 'المصروفات', subtitle: 'تتبع المصاريف', color: Colors.error, onPress: () => router.push('/expenses') },
        { icon: 'people-circle', label: 'الفريق', subtitle: 'إدارة أعضاء الفريق', color: '#5C6BC0', onPress: () => router.push('/team') },
        { icon: 'business', label: 'المزارع', subtitle: 'إدارة وتبديل المزارع', color: '#00897B', onPress: () => router.push('/farms') },
      ],
    },
    {
      title: 'أدوات',
      items: [
        { icon: 'sparkles', label: 'المساعد الذكي', subtitle: 'دردشة ذكاء اصطناعي', color: '#FF6F00', onPress: () => router.push('/ai-chat') },
        { icon: 'search', label: 'البحث الشامل', subtitle: 'بحث في جميع البيانات', color: Colors.primary, onPress: () => router.push('/search') },
        { icon: 'bar-chart', label: 'التقارير', subtitle: 'تقارير وإحصائيات مع تصدير PDF', color: Colors.info, onPress: () => router.push('/reports') },
        { icon: 'shield-checkmark', label: 'بروتوكولات التطعيم', subtitle: 'جداول وتنبيهات التطعيم', color: Colors.success, onPress: () => router.push('/vaccination-protocols') },
        { icon: 'calendar', label: 'التقويم', subtitle: 'المواعيد والتذكيرات', color: '#26A69A', onPress: () => router.push('/calendar') },
        { icon: 'time', label: 'سجل النشاط', subtitle: 'متابعة العمليات', color: '#9C27B0', onPress: () => router.push('/activities') },
      ],
    },
    {
      title: 'الحساب',
      items: [
        { icon: 'swap-horizontal', label: 'تبديل المزرعة', subtitle: farm?.nameAr || farm?.name || '—', color: Colors.primary, onPress: handleSwitchFarm },
        { icon: 'settings', label: 'الإعدادات', subtitle: 'إعدادات التطبيق', color: Colors.textSecondary, onPress: () => router.push('/settings') },
        { icon: 'log-out', label: 'تسجيل الخروج', subtitle: '', color: Colors.error, onPress: handleLogout },
      ],
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Row — iOS Settings style */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color={Colors.textOnPrimary} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.fullName}</Text>
          <Text style={styles.profileMeta}>
            {user?.role === 'SUPER_ADMIN' ? 'مدير النظام' : user?.role === 'OWNER' ? 'مالك' : user?.role === 'ADMIN' ? 'مسؤول' : 'مستخدم'} · {farm?.nameAr || farm?.name}
          </Text>
        </View>
        <Ionicons
          name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'}
          size={18}
          color={Colors.textLight}
        />
      </View>

      {/* Menu Sections */}
      {menuSections.map((section, si) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.menuCard}>
            {section.items.map((item, ii) => (
              <Pressable
                key={ii}
                style={({ pressed }) => [
                  styles.menuItem,
                  ii < section.items.length - 1 && styles.menuItemBorder,
                  pressed && styles.menuItemPressed,
                ]}
                onPress={() => {
                  if (Platform.OS === 'ios') Haptics.selectionAsync();
                  item.onPress();
                }}
                accessibilityRole="menuitem"
                accessibilityLabel={item.label}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.subtitle ? <Text style={styles.menuSubtitle}>{item.subtitle}</Text> : null}
                </View>
                <Ionicons
                  name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'}
                  size={16}
                  color={Colors.textLight}
                />
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>وبر وصوف — نسخة {Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },

  // Profile — iOS Settings style (grouped cell, not banner)
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    gap: Spacing.lg,
    ...Shadows.xs,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  profileMeta: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    paddingHorizontal: 4,
    textAlign: 'right',
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 13,
    gap: Spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  menuItemPressed: {
    backgroundColor: Colors.surfaceVariant,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    ...Typography.body,
    color: Colors.text,
  },
  menuSubtitle: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  // App Info
  appInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  appInfoText: {
    ...Typography.small,
    color: Colors.textLight,
  },
});
