import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Debounce delay in ms (0 = no debounce). Default 300. */
  debounceMs?: number;
}

export function SearchBar({ value, onChangeText, placeholder = 'بحث...', debounceMs = 300 }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value changes (e.g. clear from parent)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (text: string) => {
    setLocalValue(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (debounceMs <= 0) {
      onChangeText(text);
    } else {
      timerRef.current = setTimeout(() => onChangeText(text), debounceMs);
    }
  };

  const handleClear = () => {
    setLocalValue('');
    if (timerRef.current) clearTimeout(timerRef.current);
    onChangeText('');
  };

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <View style={styles.searchWrap}>
      <Ionicons name="search" size={20} color={Colors.textLight} />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor={Colors.textLight}
        value={localValue}
        onChangeText={handleChange}
        textAlign="right"
      />
      {localValue ? (
        <TouchableOpacity onPress={handleClear}>
          <Ionicons name="close-circle" size={20} color={Colors.textLight} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.caption,
    color: Colors.text,
    paddingVertical: 0,
  },
});
