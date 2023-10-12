import got from 'got'
import { debug } from 'node:util'
import { Worker, isMainThread } from 'node:worker_threads'

import { createLogCollector } from './lib/log.mjs'

const log = debug('brer')

export default function brer (handler) {
  let promise = isMainThread && process.env.BRER_WORKER !== 'disable'
    ? forkJob()
    : runJob(handler)

  promise = promise.then(
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

function forkJob () {
  return new Promise((resolve, reject) => {
    const unhandledCollect = createLogCollector(createClient())

    const collect = data => unhandledCollect(data)
      .catch(err => log('log collection error', err))

    const worker = new Worker(
      process.env.BRER_WORKER || process.argv[1],
      {
        stderr: true,
        stdin: true,
        stdout: true
      }
    )

    worker.stdout.on('data', collect)
    worker.stderr.on('data', collect)

    const done = (err, value) => collect().then(() => {
      if (err) {
        resolve({
          status: 'rejected',
          reason: err
        })
      } else {
        resolve({
          status: 'fulfilled',
          value
        })
      }
    })

    // Raw errors should never occur (reject instantly)
    worker.on('error', reject)

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

function noop () {
  // Nothing to do
}

function gracefulShutdown (code) {
  if (process.env.BRER_WORKER === 'disable') {
    // Ignore process exit during tests
    return
  }

  // Set the resulting exit code if Node.js terminates before timeout
  process.exitCode = code

  const timer = setTimeout(
    () => {
      console.error('Exit timeout reached.')
      console.error('This function left some running code after its ending.')
      process.exit(code)
    },
    60000
  )

  // Let Node.js die :)
  timer.unref()
}

function createClient () {
  if (!process.env.BRER_TOKEN) {
    throw new Error('Detected a Brer invocation outside its context')
  }

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

async function runJob (handler) {
  if (typeof handler !== 'function') {
    throw new TypeError('Expected handler function')
  }

  const client = createClient()

  log('fetch invocation')
  const { invocation } = await client({
    method: 'POST',
    url: 'rpc/v1/run',
    json: {},
    resolveBodyOnly: true
  })

  log('fetch payload')
  const payload = await client({
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
  await client({
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
