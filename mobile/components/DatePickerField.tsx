import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';

interface DatePickerFieldProps {
  label: string;
  value: string;               // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  required?: boolean;
  maximumDate?: Date;
  minimumDate?: Date;
}

function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export default function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'اختر التاريخ',
  required,
  maximumDate = new Date(),
  minimumDate,
}: DatePickerFieldProps) {
  const [show, setShow] = useState(false);

  const handleNativeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShow(Platform.OS === 'ios');
    if (selectedDate) {
      onChange(formatDateString(selectedDate));
    }
  };

  const dateObj = value ? new Date(value) : new Date();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}{required ? ' *' : ''}
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
        <Text style={[styles.buttonText, !value && styles.placeholder]}>
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textLight} />
      </TouchableOpacity>

      {/* Native Android/iOS */}
      {show && Platform.OS !== 'web' && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          locale="en-GB"
          onChange={handleNativeChange}
        />
      )}

      {/* Web fallback */}
      {show && Platform.OS === 'web' && (
        <Modal transparent animationType="fade" onRequestClose={() => setShow(false)}>
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setShow(false)}
          >
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>{label}</Text>
              <input
                type="date"
                value={value}
                max={maximumDate ? formatDateString(maximumDate) : undefined}
                min={minimumDate ? formatDateString(minimumDate) : undefined}
                onChange={(e: { target: { value: string } }) => {
                  onChange(e.target.value);
                  setShow(false);
                }}
                style={{
                  fontSize: 18,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  width: '100%',
                  direction: 'ltr',
                }}
              />
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShow(false)}>
                <Text style={styles.closeBtnText}>إغلاق</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.captionBold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'right',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  buttonText: {
    ...Typography.body,
    flex: 1,
    color: Colors.text,
    textAlign: 'left',
  },
  placeholder: {
    color: Colors.textLight,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    width: '85%',
    maxWidth: 360,
    ...Shadows.md,
  },
  modalTitle: {
    ...Typography.h4,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  closeBtn: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  closeBtnText: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
});
