import { Worker } from 'node:worker_threads'

import {
  applyLogTimeout,
  createLogCollector,
  handleCollectErrors
} from './log.mjs'

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

  const collect = applyLogTimeout(
    log,
    handleCollectErrors(log, createLogCollector(request))
  )

  const result = await handleWorker(log, collect, file, invocation)

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

export function handleWorker (log, collect, workerFile, workerData) {
  return new Promise(resolve => {
    log('create worker')
    const worker = new Worker(workerFile, {
      workerData,
      stderr: process.env.BRER_NODEJS_PIPE_STDERR === 'disable',
      stdout: process.env.BRER_NODEJS_PIPE_STDOUT === 'disable'
    })

    worker.stdout.on('data', collect)

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

    worker.once('message', data => {
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
