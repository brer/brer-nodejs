import { getHandler } from './handlers.mjs'
import { asFulfilled, asRejected } from './util.mjs'

export async function handleInvocation ({ invocationId, log, request }, handlers) {
  log('download invocation')
  const { body: { invocation } } = await request(
    `invoker/v1/invocations/${invocationId}/status/running`
  )

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
    const response = await request({
      method: 'GET',
      path: `invoker/v1/invocations/${invocationId}/payload`,
      rawBody: true
    })

    log('execute handler')
    try {
      return asFulfilled(
        await fn(response.body, {
          contentType: response.headers.get('content-type'),
          invocation,
          progress: async result => {
            await request({
              path: `invoker/v1/invocations/${invocationId}/status/progress`,
              body: {
                result
              }
            })
          }
        })
      )
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
