'use client'

import { pdf } from '@react-pdf/renderer'

export async function downloadPdfFromDocument(pdfDocument: Parameters<typeof pdf>[0], fileName: string) {
  const blob = await pdf(pdfDocument as Parameters<typeof pdf>[0]).toBlob()
  if (!blob) {
    throw new Error('Failed to generate PDF blob')
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
