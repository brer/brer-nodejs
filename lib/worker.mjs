import { getHandler } from './handlers.mjs'
import { asFulfilled, asRejected } from './util.mjs'

export async function handleInvocation ({ invocationId, log, request }, handlers) {
  log('download invocation')
  const resInvocation = await request(
    `api/v1/invocations/${invocationId}`,
    {
      method: 'GET',
      headers: {
        accept: 'application/json'
      }
    }
  )

  const { invocation } = await resInvocation.json()

  const fn = getHandler(handlers, invocation.functionName)

  if (!fn) {
    log('handler not found')
    return asRejected(
      `handler for ${invocation.functionName} function not found`
    )
  } else if (isTestMode(invocation)) {
    log('test invocation detected')
    return asFulfilled({
      runtime: {
        type: 'Node.js',
        arch: process.arch,
        platform: process.platform,
        version: process.version
      }
    })
  } else {
    log('download payload')
    const resPayload = await request(
      `api/v1/invocations/${invocationId}/payload`
    )

    const buffer = Buffer.from(await resPayload.arrayBuffer())
    const context = {
      contentType: resPayload.headers.get('content-type'),
      invocation,
      progress: async result => {
        await request(
          `api/v1/invocations/${invocationId}/status`,
          {
            method: 'PUT',
            body: {
              status: 'running',
              result
            },
            expectedStatuses: [429],
            consume: true
          }
        )
      }
    }

    // TODO: auto progress after X ms of silence

    log('execute handler')
    try {
      return asFulfilled(await fn(buffer, context))
    } catch (err) {
      return asRejected(err)
    }
  }
}

function isTestMode (invocation) {
  // Env check is faster, but during tests its not possible
  return process.env.BRER_MODE === 'test' ||
    !!invocation.env?.find(item => item.name === 'BRER_MODE' && item.value === 'test')
}
