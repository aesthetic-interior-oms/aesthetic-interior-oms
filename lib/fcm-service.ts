import prisma from '@/lib/prisma'

// Lazy-load firebase-admin so it doesn't crash if the env var is missing.
let adminApp: import('firebase-admin/app').App | null = null

async function getAdminApp() {
  if (adminApp) return adminApp

  const { initializeApp, getApps, cert } = await import('firebase-admin/app')

  if (getApps().length > 0) {
    adminApp = getApps()[0]
    return adminApp
  }

  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!serviceAccountRaw) {
    console.warn('[fcm-service] FIREBASE_SERVICE_ACCOUNT env var is not set. Push notifications are disabled.')
    return null
  }

  const serviceAccount = JSON.parse(serviceAccountRaw)
  adminApp = initializeApp({ credential: cert(serviceAccount) })
  return adminApp
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
    const app = await getAdminApp()
    if (!app) return

    const { getMessaging } = await import('firebase-admin/messaging')

    // Get all FCM tokens for this user.
    const tokens = await prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true, id: true },
    })

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

    // Clean up invalid/expired tokens.
    const invalidTokenIds: string[] = []
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const err = result.reason as { code?: string }
        if (
          err?.code === 'messaging/invalid-registration-token' ||
          err?.code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokenIds.push(tokens[index].id)
        }
      }
    })

    if (invalidTokenIds.length > 0) {
      await prisma.deviceToken.deleteMany({
        where: { id: { in: invalidTokenIds } },
      })
    }
  } catch (error) {
    console.error('[fcm-service] sendPushToUser error:', error)
  }
}
