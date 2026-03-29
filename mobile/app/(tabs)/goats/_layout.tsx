import { Stack } from 'expo-router';
import { Colors, Typography } from '@/lib/theme';

export default function GoatsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { ...Typography.h4, color: '#fff' },
        headerTitleAlign: 'center',
        animation: 'slide_from_left',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'إدارة القطيع' }} />
      <Stack.Screen name="[id]" options={{ title: 'تفاصيل الحيوان' }} />
      <Stack.Screen name="add" options={{ title: 'إضافة حيوان' }} />
    </Stack>
  );
}
