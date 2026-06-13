'use client'

import { ReactElement } from 'react'
import { pdf } from '@react-pdf/renderer'

export async function downloadPdfFromDocument(pdfDocument: ReactElement, fileName: string) {
  const blob = await pdf(pdfDocument).toBlob()
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
