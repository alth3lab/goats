'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Box, Typography, Stack, Paper, Chip, Tabs, Tab, Button,
  CircularProgress, IconButton, Card, CardContent, Alert,
  Fade, useTheme, useMediaQuery,
  TextField,
} from '@mui/material'
import {
  AutoAwesome as AiIcon,
  Info as InfoIcon,
  CameraAlt as CameraIcon,
  Pets as BreedIcon,
  Healing as HealthIcon,
  BugReport as WoundIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Chat as ChatIcon,
  Favorite as BreedingIcon,
  Image as ImageIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import AIChatPanel from '@/components/AIChatPanel'

// Simple markdown-like renderer
function MarkdownText({ children }: { children: string }) {
  const lines = children.split('\n')
  return (
    <Box>
      {lines.map((line, i) => {
        // Headers
        if (line.startsWith('### ')) return <Typography key={i} variant="subtitle1" fontWeight={700} sx={{ mt: 2, mb: 1, color: 'primary.main' }}>{line.slice(4)}</Typography>
        if (line.startsWith('## ')) return <Typography key={i} variant="h6" fontWeight={700} sx={{ mt: 2, mb: 1 }}>{line.slice(3)}</Typography>
        if (line.startsWith('# ')) return <Typography key={i} variant="h5" fontWeight={700} sx={{ mt: 2, mb: 1 }}>{line.slice(2)}</Typography>
        // Bold text with **
        if (line.includes('**')) {
          const parts = line.split(/\*\*(.*?)\*\*/g)
          return (
            <Typography key={i} variant="body2" sx={{ mb: 0.5, lineHeight: 1.8 }}>
              {parts.map((part, j) => j % 2 === 1 ? <strong key={j} style={{ color: 'inherit' }}>{part}</strong> : part)}
            </Typography>
          )
        }
        // List items
        if (line.startsWith('- ') || line.startsWith('* ')) return <Typography key={i} variant="body2" sx={{ mb: 0.3, pl: 2, lineHeight: 1.8 }}>• {line.slice(2)}</Typography>
        if (/^\d+\.\s/.test(line)) return <Typography key={i} variant="body2" sx={{ mb: 0.3, pl: 2, lineHeight: 1.8 }}>{line}</Typography>
        // Empty line
        if (line.trim() === '') return <Box key={i} sx={{ height: 8 }} />
        // Warning/info lines
        if (line.startsWith('⚠️') || line.startsWith('⛔')) return <Typography key={i} variant="body2" sx={{ mb: 0.5, lineHeight: 1.8, color: 'warning.main', fontWeight: 600 }}>{line}</Typography>
        // Normal text
        return <Typography key={i} variant="body2" sx={{ mb: 0.5, lineHeight: 1.8 }}>{line}</Typography>
      })}
    </Box>
  )
}

// ==================== Image Analysis Tab ====================
function ImageAnalysisTab() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analysisType, setAnalysisType] = useState<string>('breed')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setImagePreview(URL.createObjectURL(file))
      setResult(null)
      setError(null)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      setImagePreview(URL.createObjectURL(file))
      setResult(null)
      setError(null)
    }
  }, [])

  const handleAnalyze = async () => {
    if (!selectedImage) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('image', selectedImage)
      formData.append('type', analysisType)
      if (additionalNotes) formData.append('notes', additionalNotes)

      const res = await fetch('/api/ai/analyze-image', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'حدث خطأ أثناء التحليل')
      } else {
        setResult(data.analysis)
      }
    } catch {
      setError('فشل الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }

  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const analysisTypes = [
    { value: 'breed', label: 'تحديد السلالة', icon: <BreedIcon />, color: '#2196f3', description: 'تعرّف على سلالة الحيوان من الصورة' },
    { value: 'health', label: 'فحص صحي', icon: <HealthIcon />, color: '#4caf50', description: 'تحليل الحالة الصحية والأعراض' },
    { value: 'wound', label: 'فحص جروح', icon: <WoundIcon />, color: '#f44336', description: 'تقييم الجروح والالتهابات' },
  ]

  return (
    <Box>
      {/* Analysis Type Selection */}
      <Stack direction={isMobile ? 'column' : 'row'} spacing={2} sx={{ mb: 3 }}>
        {analysisTypes.map((type) => (
          <Card
            key={type.value}
            onClick={() => setAnalysisType(type.value)}
            sx={{
              flex: 1,
              cursor: 'pointer',
              border: '2px solid',
              borderColor: analysisType === type.value ? type.color : 'divider',
              bgcolor: analysisType === type.value ? `${type.color}10` : 'background.paper',
              transition: 'all 0.2s',
              '&:hover': { borderColor: type.color, transform: 'translateY(-2px)' },
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ color: type.color }}>{type.icon}</Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>{type.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{type.description}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Stack direction={isMobile ? 'column' : 'row'} spacing={3}>
        {/* Upload Area */}
        <Box sx={{ flex: 1 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />

          {!imagePreview ? (
            <Paper
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                p: 5,
                border: '2px dashed',
                borderColor: 'primary.main',
                borderRadius: 3,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: 'action.hover',
                transition: 'all 0.2s',
                '&:hover': { bgcolor: 'primary.50', borderColor: 'primary.dark' },
                minHeight: 250,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <CameraIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" fontWeight={600} gutterBottom>
                اسحب الصورة هنا أو اضغط للاختيار
              </Typography>
              <Typography variant="body2" color="text.secondary">
                JPEG, PNG, WebP - حد أقصى 10 ميجابايت
              </Typography>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                sx={{ mt: 2 }}
              >
                اختر صورة
              </Button>
            </Paper>
          ) : (
            <Box sx={{ position: 'relative' }}>
              <Paper sx={{ p: 1, borderRadius: 3, overflow: 'hidden' }}>
                <Box
                  component="img"
                  src={imagePreview}
                  alt="Selected"
                  sx={{
                    width: '100%',
                    maxHeight: 400,
                    objectFit: 'contain',
                    borderRadius: 2,
                    display: 'block',
                  }}
                />
              </Paper>
              <IconButton
                onClick={clearImage}
                sx={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  bgcolor: 'error.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'error.dark' },
                }}
                size="small"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          {/* Additional Notes */}
          {imagePreview && (
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="ملاحظات إضافية (اختياري) - مثال: الحيوان يعرج، أو لاحظت تورم..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              sx={{ mt: 2 }}
              size="small"
            />
          )}

          {/* Analyze Button */}
          {imagePreview && (
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleAnalyze}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AiIcon />}
              sx={{ mt: 2, py: 1.5, fontWeight: 700, fontSize: '1rem' }}
            >
              {loading ? 'جاري التحليل...' : `تحليل - ${analysisTypes.find(t => t.value === analysisType)?.label}`}
            </Button>
          )}
        </Box>

        {/* Results Area */}
        <Box sx={{ flex: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {loading && (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <CircularProgress size={48} sx={{ mb: 2 }} />
              <Typography variant="h6" fontWeight={600}>
                جاري تحليل الصورة بالذكاء الاصطناعي...
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                قد يستغرق التحليل حتى 30 ثانية
              </Typography>
            </Paper>
          )}

          {result && (
            <Fade in>
              <Paper sx={{ p: 3, borderRadius: 3, maxHeight: 500, overflow: 'auto' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    نتائج التحليل
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => navigator.clipboard.writeText(result)}
                    title="نسخ النتائج"
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <Box sx={{ 
                  '& h1, & h2, & h3': { fontWeight: 700, mt: 2, mb: 1 },
                  '& p': { mb: 1, lineHeight: 1.8 },
                  '& ul, & ol': { pl: 2 },
                  '& li': { mb: 0.5 },
                  '& strong': { color: 'primary.main' },
                }}>
                  <MarkdownText>{result}</MarkdownText>
                </Box>
              </Paper>
            </Fade>
          )}

          {!result && !loading && !error && (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, color: 'text.secondary' }}>
              <ImageIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
              <Typography variant="body1">
                اختر صورة ونوع التحليل ثم اضغط "تحليل"
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                يدعم: تحديد السلالة، الفحص الصحي، فحص الجروح
              </Typography>
            </Paper>
          )}
        </Box>
      </Stack>
    </Box>
  )
}

// ==================== Breeding Recommendations Tab ====================
function BreedingRecommendationsTab() {
  const [result, setResult] = useState<{ recommendations: string; inbreedingRisks: string[]; stats: { totalFemales: number; totalMales: number; risksFound: number } } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const handleGetRecommendations = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/ai/breeding-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'all' }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'حدث خطأ')
      } else {
        setResult(data)
      }
    } catch {
      setError('فشل الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      {/* Info */}
      <Alert severity="info" icon={<AiIcon />} sx={{ mb: 3, borderRadius: 2 }}>
        يقوم الذكاء الاصطناعي بتحليل بيانات القطيع (السلالة، العمر، الوزن، القرابة، التاريخ الصحي والتناسلي) لتقديم أفضل توصيات التزاوج وتجنب زواج الأقارب.
      </Alert>

      {/* Action Cards */}
      <Stack direction={isMobile ? 'column' : 'row'} spacing={2} sx={{ mb: 3 }}>
        <Card sx={{ flex: 1, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <BreedingIcon color="primary" />
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>اقتراح أزواج التزاوج</Typography>
                <Typography variant="caption" color="text.secondary">أفضل توافق جيني بين الذكور والإناث</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200' }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <WoundIcon color="error" />
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>كشف زواج الأقارب</Typography>
                <Typography variant="caption" color="text.secondary">تحذيرات تلقائية من صلات القرابة</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <BreedIcon color="success" />
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>توقع صفات المواليد</Typography>
                <Typography variant="caption" color="text.secondary">الوزن والسلالة والصفات المتوقعة</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Generate Button */}
      <Button
        fullWidth
        variant="contained"
        size="large"
        onClick={handleGetRecommendations}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AiIcon />}
        sx={{ mb: 3, py: 1.5, fontWeight: 700, fontSize: '1rem' }}
      >
        {loading ? 'جاري التحليل... قد يستغرق حتى 30 ثانية' : 'تحليل القطيع وتقديم التوصيات'}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
      )}

      {/* Results */}
      {result && (
        <Fade in>
          <Box>
            {/* Stats */}
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              <Paper sx={{ flex: 1, p: 2, textAlign: 'center', borderRadius: 2, bgcolor: 'primary.50' }}>
                <Typography variant="h4" fontWeight={700} color="primary.main">{result.stats.totalFemales}</Typography>
                <Typography variant="caption" color="text.secondary">أنثى متاحة</Typography>
              </Paper>
              <Paper sx={{ flex: 1, p: 2, textAlign: 'center', borderRadius: 2, bgcolor: 'info.50' }}>
                <Typography variant="h4" fontWeight={700} color="info.main">{result.stats.totalMales}</Typography>
                <Typography variant="caption" color="text.secondary">ذكر متاح</Typography>
              </Paper>
              <Paper sx={{ flex: 1, p: 2, textAlign: 'center', borderRadius: 2, bgcolor: result.stats.risksFound > 0 ? 'error.50' : 'success.50' }}>
                <Typography variant="h4" fontWeight={700} color={result.stats.risksFound > 0 ? 'error.main' : 'success.main'}>
                  {result.stats.risksFound}
                </Typography>
                <Typography variant="caption" color="text.secondary">تحذير قرابة</Typography>
              </Paper>
            </Stack>

            {/* Inbreeding Risks */}
            {result.inbreedingRisks.length > 0 && (
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  تحذيرات زواج الأقارب المكتشفة:
                </Typography>
                {result.inbreedingRisks.map((risk, i) => (
                  <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>
                    {risk}
                  </Typography>
                ))}
              </Alert>
            )}

            {/* AI Recommendations */}
            <Paper sx={{ p: 3, borderRadius: 3, maxHeight: 600, overflow: 'auto' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  توصيات الذكاء الاصطناعي
                </Typography>
                <Stack direction="row" spacing={1}>
                  <IconButton
                    size="small"
                    onClick={() => navigator.clipboard.writeText(result.recommendations)}
                    title="نسخ"
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={handleGetRecommendations} title="إعادة التحليل">
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
              <Box sx={{
                '& h1, & h2, & h3': { fontWeight: 700, mt: 2, mb: 1 },
                '& p': { mb: 1, lineHeight: 1.8 },
                '& ul, & ol': { pl: 2 },
                '& li': { mb: 0.5 },
                '& strong': { color: 'primary.main' },
                '& table': { width: '100%', borderCollapse: 'collapse', my: 2 },
                '& th, & td': { border: '1px solid', borderColor: 'divider', p: 1, textAlign: 'right' },
                '& th': { bgcolor: 'action.hover', fontWeight: 700 },
              }}>
                <MarkdownText>{result.recommendations}</MarkdownText>
              </Box>
            </Paper>
          </Box>
        </Fade>
      )}

      {!result && !loading && !error && (
        <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3, color: 'text.secondary' }}>
          <BreedingIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
          <Typography variant="h6">اضغط الزر أعلاه لتحليل القطيع</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            سيتم تحليل جميع الذكور والإناث النشطة وتقديم أفضل أزواج التزاوج
          </Typography>
        </Paper>
      )}
    </Box>
  )
}

// ==================== Main Page ====================
export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState(0)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <AiIcon sx={{ fontSize: 36, color: 'primary.main' }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            المساعد الذكي
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مساعدك الشخصي لإدارة المزرعة - مدعوم بـ Google Gemini AI
          </Typography>
        </Box>
        <Chip label="مجاني" color="success" size="small" sx={{ fontWeight: 600 }} />
      </Stack>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant={isMobile ? 'fullWidth' : 'standard'}
          sx={{
            '& .MuiTab-root': { fontWeight: 600, minHeight: 56 },
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Tab icon={<ChatIcon />} iconPosition="start" label="محادثة" />
          <Tab icon={<CameraIcon />} iconPosition="start" label="تحليل صور" />
          <Tab icon={<BreedingIcon />} iconPosition="start" label="توصيات التزاوج" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              bgcolor: 'info.50',
              border: '1px solid',
              borderColor: 'info.200',
              display: 'flex',
              gap: 1.5,
              alignItems: 'center',
            }}
          >
            <InfoIcon color="info" />
            <Typography variant="body2" color="text.secondary">
              المساعد الذكي يستطيع الوصول إلى بيانات مزرعتك لتقديم إجابات مخصصة. اسأله عن التغذية، الصحة، التكاثر، أو أي شيء يتعلق بإدارة المزرعة.
            </Typography>
          </Paper>
          <Box sx={{ height: { xs: 'calc(100vh - 350px)', md: 'calc(100vh - 330px)' }, minHeight: 500 }}>
            <AIChatPanel />
          </Box>
        </Box>
      )}

      {activeTab === 1 && <ImageAnalysisTab />}
      {activeTab === 2 && <BreedingRecommendationsTab />}
    </Box>
  )
}
