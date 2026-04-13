import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { aiApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Colors, Spacing, Radius, Typography, Shadows } from '@/lib/theme';
import type { AIChatMessage } from '@/types';

const SUGGESTED_QUESTIONS = [
  'ما هي أفضل الممارسات لتربية الأغنام؟',
  'كيف أعالج الإسهال في الماعز؟',
  'ما هي جدول التطعيمات الموصى بها؟',
  'نصائح لزيادة إنتاج الحليب',
  'كيف أختار الكباش للتلقيح؟',
  'ما أسباب نفوق المواليد؟',
];

export default function AIChatScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: AIChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const chatHistory = updatedMessages.map(m => ({ role: m.role, content: m.content }));
      const responseText = await aiApi.chat(chatHistory);

      const aiMsg: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText || 'عذراً، لم أتمكن من الإجابة.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ في الاتصال';
      const errorMsg: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `عذراً، ${msg}. حاول مرة أخرى.`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [loading, messages]);

  const handleImageAnalysis = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
      });

      if (result.canceled || !result.assets[0]) return;

      setAnalyzing(true);
      const uri = result.assets[0].uri;

      const resized = await manipulateAsync(uri, [{ resize: { width: 800 } }], {
        format: SaveFormat.JPEG,
        compress: 0.7,
      });

      const userMsg: AIChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: '📷 تحليل صورة...',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMsg]);

      const analysis = await aiApi.analyzeImage(resized.uri);

      const aiMsg: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: analysis.analysis || 'لم أتمكن من تحليل الصورة.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      Alert.alert('خطأ', 'فشل تحليل الصورة');
    } finally {
      setAnalyzing(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{
        title: 'المساعد الذكي',
        headerShown: true,
        headerTintColor: Colors.primary,
        headerTitleStyle: { ...Typography.h4, color: Colors.text },
        headerRight: () => (
          <TouchableOpacity onPress={handleImageAnalysis} disabled={analyzing} style={{ padding: 4 }}>
            {analyzing ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="camera" size={22} color={Colors.primary} />
            )}
          </TouchableOpacity>
        ),
      }} />

      {/* Chat Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <View style={styles.aiIcon}>
              <Ionicons name="sparkles" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>مرحباً {user?.fullName}!</Text>
            <Text style={styles.emptySubtitle}>
              أنا مساعدك الذكي لإدارة المزرعة. اسألني عن أي شيء يتعلق بالتربية والصحة والتغذية.
            </Text>
            <Text style={styles.suggestTitle}>أسئلة مقترحة:</Text>
            <View style={styles.suggestGrid}>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <TouchableOpacity key={i} style={styles.suggestChip} onPress={() => sendMessage(q)}>
                  <Text style={styles.suggestText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          messages.map(msg => (
            <View
              key={msg.id}
              style={[styles.msgRow, msg.role === 'user' ? styles.msgRowUser : styles.msgRowAi]}
            >
              {msg.role === 'assistant' && (
                <View style={styles.msgAvatar}>
                  <Ionicons name="sparkles" size={16} color={Colors.primary} />
                </View>
              )}
              <View style={[styles.msgBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.msgText, msg.role === 'user' && { color: '#fff' }]}>
                  {msg.content}
                </Text>
              </View>
            </View>
          ))
        )}

        {loading && (
          <View style={[styles.msgRow, styles.msgRowAi]}>
            <View style={styles.msgAvatar}>
              <Ionicons name="sparkles" size={16} color={Colors.primary} />
            </View>
            <View style={[styles.msgBubble, styles.aiBubble]}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.typingText}>جارٍ الكتابة...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity onPress={handleImageAnalysis} style={styles.attachBtn} disabled={analyzing}>
          <Ionicons name="image" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder="اكتب سؤالك هنا..."
          placeholderTextColor={Colors.textLight}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={1000}
          textAlign="right"
          editable={!loading}
        />
        <TouchableOpacity
          onPress={() => sendMessage(input)}
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  chatArea: { flex: 1 },
  chatContent: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  emptyChat: { alignItems: 'center', paddingTop: 40 },
  aiIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg,
  },
  emptyTitle: { ...Typography.h3, color: Colors.text, marginBottom: 4 },
  emptySubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 20, marginBottom: Spacing.xxl },
  suggestTitle: { ...Typography.captionBold, color: Colors.textSecondary, marginBottom: Spacing.md, alignSelf: 'flex-end' },
  suggestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'flex-end' },
  suggestChip: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  suggestText: { ...Typography.caption, color: Colors.text },
  msgRow: { flexDirection: 'row', marginBottom: Spacing.md, gap: Spacing.sm, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAi: { justifyContent: 'flex-start' },
  msgAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  msgBubble: { maxWidth: '78%', borderRadius: Radius.lg, padding: Spacing.md },
  userBubble: { backgroundColor: Colors.primary, borderBottomLeftRadius: Radius.lg, borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4, borderBottomRightRadius: Radius.lg, ...Shadows.sm },
  msgText: { ...Typography.body, color: Colors.text, textAlign: 'right', lineHeight: 24 },
  typingText: { ...Typography.caption, color: Colors.textLight, marginTop: 4 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  attachBtn: { padding: Spacing.sm, marginBottom: 2 },
  textInput: {
    flex: 1, ...Typography.body, color: Colors.text,
    backgroundColor: Colors.background,
    borderRadius: Radius.xl, paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm, maxHeight: 100, minHeight: 40,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
});
