import { NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'

export async function GET() {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const emailConfigured = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim())
    const keyConfigured = Boolean(process.env.GOOGLE_PRIVATE_KEY?.trim())
    const folderConfigured = Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID?.trim())
    const configured = emailConfigured && keyConfigured && folderConfigured

    return NextResponse.json({
      success: true,
      data: {
        configured,
        connected: configured,
        checkedAt: new Date().toISOString(),
        config: {
          emailConfigured,
          keyConfigured,
          folderConfigured,
        },
      },
    })
  } catch (error) {
    console.error('[google-drive/status][GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to check Google Drive status' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, OPTIONS' },
  })
}
