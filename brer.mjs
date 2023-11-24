import { debug } from 'node:util'

import { createHttpClient } from './lib/client.mjs'
import {
  mergeHandlers,
  registerGlobalHandler,
  registerHandler
} from './lib/handlers.mjs'
import { executeRuntime } from './lib/runtime.mjs'
import { handleInvocation } from './lib/worker.mjs'
import { asRejected, serializeError } from './lib/util.mjs'

const handlers = {}
const log = debug('brer')

export default function brer (oneOrMore) {
  const invocationId = process.env.BRER_INVOCATION_ID
  const token = process.env.BRER_TOKEN
  if (!invocationId || !token) {
    return false
  }
  if (oneOrMore !== undefined) {
    register(oneOrMore)
  }

  const app = {
    invocationId,
    log,
    request: createHttpClient(log, token)
  }

  const promise = !process.send
    ? executeRuntime(app)
    : handleInvocation(app, handlers)
      .catch(err => asRejected(serializeError(err)))
      .then(obj => process.send(obj))

  promise.then(
    () => {
      log('all done')
      shutdown(0)
    },
    err => {
      // This is a bad error (Brer is offline or other stranger things)
      console.error('Brer runtime failure')
      console.error(err)
      shutdown(1)
    }
  )

  return true
}

function shutdown (code) {
  // Set the resulting exit code if Node.js terminates before timeout
  process.exitCode = code

  const timer = setTimeout(
    () => {
      console.error('Exit timeout reached.')
      console.error('This function left some running code after its ending.')
      process.exit(code)
    },
    10000
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
