import { debug } from 'node:util'

const log = debug('brer')

export default function brer (handler, callback) {
  if (typeof handler !== 'function') {
    throw new TypeError('Expected handler function')
  }

  run(handler).then(
    result => {
      log('all done')
      if (callback) {
        callback(null, result)
      }
      if (process.env.NODE_ENV !== 'test') {
        process.exit(0)
      }
    },
    err => {
      log('failed')
      if (callback) {
        callback(err)
      }
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1)
      }
    }
  )
}

async function run (handler) {
  const token = process.env.BRER_TOKEN
  if (!token) {
    throw new Error('Detected a Brer invocation outside its context')
  }

  // Use dynamic import to support "old" CommonJS runtimes (Got.js is pure ESM)
  log('import got')
  const { default: got } = await import('got')

  log('import download payload')
  const response = await got({
    method: 'POST',
    prefixUrl: process.env.BRER_URL || 'http://brer',
    url: '_api/v1/download',
    headers: {
      authorization: `Bearer ${token}`
    },
    json: {},
    responseType: 'buffer',
    retry: {
      limit: 2
    }
  })

  log('run handler')
  const ctx = {
    contentType: response.headers['content-type'],
    functionName: response.headers['x-brer-function-name'],
    invocationId: response.headers['x-brer-invocation-id']
  }
  return handler(response.body, ctx)
}
