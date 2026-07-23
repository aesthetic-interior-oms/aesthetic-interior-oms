import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!serviceAccountRaw) {
      return NextResponse.json({ success: false, error: 'FIREBASE_SERVICE_ACCOUNT not set' })
    }

    let serviceAccount: Record<string, string>
    try {
      serviceAccount = JSON.parse(serviceAccountRaw)
    } catch (e) {
      return NextResponse.json({ success: false, error: 'JSON parse failed: ' + String(e) })
    }

    // Check private key newlines
    const pk = serviceAccount.private_key || ''
    const hasRealNewlines = pk.includes('\n')
    const hasEscapedNewlines = pk.includes('\\n')

    try {
      const { initializeApp, getApps, cert, deleteApp } = await import('firebase-admin/app')
      
      // Use a temporary app to avoid conflicts
      const testApp = initializeApp({ credential: cert(serviceAccount) }, 'test-' + Date.now())
      
      const { getMessaging } = await import('firebase-admin/messaging')
      const messaging = getMessaging(testApp)
      
      // Try sending to a dummy token just to check auth works
      try {
        await messaging.send({ token: 'test', notification: { title: 'test', body: 'test' } })
      } catch (sendErr: unknown) {
        const code = (sendErr as { code?: string })?.code
        // invalid-argument means Firebase auth worked but token is bad — that's expected
        if (code === 'messaging/invalid-argument' || code === 'messaging/registration-token-not-registered') {
          await deleteApp(testApp)
          return NextResponse.json({
            success: true,
            message: 'Firebase Admin initialized successfully!',
            privateKeyHasRealNewlines: hasRealNewlines,
            privateKeyHasEscapedNewlines: hasEscapedNewlines,
            projectId: serviceAccount.project_id,
          })
        }
        await deleteApp(testApp)
        return NextResponse.json({
          success: false,
          error: 'Send test failed: ' + code + ' — ' + String(sendErr),
          privateKeyHasRealNewlines: hasRealNewlines,
          privateKeyHasEscapedNewlines: hasEscapedNewlines,
        })
      }

      await deleteApp(testApp)
      return NextResponse.json({ success: true, message: 'Firebase OK', projectId: serviceAccount.project_id })
    } catch (initErr) {
      return NextResponse.json({
        success: false,
        error: 'Firebase init failed: ' + String(initErr),
        privateKeyHasRealNewlines: hasRealNewlines,
        privateKeyHasEscapedNewlines: hasEscapedNewlines,
      })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) })
  }
}
