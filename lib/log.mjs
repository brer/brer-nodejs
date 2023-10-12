export function createLogCollector (client) {
  const pageSize = 1048576 // 1 MiB (bytes)

  // Enqueued log chunks to send as soon as possible
  const queue = []

  // Current partial (less than configured page size) log chunk
  let buffer = Buffer.alloc(0)

  // Current "drain queue" action
  let promise = null

  const drainQueue = async () => {
    while (queue.length > 0) {
      await client({
        method: 'POST',
        url: 'rpc/v1/log',
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
