import { getHandler } from './handlers.mjs'
import { asFulfilled, asRejected } from './util.mjs'

export async function handleInvocation (log, request, handlers) {
  log('download invocation')
  const { body: { invocation } } = await request('rpc/v1/run')

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
      path: 'rpc/v1/download',
      rawBody: true
    })

    log('execute handler')
    try {
      return asFulfilled(
        await fn(response.body, {
          contentType: response.headers.get('content-type'),
          invocation
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
