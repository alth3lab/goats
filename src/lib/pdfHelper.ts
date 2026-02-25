import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export interface PDFColumn {
  header: string
  dataKey: string
  /** Optional: apply color based on cell value */
  colorMap?: Record<string, string>
}

export interface PDFOptions {
  title: string
  subtitle?: string
  date?: string
  stats?: Array<{ label: string; value: string | number }>
  columns: PDFColumn[]
  data: any[]
  filename: string
  /** Show row numbers column */
  showRowNumbers?: boolean
  /** Summary row at the end of table */
  totals?: Record<string, string | number>
  /** Landscape orientation */
  landscape?: boolean
}

const escapeHtml = (value: string | number) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const PRIMARY = '#4F7A57'
const FONT = "Cairo, Tajawal, 'Noto Kufi Arabic', Arial, sans-serif"

// ── Inline SVG icons (render reliably in html2canvas) ──
const SVG_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="56" height="56" style="vertical-align:middle;"><circle cx="32" cy="32" r="30" fill="#2e7d32"/><g transform="translate(8 8) scale(2)" fill="#ffffff"><circle cx="4.5" cy="9.5" r="2.5"/><circle cx="9" cy="5.5" r="2.5"/><circle cx="15" cy="5.5" r="2.5"/><circle cx="19.5" cy="9.5" r="2.5"/><path d="M17.34 14.86c-.87-1.02-1.6-1.89-2.48-2.91-.46-.54-1.05-1.08-1.75-1.32q-.165-.06-.33-.09c-.25-.04-.52-.04-.78-.04s-.53 0-.79.05q-.165.03-.33.09c-.7.24-1.28.78-1.75 1.32-.87 1.02-1.6 1.89-2.48 2.91-1.31 1.31-2.92 2.76-2.62 4.79.29 1.02 1.02 2.03 2.33 2.32.73.15 3.06-.44 5.54-.44h.18c2.48 0 4.81.58 5.54.44 1.31-.29 2.04-1.31 2.33-2.32.31-2.04-1.3-3.49-2.61-4.8"/></g></svg>`
const SVG_CALENDAR = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:4px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
const SVG_CHART = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${PRIMARY}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:4px;"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`

const SVG_MALE = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><circle cx="10" cy="14" r="5"/><line x1="19" y1="5" x2="13.6" y2="10.4"/><line x1="19" y1="5" x2="15" y2="5"/><line x1="19" y1="5" x2="19" y2="9"/></svg>`
const SVG_FEMALE = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/></svg>`

