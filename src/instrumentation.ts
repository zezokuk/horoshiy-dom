/**
 * Runs once when the server starts. With amoCRM connected (AMO_TOKEN), leads that amoCRM did not accept are sent
 * again every 5 minutes, even if no new lead comes (a new lead also triggers a retry, see leadEndpoint.ts).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !process.env.AMO_TOKEN) return
  const { getPayload } = await import('payload')
  const config = (await import('@payload-config')).default
  const { retryQueued } = await import('./collections/amocrm')
  const timer = setInterval(
    async () => {
      try {
        await retryQueued(await getPayload({ config }))
      } catch (e) {
        console.error('amoCRM retry failed:', (e as Error).message)
      }
    },
    5 * 60 * 1000,
  )
  timer.unref?.()
}
