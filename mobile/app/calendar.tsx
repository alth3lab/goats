import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { calendarApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { LoadingScreen, EmptyState, Button, Input } from '@/components/ui';
import { Colors, Spacing, Radius, Typography, Shadows, EventTypeLabels } from '@/lib/theme';
import { formatDateShortMonth, western } from '@/lib/formatters';
import { useToast } from '@/lib/toast';
import { SearchBar } from '@/components/SearchBar';
import { validateDate, validateRequired } from '@/lib/validation';
import type { CalendarEvent, EventType } from '@/types';

const EVENT_TYPES: EventType[] = ['BIRTH', 'VACCINATION', 'DEWORMING', 'CHECKUP', 'BREEDING', 'WEANING', 'SALE', 'PURCHASE', 'MAINTENANCE', 'OTHER'];

const EVENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  BIRTH: 'heart-circle',
  VACCINATION: 'shield-checkmark',
  DEWORMING: 'bug',
  CHECKUP: 'eye',
  BREEDING: 'git-merge',
  WEANING: 'water',
  SALE: 'cash',
  PURCHASE: 'cart',
  MAINTENANCE: 'build',
  OTHER: 'ellipsis-horizontal-circle',
};

const EVENT_COLORS: Record<string, string> = {
  BIRTH: Colors.success,
  VACCINATION: Colors.info,
  DEWORMING: Colors.warning,
  CHECKUP: '#9C27B0',
  BREEDING: Colors.female,
  WEANING: Colors.primary,
  SALE: Colors.success,
  PURCHASE: Colors.error,
  MAINTENANCE: Colors.textSecondary,
  OTHER: Colors.textLight,
};

