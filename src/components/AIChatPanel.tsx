'use client'

import { useState, useRef, useEffect } from 'react'
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
import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport } from 'ai'

const SUGGESTED_QUESTIONS = [
  'ما هي أفضل الأعلاف للأغنام في الشتاء؟',
  'كيف أعرف أن الحيوان مريض؟',
  'ما هو أفضل وقت للتكاثر؟',
  'كيف أحسن إنتاجية المزرعة؟',
  'ما هي التطعيمات الضرورية؟',
  'أعطني تحليل لحالة المزرعة',
]

// Helper to extract text from UIMessage parts
function getMessageText(message: { parts: Array<{ type: string; text?: string }> }): string {
  return message.parts
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text)
    .join('')
}

export default function AIChatPanel() {
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new TextStreamChatTransport({ api: '/api/ai/chat' }),
  })
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.()
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    await sendMessage({ text })
  }

  const handleSuggestionClick = (question: string) => {
    setInput(question)
    setTimeout(async () => {
      await sendMessage({ text: question })
    }, 50)
  }

  const handleClear = () => {
    setMessages([])
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
                  {getMessageText(message)}
                </Paper>
              </Box>
            </Fade>
          ))
        )}

        {isLoading && (
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
