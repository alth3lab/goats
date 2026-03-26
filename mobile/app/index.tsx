import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { LoadingScreen } from '@/components/ui';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="جارٍ التحميل..." />;
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}
