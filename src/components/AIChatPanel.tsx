'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Stack,
  CircularProgress,
  Chip,
  Fade,
} from '@mui/material'
import {
  Send as SendIcon,
  SmartToy as AiIcon,
  Person as PersonIcon,
  DeleteSweep as ClearIcon,
  AutoAwesome as SparkleIcon,
} from '@mui/icons-material'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED_QUESTIONS = [
  'أعطني ملخص شامل لحالة المزرعة',
  'ما هي الأحداث القادمة في التقويم؟',
  'هل توجد حيوانات قريبة من الولادة؟',
  'كيف الوضع المالي هذا الشهر؟',
  'هل يوجد نقص في الأعلاف أو المخزون؟',
  'ما هي التطعيمات المستحقة قريباً؟',
  'حلل تركيبة القطيع (ذكور/إناث/سلالات)',
  'حلل استهلاك الأعلاف وكفاءة التغذية',
  'هل توجد مدفوعات معلقة؟',
  'ما هي توصياتك لتحسين المزرعة؟',
]

export default function AIChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return
    setError(null)

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    }

    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
    }

    const updatedMessages = [...messages, userMsg]
    setMessages([...updatedMessages, assistantMsg])
    setIsLoading(true)

    try {
      abortRef.current = new AbortController()

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || `خطأ ${res.status}`)
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('لا يمكن قراءة الاستجابة')

      let fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: fullText }
          return copy
        })
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      const errorMsg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع'
      setError(errorMsg)
      // Remove empty assistant message on error
      setMessages((prev) => prev.filter((m) => m.content !== ''))
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [messages, isLoading])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.()
    const text = input.trim()
    if (!text) return
    setInput('')
    await sendMessage(text)
  }

  const handleSuggestionClick = (question: string) => {
    setInput('')
    sendMessage(question)
  }

  const handleClear = () => {
    abortRef.current?.abort()
    setMessages([])
    setError(null)
  }

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
          <AiIcon />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            مساعد المزرعة الذكي
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85 }}>
            مدعوم بتقنية Google Gemini AI
          </Typography>
        </Box>
        {messages.length > 0 && (
          <IconButton size="small" sx={{ color: 'white' }} onClick={handleClear} title="مسح المحادثة">
            <ClearIcon />
          </IconButton>
        )}
      </Box>

      {/* Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          bgcolor: 'grey.50',
          minHeight: 300,
        }}
      >
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <SparkleIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              مرحباً! كيف يمكنني مساعدتك؟
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              اسألني أي سؤال عن إدارة المزرعة، صحة الحيوانات، التغذية، أو التكاثر
            </Typography>
            <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1}>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <Chip
                  key={i}
                  label={q}
                  variant="outlined"
                  clickable
                  onClick={() => handleSuggestionClick(q)}
                  sx={{
                    borderRadius: 2,
                    fontSize: '0.8rem',
                    '&:hover': { bgcolor: 'primary.50', borderColor: 'primary.main' },
                  }}
                />
              ))}
            </Stack>
          </Box>
        ) : (
          messages.map((message) => (
            <Fade in key={message.id}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main',
                    fontSize: '0.9rem',
                  }}
                >
                  {message.role === 'user' ? <PersonIcon fontSize="small" /> : <AiIcon fontSize="small" />}
                </Avatar>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    maxWidth: '80%',
                    borderRadius: 2,
                    bgcolor: message.role === 'user' ? 'primary.main' : 'white',
                    color: message.role === 'user' ? 'white' : 'text.primary',
                    border: message.role === 'assistant' ? '1px solid' : 'none',
                    borderColor: 'divider',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: 1.8,
                    fontSize: '0.95rem',
                  }}
                >
                  {message.content}
                </Paper>
              </Box>
            </Fade>
          ))
        )}

        {error && (
          <Box sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          </Box>
        )}

        {isLoading && messages[messages.length - 1]?.content === '' && (
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              <AiIcon fontSize="small" />
            </Avatar>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  جاري التفكير...
                </Typography>
              </Stack>
            </Paper>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Box
        component="form"
        id="ai-chat-form"
        onSubmit={handleSubmit}
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
          bgcolor: 'background.paper',
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="اكتب سؤالك هنا..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />
        <IconButton
          type="submit"
          color="primary"
          disabled={isLoading || !input.trim()}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            borderRadius: 2,
            '&:hover': { bgcolor: 'primary.dark' },
            '&.Mui-disabled': { bgcolor: 'grey.300', color: 'grey.500' },
          }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  )
}
