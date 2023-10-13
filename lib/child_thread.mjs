import * as os from 'node:os'

/**
 * Download the payload and run the handler.
 * Nothing special here.
 * Promise fulfillment/rejection is left untouched.
 */
export async function runChildThread (log, request, invocation, handler) {
  if (isTestMode(invocation)) {
    log('test run detected')
    return {
      runtime: 'Node.js',
      node: {
        arch: process.arch,
        platform: process.platform,
        version: process.version
      },
      os: {
        arch: os.arch(),
        cpus: os.cpus(),
        endianness: os.endianness(),
        machine: os.machine(),
        platform: os.platform(),
        type: os.type(),
        version: os.version()
      }
    }
  } else {
    log('download payload')
    const response = await request('rpc/v1/download')

    log('execute handler')
    return handler(response.body, {
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