export const generateArabicPDF = async (options: PDFOptions) => {
  const {
    title, subtitle, date, stats, columns, data, filename,
    showRowNumbers = true, totals, landscape = false
  } = options

  if (typeof window === 'undefined') return

  if (document.fonts?.ready) await document.fonts.ready

  // ── Header with branding ──
  const headerHtml = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid ${PRIMARY}; padding-bottom:14px; margin-bottom:16px;">
      <div style="text-align:right; display:flex; align-items:center; gap:12px; flex:1;">
        ${SVG_LOGO}
        <div>
          <div style="font-size:24px; font-weight:800; color:${PRIMARY}; margin-bottom:2px;">نظام إدارة المواشي</div>
          <div style="font-size:11px; color:#6b7280;">Livestock Management System</div>
        </div>
      </div>
      <div style="text-align:left; flex:1;">
        <div style="font-size:20px; font-weight:700; color:#1f2933;">${escapeHtml(title)}</div>
        ${subtitle ? `<div style="font-size:12px; color:#6b7280;">${escapeHtml(subtitle)}</div>` : ''}
        ${date ? `<div style="font-size:12px; color:#6b7280; margin-top:2px;">${SVG_CALENDAR} ${escapeHtml(date)}</div>` : ''}
      </div>
    </div>
  `

  // ── Stats section ──
  const statsHtml =
    stats && stats.length > 0
      ? `
        <div style="margin-bottom:16px; border:1px solid #e5e7eb; border-radius:10px; padding:12px 16px; background:linear-gradient(135deg, #f0fdf4 0%, #f8fafb 100%);">
          <div style="font-size:14px; font-weight:700; margin-bottom:10px; color:${PRIMARY};">${SVG_CHART} الإحصائيات</div>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px 20px; font-size:13px;">
            ${stats
              .map(
                (stat) =>
                  `<div style="background:#fff; border:1px solid #e5e7eb; border-radius:6px; padding:6px 10px;">
                    <span style="color:#6b7280; font-size:11px;">${escapeHtml(stat.label)}</span><br/>
                    <strong style="font-size:15px; color:#1f2933;">${escapeHtml(stat.value)}</strong>
                  </div>`
              )
              .join('')}
          </div>
        </div>
      `
      : ''

  // ── Table head with row number (reverse for correct RTL rendering) ──
  const reversedCols = [...columns].reverse()
  const allCols = showRowNumbers
    ? [{ header: '#', dataKey: '__rowNum__' } as PDFColumn, ...reversedCols]
    : reversedCols

  const tableHead = allCols
    .map(
      (col) =>
        `<th style="border:1px solid #c8d6df; padding:0; height:40px; background:${PRIMARY}; color:#fff; font-size:12px; font-weight:700; white-space:nowrap;"><div style="display:table; width:100%; height:100%;"><div style="display:table-cell; vertical-align:middle; text-align:center; padding:0 8px;">${escapeHtml(col.header)}</div></div></th>`
    )
    .join('')

  // ── Table rows with row numbers and color coding ──
  const tableRowsArr = data
    .map((row, rowIndex) => {
      const bg = rowIndex % 2 === 0 ? '#ffffff' : '#f7f9fb'
      const cells = allCols
        .map((col) => {
          let cellValue = col.dataKey === '__rowNum__' ? String(rowIndex + 1) : String(row[col.dataKey] ?? '-')
          const hasColor = col.colorMap && col.colorMap[cellValue]
          const isSymbol = cellValue === '♂' || cellValue === '♀'
          if (hasColor && isSymbol) {
            const svgIcon = cellValue === '♂' ? SVG_MALE(col.colorMap![cellValue]) : SVG_FEMALE(col.colorMap![cellValue])
            return `<td style="border:1px solid #e5e7eb; padding:0; height:36px; background:${bg};"><div style="display:table; width:100%; height:36px;"><div style="display:table-cell; vertical-align:middle; text-align:center;">${svgIcon}</div></div></td>`
          }
          if (hasColor) {
            return `<td style="border:1px solid #e5e7eb; padding:0; height:36px; background:${bg};"><div style="display:table; width:100%; height:36px;"><div style="display:table-cell; vertical-align:middle; text-align:center; padding:0 8px;"><span style="color:${col.colorMap![cellValue]}; font-weight:700; font-size:11px;">${escapeHtml(cellValue)}</span></div></div></td>`
          }
          return `<td style="border:1px solid #e5e7eb; padding:0; height:36px; background:${bg}; font-size:11px;"><div style="display:table; width:100%; height:36px;"><div style="display:table-cell; vertical-align:middle; text-align:center; padding:0 8px;">${escapeHtml(cellValue)}</div></div></td>`
        })
        .join('')
      return `<tr>${cells}</tr>`
    })

  // ── Totals row ──
  const totalsRow = totals
    ? `<tr style="background:#e8f5e9; font-weight:700;">
        ${allCols
          .map((col) => {
            const val = col.dataKey === '__rowNum__' ? '' : (totals[col.dataKey] ?? '')
            return `<td style="border:1px solid #c8d6df; padding:0; height:40px; color:${PRIMARY}; font-size:12px;"><div style="display:table; width:100%; height:100%;"><div style="display:table-cell; vertical-align:middle; text-align:center; padding:0 8px;">${escapeHtml(val)}</div></div></td>`
          })
          .join('')}
      </tr>`
    : ''

  // ── Footer ──
  const footerHtml = (pageNum: number, totalPages: number) => `
    <div style="margin-top:20px; padding-top:10px; border-top:2px solid #e5e7eb; display:flex; justify-content:space-between; font-size:10px; color:#9ca3af;">
      <div>عدد السجلات: ${data.length} | صفحة ${pageNum} من ${totalPages}</div>
      <div>تم إنشاؤه بواسطة نظام إدارة المواشي • ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  `

  // ── Measure row heights to split pages without cutting rows ──
  const containerWidth = landscape ? '1500px' : '1100px'

  const measureContainer = document.createElement('div')
  measureContainer.style.position = 'fixed'
  measureContainer.style.left = '-100000px'
  measureContainer.style.top = '0'
  measureContainer.style.width = containerWidth
  measureContainer.style.background = '#ffffff'
  measureContainer.style.padding = '28px'
  measureContainer.style.direction = 'rtl'
  measureContainer.style.color = '#1f2933'
  measureContainer.style.fontFamily = FONT

  // Measure header + stats height
  measureContainer.innerHTML = `<div style="direction:rtl; font-family:${FONT}; color:#1f2933;">${headerHtml}${statsHtml}</div>`
  document.body.appendChild(measureContainer)
  const headerHeight = measureContainer.offsetHeight
  document.body.removeChild(measureContainer)

  // Measure single table row height
  measureContainer.innerHTML = `<div style="direction:rtl; font-family:${FONT};"><table style="width:100%; border-collapse:collapse; table-layout:auto; direction:rtl;"><thead><tr>${tableHead}</tr></thead><tbody><tr>${allCols.map(() => `<td style="border:1px solid #e5e7eb; padding:0; height:36px;">X</td>`).join('')}</tr></tbody></table></div>`
  document.body.appendChild(measureContainer)
  const singleRowHeight = measureContainer.querySelector('tbody tr')?.getBoundingClientRect().height || 36
  const theadHeight = measureContainer.querySelector('thead')?.getBoundingClientRect().height || 40
  document.body.removeChild(measureContainer)

  // Calculate how many rows fit per page
  const orientation = landscape ? 'l' : 'p'
  const doc = new jsPDF(orientation, 'pt', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const renderWidth = pageWidth - margin * 2

  const scale = 2
  const containerPx = parseInt(containerWidth)
  const pdfScale = renderWidth / containerPx
  const footerSpace = 60
  const usablePageHeight = (pageHeight - margin * 2 - footerSpace) / pdfScale

  // First page has header + stats, subsequent pages only have thead
  const firstPageRows = Math.max(1, Math.floor((usablePageHeight - headerHeight - theadHeight) / singleRowHeight))
  const otherPageRows = Math.max(1, Math.floor((usablePageHeight - theadHeight) / singleRowHeight))

  // Split data rows into pages
  const pages: string[][] = []
  let idx = 0

  // First page
  pages.push(tableRowsArr.slice(idx, idx + firstPageRows))
  idx += firstPageRows

  // Remaining pages
  while (idx < tableRowsArr.length) {
    pages.push(tableRowsArr.slice(idx, idx + otherPageRows))
    idx += otherPageRows
  }

  // If totals row exists, add it to the last page
  const totalPages = pages.length

  // ── Render each page separately ──
  for (let p = 0; p < pages.length; p++) {
    if (p > 0) doc.addPage()

    const isFirst = p === 0
    const isLast = p === pages.length - 1
    const pageRows = pages[p].join('')
    const totalsHtml = isLast && totalsRow ? totalsRow : ''

    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.left = '-100000px'
    container.style.top = '0'
    container.style.width = containerWidth
    container.style.background = '#ffffff'
    container.style.padding = '28px'
    container.style.direction = 'rtl'
    container.style.color = '#1f2933'
    container.style.fontFamily = FONT
    container.innerHTML = `
      <div style="direction:rtl; font-family:${FONT}; color:#1f2933;">
        ${isFirst ? headerHtml + statsHtml : ''}
        <table style="width:100%; border-collapse:collapse; table-layout:auto; word-break:break-word; direction:rtl;">
          <thead><tr>${tableHead}</tr></thead>
          <tbody>${pageRows}${totalsHtml}</tbody>
        </table>
        ${footerHtml(p + 1, totalPages)}
      </div>
    `
    document.body.appendChild(container)

    const canvas = await html2canvas(container, {
      scale,
      backgroundColor: '#ffffff',
      useCORS: true
    })
    document.body.removeChild(container)

    const imgData = canvas.toDataURL('image/png')
    const renderHeight = (canvas.height * renderWidth) / canvas.width
    doc.addImage(imgData, 'PNG', margin, margin, renderWidth, renderHeight)
  }

  doc.save(filename)
  return doc
}
