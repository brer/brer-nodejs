/**
 * Download the payload and run the handler.
 * Nothing special here.
 * Promise fulfillment/rejection is left untouched.
 */
export async function runChildThread (log, request, invocation, handler) {
  if (isTestMode(invocation)) {
    log('test run detected')
    return {
      runtime: {
        type: 'Node.js',
        arch: process.arch,
        platform: process.platform,
        version: process.version
      }
    }
  } else {
    const fn = getFunctionHandler(handler, invocation.functionName)

    log('download payload')
    const response = await request('rpc/v1/download', { rawBody: true })

    log('execute handler')
    return fn(response.body, {
      contentType: response.headers.get('content-type'),
      invocation
    })
  }
}

function isTestMode (invocation) {
  // Env check is faster, but during tests its not possible
  return process.env.BRER_MODE === 'test' ||
    invocation.env.find(item => item.name === 'BRER_MODE')?.value === 'test'
}

export function getFunctionHandler (handler, functionName) {
  if (typeof handler === 'object' && handler !== null) {
    handler = handler[functionName] || handler._
  }
  if (typeof handler !== 'function') {
    throw new TypeError(
      `Cannot find a valid handler for function ${functionName}`
    )
  }
  return handler
}
