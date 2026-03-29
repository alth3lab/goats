import { Stack } from 'expo-router';
import { Colors, Typography } from '@/lib/theme';

export default function HealthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { ...Typography.h4, color: '#fff' },
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'السجلات الصحية' }} />
    </Stack>
  );
}
