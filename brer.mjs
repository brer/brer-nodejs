import { debug } from 'node:util'

const log = debug('brer')

export default function brer (handler) {
  const promise = run(handler).then(
    result => {
      gracefulShutdown(0)
      return result.status === 'fulfilled'
        ? result.value
        : Promise.reject(result.reason)
    },
    err => {
      gracefulShutdown(1)
      return Promise.reject(err)
    }
  )

  // Break Promise chain (avoid Node.js UnhandledError)
  promise.catch(noop)

  return promise
}

function noop () {
  // Nothing to do
}

function gracefulShutdown (code) {
  if (process.env.NODE_ENV === 'test') {
    // Ignore process exit during tests
    return
  }

  // Set the resulting exit code if Node.js terminates before timeout
  process.exitCode = code

  const timer = setTimeout(
    () => {
      console.log('Exit timeout reached.')
      console.log('This function left some running code after its ending.')
      process.exit(code)
    },
    60000 // TODO: options?
  )

  // Let Node.js die :)
  timer.unref()
}

async function run (handler) {
  if (typeof handler !== 'function') {
    throw new TypeError('Expected handler function')
  }

  log('import got')
  const got = await createClient()

  log('fetch invocation')
  const { invocation } = await got({
    method: 'POST',
    url: 'rpc/v1/run',
    json: {},
    resolveBodyOnly: true
  })

  log('fetch payload')
  const payload = await got({
    method: 'POST',
    url: 'rpc/v1/download',
    json: {},
    responseType: 'buffer',
    resolveBodyOnly: false
  })

  const ctx = {
    contentType: payload.headers['content-type'],
    invocation
  }

  const result = { status: 'unknown' }

  log('run task handler')
  try {
    result.value = await handler(payload.body, ctx)
    result.status = 'fulfilled'
    log('task completed')
  } catch (err) {
    result.reason = err
    result.status = 'rejected'
    log('task failed')
  }

  log('close invocation')
  const action = result.status === 'fulfilled' ? 'complete' : 'fail'
  await got({
    method: 'POST',
    url: `rpc/v1/${action}`,
    json: {
      reason: serializeError(result.reason),
      result: result.value
    }
  })

  return result
}

function serializeError (err) {
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

async function createClient () {
  if (!process.env.BRER_TOKEN) {
    throw new Error('Detected a Brer invocation outside its context')
  }

  // Use dynamic import to support "old" CommonJS runtimes (Got.js is pure ESM)
  const { default: got } = await import('got')

  return got.extend({
    prefixUrl: process.env.BRER_URL || 'http://127.0.0.1:3000',
    headers: {
      authorization: `Bearer ${process.env.BRER_TOKEN}`
    },
    responseType: 'json',
    retry: {
      limit: 2
    }
  })
}
