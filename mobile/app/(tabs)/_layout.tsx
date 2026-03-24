import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { LoadingScreen } from '@/components/ui';

export default function TabsLayout() {
  const { user, loading, farm } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading]);

  if (loading || !user) return <LoadingScreen message="جارٍ التحميل..." />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.borderLight,
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          ...Typography.small,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          ...Typography.h4,
          color: '#fff',
        },
        headerTitleAlign: 'center',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          headerTitle: farm?.nameAr || 'وبر وصوف',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="goats/index"
        options={{
          title: 'القطيع',
          headerTitle: 'إدارة القطيع',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="paw" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="health/index"
        options={{
          title: 'الصحة',
          headerTitle: 'السجلات الصحية',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medkit" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sales/index"
        options={{
          title: 'المبيعات',
          headerTitle: 'المبيعات',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'المزيد',
          headerTitle: 'المزيد',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden screens accessible via navigation */}
      <Tabs.Screen
        name="goats/[id]"
        options={{
          href: null, // Hide from tab bar
          headerTitle: 'تفاصيل الحيوان',
        }}
      />
      <Tabs.Screen
        name="goats/add"
        options={{
          href: null,
          headerTitle: 'إضافة حيوان',
        }}
      />
    </Tabs>
  );
}
