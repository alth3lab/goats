import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { searchApi } from '@/lib/api';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import { EmptyState } from '@/components/ui';
import { useToast } from '@/lib/toast';

const TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }> = {
  goat: { icon: 'paw', label: 'حيوان', color: Colors.primary },
  breeding: { icon: 'heart', label: 'تربية', color: Colors.female },
  health: { icon: 'medkit', label: 'صحة', color: Colors.success },
  sale: { icon: 'cash', label: 'بيع', color: Colors.warning },
  pen: { icon: 'home', label: 'حظيرة', color: Colors.info },
  owner: { icon: 'person', label: 'مالك', color: Colors.secondary },
};

interface SearchItem {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  meta?: Record<string, unknown>;
}

export default function SearchScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (text: string) => {
    if (text.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchApi.search(text.trim());
      setResults((data as unknown as SearchItem[]) || []);
    } catch {
      setResults([]);
      showToast('error', 'تعذّر تنفيذ البحث، حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const onChangeText = (text: string) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doSearch(text), 400);
  };

  const handlePress = (item: SearchItem) => {
    switch (item.type) {
      case 'goat':
        router.push(`/(tabs)/goats/${item.id}`);
        break;
      case 'breeding':
        router.push(`/(tabs)/breeding/${item.id}`);
        break;
      case 'pen':
        router.push('/pens');
        break;
      case 'owner':
        router.push('/owners');
        break;
      case 'health':
        router.push('/(tabs)/health');
        break;
      case 'sale':
        router.push('/(tabs)/sales');
        break;
    }
  };

  const grouped = results.reduce<Record<string, SearchItem[]>>((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title: 'البحث الشامل',
        headerShown: true,
        headerTintColor: Colors.primary,
        headerTitleStyle: { ...Typography.h4, color: Colors.text },
      }} />

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={Colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن حيوان، حظيرة، مالك..."
          placeholderTextColor={Colors.textLight}
          value={query}
          onChangeText={onChangeText}
          textAlign="right"
          autoFocus
          returnKeyType="search"
          onSubmitEditing={() => doSearch(query)}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
            <Ionicons name="close-circle" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>جارٍ البحث...</Text>
          </View>
        ) : !searched ? (
          <View style={styles.centered}>
            <Ionicons name="search" size={48} color={Colors.border} />
            <Text style={styles.hintText}>اكتب كلمة للبحث في جميع بيانات المزرعة</Text>
          </View>
        ) : results.length === 0 ? (
          <EmptyState icon="search" title="لا توجد نتائج" message={`لم يتم العثور على نتائج لـ "${query}"`} />
        ) : (
          Object.entries(grouped).map(([type, items]) => {
            const cfg = TYPE_CONFIG[type] || { icon: 'help-circle' as const, label: type, color: Colors.textSecondary };
            return (
              <View key={type} style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <View style={[styles.groupIcon, { backgroundColor: cfg.color + '15' }]}>
                    <Ionicons name={cfg.icon} size={16} color={cfg.color} />
                  </View>
                  <Text style={styles.groupTitle}>{cfg.label}</Text>
                  <Text style={styles.groupCount}>{items.length}</Text>
                </View>
                {items.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.resultCard} onPress={() => handlePress(item)} activeOpacity={0.7}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultTitle}>{item.title}</Text>
                      {item.subtitle && <Text style={styles.resultSubtitle}>{item.subtitle}</Text>}
                    </View>
                    <Ionicons name="chevron-back" size={16} color={Colors.textLight} />
                  </TouchableOpacity>
                ))}
              </View>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, margin: Spacing.lg,
    borderRadius: Radius.lg, paddingHorizontal: Spacing.md,
    ...Shadows.sm,
  },
  searchInput: {
    flex: 1, ...Typography.body, color: Colors.text,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    textAlign: 'right',
  },
  results: { flex: 1 },
  resultsContent: { paddingHorizontal: Spacing.lg },
  centered: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  loadingText: { ...Typography.body, color: Colors.textSecondary },
  hintText: { ...Typography.body, color: Colors.textLight, textAlign: 'center', paddingHorizontal: 40 },
  groupSection: { marginBottom: Spacing.xl },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  groupIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  groupTitle: { ...Typography.captionBold, color: Colors.textSecondary, flex: 1 },
  groupCount: { ...Typography.small, color: Colors.textLight, backgroundColor: Colors.background, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  resultCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm,
  },
  resultTitle: { ...Typography.bodyBold, color: Colors.text },
  resultSubtitle: { ...Typography.small, color: Colors.textLight, marginTop: 2 },
});
