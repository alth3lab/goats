import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { Colors, Typography } from '@/lib/theme';

export default function GoatsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : Colors.surface },
        headerTransparent: Platform.OS === 'ios',
        headerBlurEffect: 'systemChromeMaterial',
        headerTintColor: Colors.primary,
        headerTitleStyle: { ...Typography.h4, color: Colors.text },
        headerTitleAlign: 'center',
        headerBackTitle: 'رجوع',
        headerShadowVisible: false,
        animation: 'default',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'إدارة القطيع', headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'تفاصيل الحيوان' }} />
      <Stack.Screen name="add" options={{ title: 'إضافة حيوان' }} />
      <Stack.Screen name="edit" options={{ title: 'تعديل الحيوان' }} />
    </Stack>
  );
}