export default function CalendarScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [search, setSearch] = useState('');
  const { can } = useAuth();

  // Form
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<string>('OTHER');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const fetchEvents = useCallback(async () => {
    try {
      const data = await calendarApi.list();
      setEvents(data as unknown as CalendarEvent[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل الأحداث';
      showToast('error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = (showCompleted ? events : events.filter(e => !e.isCompleted))
    .filter(e => !search.trim() || e.title?.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase()));

  const upcomingCount = events.filter(e => !e.isCompleted).length;
  const completedCount = events.filter(e => e.isCompleted).length;

  const handleAdd = async () => {
    if (!validateRequired(formTitle, 'عنوان الحدث')) return;
    if (!validateDate(formDate, 'التاريخ', { required: true, allowFuture: true })) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: formTitle.trim(),
        eventType: formType,
        date: formDate,
      };
      if (formDesc.trim()) body.description = formDesc.trim();

      await calendarApi.create(body);
      setAddVisible(false);
      setFormTitle('');
      setFormType('OTHER');
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormDesc('');
      fetchEvents();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل إضافة الحدث';
      Alert.alert('خطأ', message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderEvent = ({ item }: { item: CalendarEvent }) => {
    const evColor = EVENT_COLORS[item.eventType] || Colors.textSecondary;
    const evIcon = EVENT_ICONS[item.eventType] || 'ellipsis-horizontal-circle';
    const eventDate = new Date(item.date);
    const isPast = eventDate < new Date() && !item.isCompleted;

    return (
      <View style={[styles.card, item.isCompleted && styles.cardCompleted]}>
        <View style={styles.dateColumn}>
          <Text style={styles.dateDay}>{western(eventDate.getDate())}</Text>
          <Text style={styles.dateMonth}>{formatDateShortMonth(eventDate)}</Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View style={styles.titleRow}>
              <View style={[styles.eventDot, { backgroundColor: evColor }]} />
              <Text style={[styles.eventTitle, item.isCompleted && styles.eventTitleCompleted]}>
                {item.title}
              </Text>
            </View>
            {item.isCompleted && (
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            )}
            {isPast && !item.isCompleted && (
              <Ionicons name="alert-circle" size={18} color={Colors.error} />
            )}
          </View>

          <View style={styles.eventMeta}>
            <View style={[styles.typeBadge, { backgroundColor: evColor + '12' }]}>
              <Ionicons name={evIcon} size={12} color={evColor} />
              <Text style={[styles.typeText, { color: evColor }]}>{EventTypeLabels[item.eventType]}</Text>
            </View>
          </View>

          {item.description && (
            <Text style={styles.eventDesc} numberOfLines={2}>{item.description}</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) return <LoadingScreen message="جارٍ التحميل..." />;

  return (
    <>
      <Stack.Screen options={{ title: 'التقويم والمواعيد', headerShown: true, headerStyle: { backgroundColor: Colors.primary }, headerTintColor: '#fff', headerTitleStyle: { ...Typography.h4, color: '#fff' }, headerTitleAlign: 'center' }} />
      <View style={styles.container}>
        {/* Stats & Toggle */}
        <View style={styles.header}>
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Ionicons name="time" size={16} color={Colors.warning} />
              <Text style={styles.statText}>{western(upcomingCount)} قادم</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.statText}>{western(completedCount)} مكتمل</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowCompleted(v => !v)}>
            <Ionicons name={showCompleted ? 'eye' : 'eye-off'} size={16} color={Colors.primary} />
            <Text style={styles.toggleText}>{showCompleted ? 'إخفاء المكتمل' : 'عرض المكتمل'}</Text>
          </TouchableOpacity>
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder="بحث بالعنوان..." />

        <FlatList
          data={filteredEvents}
          renderItem={renderEvent}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEvents(); }} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <EmptyState icon="calendar" title="لا يوجد مواعيد" message="أضف أول حدث في التقويم" action={{ title: 'إضافة حدث', onPress: () => setAddVisible(true) }} />
          }
          showsVerticalScrollIndicator={false}
        />

        {can('__owner_admin__') && (
          <TouchableOpacity style={styles.fab} onPress={() => setAddVisible(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        <Modal visible={addVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAddVisible(false)}>
              <Text style={styles.modalCancel}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>إضافة حدث</Text>
            <View style={{ width: 50 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Input label="العنوان *" placeholder="عنوان الحدث" icon="calendar-outline" value={formTitle} onChangeText={setFormTitle} />
            <Input label="التاريخ" placeholder="YYYY-MM-DD" icon="time-outline" value={formDate} onChangeText={setFormDate} />

            <Text style={styles.fieldLabel}>نوع الحدث</Text>
            <View style={styles.typeRow}>
              {EVENT_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeChip, formType === type && { backgroundColor: EVENT_COLORS[type], borderColor: EVENT_COLORS[type] }]}
                  onPress={() => setFormType(type)}
                >
                  <Ionicons name={EVENT_ICONS[type]} size={14} color={formType === type ? '#fff' : EVENT_COLORS[type]} />
                  <Text style={[styles.typeChipText, formType === type && { color: '#fff' }]}>{EventTypeLabels[type]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input label="الوصف" placeholder="تفاصيل الحدث" icon="document-text-outline" value={formDesc} onChangeText={setFormDesc} multiline />

            <Button title="إضافة الحدث" onPress={handleAdd} loading={submitting} fullWidth size="lg" icon="checkmark-circle-outline" />
            <View style={{ height: 40 }} />
          </ScrollView>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.surface, padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  statsRow: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.md },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { ...Typography.caption, color: Colors.text },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end' },
  toggleText: { ...Typography.small, color: Colors.primary },
  list: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingBottom: 100 },
  card: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: Spacing.md, overflow: 'hidden', ...Shadows.sm },
  cardCompleted: { opacity: 0.6 },
  dateColumn: { width: 56, backgroundColor: Colors.primary + '08', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg },
  dateDay: { ...Typography.h3, color: Colors.primary },
  dateMonth: { ...Typography.small, color: Colors.primary },
  cardContent: { flex: 1, padding: Spacing.lg },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  eventDot: { width: 8, height: 8, borderRadius: 4 },
  eventTitle: { ...Typography.captionBold, color: Colors.text, flex: 1 },
  eventTitleCompleted: { textDecorationLine: 'line-through', color: Colors.textLight },
  eventMeta: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full },
  typeText: { ...Typography.small },
  eventDesc: { ...Typography.small, color: Colors.textLight },
  fab: { position: 'absolute', bottom: 24, start: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center', ...Shadows.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, backgroundColor: Colors.surface },
  modalTitle: { ...Typography.h4, color: Colors.text },
  modalCancel: { ...Typography.captionBold, color: Colors.error },
  modalContent: { padding: Spacing.xl },
  fieldLabel: { ...Typography.captionBold, color: Colors.text, marginBottom: Spacing.sm, textAlign: 'right' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  typeChipText: { ...Typography.small, color: Colors.textSecondary },
});
