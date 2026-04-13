import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import { Colors, Typography } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { Redirect } from 'expo-router';
import { LoadingScreen } from '@/components/ui';

export default function TabsLayout() {
  const { user, loading, farm } = useAuth();

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : Colors.surface,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              tint="systemChromeMaterial"
              intensity={100}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
        // iOS native header style
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTintColor: Colors.text,
        headerTitleStyle: {
          ...Typography.h3,
          color: Colors.text,
        },
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ focused, color, size }) =>
            Platform.OS === 'ios' ? (
              <SymbolView name={focused ? 'house.fill' : 'house'} size={size} tintColor={color} />
            ) : (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="goats"
        options={{
          title: 'القطيع',
          tabBarIcon: ({ focused, color, size }) =>
            Platform.OS === 'ios' ? (
              <SymbolView name={focused ? 'pawprint.fill' : 'pawprint'} size={size} tintColor={color} />
            ) : (
              <Ionicons name={focused ? 'paw' : 'paw-outline'} size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="breeding"
        options={{
          title: 'التزاوج',
          tabBarIcon: ({ focused, color, size }) =>
            Platform.OS === 'ios' ? (
              <SymbolView name={focused ? 'heart.fill' : 'heart'} size={size} tintColor={color} />
            ) : (
              <Ionicons name={focused ? 'heart' : 'heart-outline'} size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'الصحة',
          tabBarIcon: ({ focused, color, size }) =>
            Platform.OS === 'ios' ? (
              <SymbolView name={focused ? 'cross.case.fill' : 'cross.case'} size={size} tintColor={color} />
            ) : (
              <Ionicons name={focused ? 'medkit' : 'medkit-outline'} size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'المبيعات',
          tabBarIcon: ({ focused, color, size }) =>
            Platform.OS === 'ios' ? (
              <SymbolView name={focused ? 'banknote.fill' : 'banknote'} size={size} tintColor={color} />
            ) : (
              <Ionicons name={focused ? 'cash' : 'cash-outline'} size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'المزيد',
          tabBarIcon: ({ focused, color, size }) =>
            Platform.OS === 'ios' ? (
              <SymbolView name={focused ? 'square.grid.2x2.fill' : 'square.grid.2x2'} size={size} tintColor={color} />
            ) : (
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}
