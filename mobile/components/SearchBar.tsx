import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Pressable, StyleSheet, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography } from '@/lib/theme';

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

  useEffect(() => { setLocalValue(value); }, [value]);

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

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <View style={styles.searchWrap}>
      <Ionicons name="search" size={17} color={Colors.textLight} />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor={Colors.textLight}
        value={localValue}
        onChangeText={handleChange}
        textAlign={I18nManager.isRTL ? 'right' : 'left'}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
        accessibilityRole="search"
      />
      {localValue ? (
        <Pressable
          onPress={handleClear}
          hitSlop={8}
          style={({ pressed }) => pressed && { opacity: 0.5 }}
          accessibilityRole="button"
          accessibilityLabel="مسح البحث"
        >
          <Ionicons name="close-circle" size={17} color={Colors.textLight} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    // iOS native search bar: gray filled, no border, no shadow, pill shape
    backgroundColor: 'rgba(118,118,128,0.12)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    height: 36,
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.caption,
    color: Colors.text,
    paddingVertical: 0,
  },
});
