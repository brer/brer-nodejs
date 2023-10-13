import { Worker } from 'node:worker_threads'

/**
 * Run (and download) the Invocation checking its status.
 * Then spawn the Worker Thread to do the real stuff.
 * Then complete/fail the Invocation.
 *
 * Result value is an object similar to the `Promise.allSettled`'s output
 * (object with status and value/reason).
 */
export async function runMainThread (log, request, file) {
  log('run invocation')
  const { body: { invocation } } = await request('rpc/v1/run')

  const result = await handleWorker(log, request, file, invocation)

  log('close invocation')
  await request(
    `rpc/v1/${result.status === 'fulfilled' ? 'complete' : 'fail'}`,
    {
      body: {
        reason: serializeError(result.reason),
        result: result.value
      }
    }
  )

  return result
}

export function handleWorker (log, request, workerFile, workerData) {
  return new Promise(resolve => {
    const unhandledCollect = createLogCollector(request)

    const collect = data => unhandledCollect(data)
      .catch(err => log('log collection error', err))

    log('create worker')
    const worker = new Worker(workerFile, {
      workerData,
      stderr: process.env.NODE_ENV === 'test',
      stdout: process.env.NODE_ENV === 'test'
    })

    // TODO: unhandled rejections/errors skip THIS stderr, should we handle the event manually?
    worker.stdout.on('data', collect)
    worker.stderr.on('data', collect)

    worker.on('online', () => log('worker is online'))

    let result = null

    const done = once(
      err => collect().then(() => {
        if (err) {
          resolve({
            status: 'rejected',
            reason: err
          })
        } else if (!result) {
          resolve({
            status: 'rejected',
            reason: new Error('Early worker termination')
          })
        } else {
          resolve(result)
        }
      })
    )

    worker.on('message', data => {
      // Worker has completed its task and It's shutting down
      result = data
    })

    worker.on('error', err => {
      log('worker error', err)
      done(err)
    })

    worker.on('exit', code => {
      log(`worker exited with code ${code}`)
      if (code === 0) {
        done(null)
      } else {
        done(new Error(`Worker exited with code ${code}`))
      }
    })
  })
}

function once (fn) {
  return err => {
    fn(err)
    fn = noop
  }
}

function noop () {
  // nothing to do
}

export function createLogCollector (request) {
  const pageSize = 1048576 // 1 MiB (bytes)

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
 * Cast an Error instance into some JSON value with enough details.
 */
export function serializeError (err) {
  if (!(err instanceof Error) || typeof Object(err).toJSON === 'function') {
    return err
  }
  const result = {
    type: err.constructor.name,
    code: err.code,
    message: err.message,
    stack: err.stack
  }
  const usedKeys = Object.keys(result)
  for (const key of Object.keys(err)) {
    if (!usedKeys.includes(key)) {
      result[key] = err[key]
    }
  }
  return result
}
