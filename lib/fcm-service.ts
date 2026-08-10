import prisma from '@/lib/prisma'

// Lazy-load firebase-admin so it doesn't crash if the env var is missing.
let adminApp: import('firebase-admin/app').App | null = null

async function getAdminApp() {
  if (adminApp) return adminApp

  const { initializeApp, getApps, cert } = await import('firebase-admin/app')

  if (getApps().length > 0) {
    adminApp = getApps()[0]
    console.log('[fcm-service] Reusing existing Firebase app')
    return adminApp
  }

  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!serviceAccountRaw) {
    console.warn('[fcm-service] FIREBASE_SERVICE_ACCOUNT env var is not set. Push notifications are disabled.')
    return null
  }

  console.log('[fcm-service] Parsing FIREBASE_SERVICE_ACCOUNT, length:', serviceAccountRaw.length)

  let serviceAccount: Record<string, string>
  try {
    serviceAccount = JSON.parse(serviceAccountRaw)
  } catch (e) {
    console.error('[fcm-service] JSON.parse failed:', e)
    return null
  }

  // Fix common Vercel issue: escaped \n in private key
  if (serviceAccount.private_key && !serviceAccount.private_key.includes('\n')) {
    console.warn('[fcm-service] private_key has no real newlines — fixing escaped \\n...')
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
  }

  console.log('[fcm-service] Initializing Firebase Admin for project:', serviceAccount.project_id)

  try {
    adminApp = initializeApp({ credential: cert(serviceAccount) })
    console.log('[fcm-service] Firebase Admin initialized successfully')
    return adminApp
  } catch (e) {
    console.error('[fcm-service] initializeApp failed:', e)
    return null
  }
}

/**
 * Sends a push notification to all registered devices for a given user.
 * Silently no-ops if Firebase is not configured.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  try {
    console.log('[fcm-service] sendPushToUser called for userId:', userId)

    const app = await getAdminApp()
    if (!app) {
      console.warn('[fcm-service] No Firebase app — skipping push')
      return
    }

    const { getMessaging } = await import('firebase-admin/messaging')

    // Get all FCM tokens for this user.
    const tokens = await prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true, id: true },
    })

    console.log('[fcm-service] Found', tokens.length, 'token(s) for userId:', userId)

    if (tokens.length === 0) return

    const messaging = getMessaging(app)

    // Send to each token individually to handle failures gracefully.
    const results = await Promise.allSettled(
      tokens.map((dt) =>
        messaging.send({
          token: dt.token,
          notification: { title, body },
          data: data ?? {},
          android: {
            priority: 'high',
            notification: {
              channelId: 'crm_notifications_channel',
              priority: 'max',
              defaultSound: true,
              defaultVibrateTimings: true,
            },
          },
          apns: {
            payload: {
              aps: {
                alert: { title, body },
                sound: 'default',
                badge: 1,
              },
            },
          },
        }),
      ),
    )

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log('[fcm-service] ✅ Message sent to token index', index, ':', result.value)
      } else {
        console.error('[fcm-service] ❌ Failed for token index', index, ':', result.reason?.code, result.reason?.message, result.reason?.errorInfo)
      }
    })

    // Clean up invalid/expired tokens.
    // Firebase Admin may return different error code strings across SDK versions:
    // 'messaging/registration-token-not-registered', 'messaging/invalid-registration-token',
    // 'messaging/unregistered', plain 'NOT_FOUND', or just 'NotRegistered'.
    const staleErrorCodes = new Set([
      'messaging/registration-token-not-registered',
      'messaging/invalid-registration-token',
      'messaging/unregistered',
      'NOT_FOUND',
      'notregistered',
    ])
    const invalidTokenIds: string[] = []
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const err = result.reason as { code?: string; errorInfo?: { code?: string } }
        const code = (err?.code ?? err?.errorInfo?.code ?? '').toLowerCase().replace(/[/-]/g, '')
        const normalizedCode = code.replace('messaging', '')
        if (
          staleErrorCodes.has(err?.code ?? '') ||
          staleErrorCodes.has((err?.errorInfo?.code ?? '').toLowerCase()) ||
          normalizedCode.includes('notregistered') ||
          normalizedCode.includes('invalidregistration')
        ) {
          console.log('[fcm-service] Marking stale token for deletion at index', index)
          invalidTokenIds.push(tokens[index].id)
        }
      }
    })

    if (invalidTokenIds.length > 0) {
      console.log('[fcm-service] Cleaning up', invalidTokenIds.length, 'invalid token(s)')
      await prisma.deviceToken.deleteMany({
        where: { id: { in: invalidTokenIds } },
      })
    }
  } catch (error) {
    console.error('[fcm-service] sendPushToUser error:', error)
  }
}

