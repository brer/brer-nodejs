import { debug } from 'node:util'
import { isMainThread, parentPort, workerData } from 'node:worker_threads'

import { runChildThread } from './lib/child_thread.mjs'
import { createHttpClient } from './lib/client.mjs'
import {
  mergeHandlers,
  registerGlobalHandler,
  registerHandler
} from './lib/handlers.mjs'
import { runMainThread, serializeError } from './lib/main_thread.mjs'

const handlers = {}
const log = debug('brer')

export default function brer (oneOrMore) {
  const token = process.env.BRER_TOKEN
  if (!token) {
    return false
  }
  if (oneOrMore !== undefined) {
    register(oneOrMore)
  }

  const request = createHttpClient(log, token)

  const promise = isMainThread
    ? runMainThread(log, request, process.argv[1])
    : runChildThread(log, request, workerData, handlers)
      .then(value => {
        log('task completed', value)
        return {
          status: 'fulfilled',
          value
        }
      })
      .catch(err => {
        log('task failed', err)
        return {
          status: 'rejected',
          reason: serializeError(err)
        }
      })
      .then(result => parentPort.postMessage(result))

  promise.then(
    value => {
      log('all done', value)
      shutdown(0)
    },
    err => {
      console.error('unhandled exception', err)
      shutdown(1)
    }
  )

  return true
}

function shutdown (code) {
  if (isMainThread) {
    // Main thread can skip the waiting time
    process.exit(code)
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

export function register (oneOrMany, fnHandler) {
  if (typeof oneOrMany === 'string') {
    registerHandler(handlers, oneOrMany, fnHandler)
  } else if (typeof oneOrMany === 'function') {
    registerGlobalHandler(handlers, oneOrMany)
  } else if (typeof oneOrMany === 'object' && oneOrMany !== null) {
    mergeHandlers(handlers, oneOrMany)
  } else {
    throw new TypeError('Unexpected value type')
  }
}
