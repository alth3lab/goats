'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', padding: 24, fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
      <div style={{ padding: 32, maxWidth: 600, textAlign: 'center', borderRadius: 12, border: '2px solid #d32f2f', background: '#fff' }}>
        <h2 style={{ color: '#d32f2f' }}>حدث خطأ في هذه الصفحة</h2>
        <p style={{ color: '#666' }}>نعتذر عن هذا الخطأ. يمكنك المحاولة مرة أخرى أو العودة للوحة التحكم.</p>
        <pre style={{ color: '#d32f2f', fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all', whiteSpace: 'pre-wrap', textAlign: 'left', direction: 'ltr', background: '#fff5f5', padding: 12, borderRadius: 8, maxHeight: 200, overflow: 'auto' }}>
          {error.message}\n{error.stack?.slice(0, 500)}
        </pre>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
          <button onClick={reset} style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: '#2e7d32', color: '#fff', cursor: 'pointer', fontSize: 16 }}>
            إعادة المحاولة
          </button>
          <a href="/dashboard" style={{ padding: '8px 24px', borderRadius: 8, border: '2px solid #2e7d32', color: '#2e7d32', textDecoration: 'none', fontSize: 16 }}>
            العودة للوحة التحكم
          </a>
        </div>
      </div>
    </div>
  )
}
