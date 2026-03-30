import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
        { icon: 'card', label: 'الاشتراك والفواتير', subtitle: 'خطة الاشتراك والاستخدام', color: '#8b5cf6', onPress: () => router.push('/billing') },
        { icon: 'swap-horizontal', label: 'تبديل المزرعة', subtitle: farm?.nameAr || farm?.name || '—', color: Colors.primary, onPress: handleSwitchFarm },
        { icon: 'settings', label: 'الإعدادات', subtitle: 'إعدادات التطبيق', color: Colors.textSecondary, onPress: () => router.push('/settings') },
        { icon: 'log-out', label: 'تسجيل الخروج', subtitle: '', color: Colors.error, onPress: handleLogout },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={32} color={Colors.textOnPrimary} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.fullName}</Text>
          <Text style={styles.profileRole}>{user?.role === 'SUPER_ADMIN' ? 'مدير النظام' : user?.role === 'OWNER' ? 'مالك' : user?.role === 'ADMIN' ? 'مسؤول' : 'مستخدم'}</Text>
          <Text style={styles.profileFarm}>{farm?.nameAr || farm?.name}</Text>
        </View>
      </View>

      {/* Menu Sections */}
      {menuSections.map((section, si) => (
        <View key={si} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.menuCard}>
            {section.items.map((item, ii) => (
              <TouchableOpacity
                key={ii}
                style={[styles.menuItem, ii < section.items.length - 1 && styles.menuItemBorder]}
                onPress={item.onPress}
                activeOpacity={0.6}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.color + '12' }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.subtitle ? <Text style={styles.menuSubtitle}>{item.subtitle}</Text> : null}
                </View>
                <Ionicons name="chevron-back" size={18} color={Colors.textLight} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>وبر وصوف — نسخة 1.0.0</Text>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
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

  // Profile
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xxl,
    gap: Spacing.lg,
    ...Shadows.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...Typography.h3,
    color: '#fff',
  },
  profileRole: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  profileFarm: {
    ...Typography.small,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },

  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    paddingHorizontal: 4,
    textAlign: 'right',
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    ...Shadows.sm,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
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
    paddingVertical: Spacing.lg,
  },
  appInfoText: {
    ...Typography.small,
    color: Colors.textLight,
  },
});
