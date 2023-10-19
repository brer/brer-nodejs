/**
 * 1 MiB by default.
 */
export function createLogCollector (request, pageSize = 1048576) {
  // Enqueued log chunks to send as soon as possible
  const queue = []

  // Current partial (less than configured page size) log chunk
  let buffer = Buffer.alloc(0)

  // Current "drain queue" action
  let promise = null

  const drainQueue = async () => {
    while (queue.length > 0) {
      await request('rpc/v1/log', {
        headers: {
          'content-type': 'text/plain; charset=utf-8'
        },
        body: queue[0]
      })

      queue.shift()
    }
  }

  return async chunk => {
    if (chunk) {
      if (!Buffer.isBuffer(chunk)) {
        throw new TypeError('Expected a Buffer instance')
      }

      buffer = Buffer.concat([buffer, chunk])

      if (buffer.byteLength >= pageSize) {
        queue.push(buffer.subarray(0, pageSize))
        buffer = buffer.subarray(pageSize)
      }
    } else if (buffer.byteLength > 0) {
      queue.push(buffer)
      buffer = Buffer.alloc(0)
    }

    if (!promise) {
      promise = drainQueue().then(
        value => {
          promise = null
          return value
        },
        err => {
          promise = null
          return Promise.reject(err)
        }
      )
    }

    return promise
  }
}

/**
 * Handle rejections with a debug log.
 * Log collection route is the same sa other RPC routes, so there's no need to actively print some errors.
 */
export function handleCollectErrors (log, collect) {
  return chunk => collect(chunk).catch(err => log('log collection error', err))
}

/**
 * Fire log collection after some inactivity.
 * This is useful to collect last lines from stdout that doesn't reach 1 MiB.
 */
export function applyLogTimeout (
  log,
  collect,
  msTimeout = 60000,
  msInterval = 20000
) {
  let lastCollect = 0

  const timer = setInterval(
    () => {
      if (Date.now() - lastCollect >= msTimeout) {
        log('log timeout reached')
        collect()
      }
    },
    msInterval
  )

  return chunk => {
    if (!chunk) {
      clearInterval(timer)
    }
    lastCollect = Date.now()
    return collect(chunk)
  }
}
