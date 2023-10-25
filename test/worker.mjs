import test from 'ava'

import { registerGlobalHandler } from '../lib/handlers.mjs'
import { handleInvocation } from '../lib/worker.mjs'
import { mockHttpClient } from './_client.mjs'

const log = () => {}
const wrap = fn => {
  const handlers = {}
  registerGlobalHandler(handlers, fn)
  return handlers
}

test('ok handler', async t => {
  t.plan(4)

  const request = mockHttpClient(
    options => {
      t.like(options, {
        path: 'rpc/v1/run'
      })
      return {
        body: {
          invocation: {
            _id: 'happy_path'
          }
        }
      }
    },
    options => {
      t.like(options, {
        path: 'rpc/v1/download'
      })
    }
  )

  const handler = (payload, ctx) => {
    t.like(ctx, {
      invocation: {
        _id: 'happy_path'
      }
    })
    return 42
  }

  const result = await handleInvocation(log, request, wrap(handler))
  t.like(result, {
    status: 'fulfilled',
    value: 42
  })
})

test('ko handler', async t => {
  t.plan(4)

  const request = mockHttpClient(
    options => {
      t.like(options, {
        path: 'rpc/v1/run'
      })
      return {
        body: {
          invocation: {
            _id: 'yes_rico'
          }
        }
      }
    },
    options => {
      t.like(options, {
        path: 'rpc/v1/download'
      })
    }
  )

  const handler = (payload, ctx) => {
    t.like(ctx, {
      invocation: {
        _id: 'yes_rico'
      }
    })
    return Promise.reject(new Error('Kaboom!'))
  }

  const result = await handleInvocation(log, request, wrap(handler))
  t.like(result, {
    status: 'rejected',
    reason: {
      message: 'Kaboom!'
    }
  })
})

test('no handler', async t => {
  t.plan(2)

  const request = mockHttpClient(
    options => {
      t.like(options, {
        path: 'rpc/v1/run'
      })
      return {
        body: {
          invocation: {
            _id: 'oopsie',
            functionName: 'oopsie'
          }
        }
      }
    }
  )

  const result = await handleInvocation(log, request, {})
  t.like(result, {
    status: 'rejected',
    reason: 'handler for oopsie function not found'
  })
})

test('test mode', async t => {
  t.plan(2)

  const request = mockHttpClient(
    options => {
      t.like(options, {
        path: 'rpc/v1/run'
      })
      return {
        body: {
          invocation: {
            _id: 'fast',
            env: [
              {
                name: 'BRER_MODE',
                value: 'test'
              }
            ]
          }
        }
      }
    }
  )

  const handler = () => {
    t.fail()
    return Promise.reject(new Error())
  }

  const result = await handleInvocation(log, request, wrap(handler))
  t.like(result, {
    status: 'fulfilled',
    value: {
      runtime: {
        type: 'Node.js'
      }
    }
  })
})
