import test from 'ava'

import { registerGlobalHandler } from '../lib/handlers.mjs'
import { handleInvocation } from '../lib/worker.mjs'
import { mockHttpClient } from './_client.mjs'

const invocationId = 'test-worker'
const log = () => {}
const wrap = fn => {
  const handlers = {}
  registerGlobalHandler(handlers, fn)
  return handlers
}

test('ok handler', async t => {
  t.plan(5)

  const request = mockHttpClient(
    (path, options) => {
      t.is(path, `invoker/v1/invocations/${invocationId}`)
      t.like(options, {
        body: {
          status: 'running'
        }
      })
      return {
        body: {
          invocation: {
            _id: 'happy_path'
          }
        }
      }
    },
    path => {
      t.is(path, `invoker/v1/invocations/${invocationId}/payload`)
      return {
        body: {}
      }
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

  const result = await handleInvocation(
    { invocationId, log, request },
    wrap(handler)
  )
  t.like(result, {
    status: 'fulfilled',
    value: 42
  })
})

test('ko handler', async t => {
  t.plan(5)

  const request = mockHttpClient(
    (path, options) => {
      t.is(path, `invoker/v1/invocations/${invocationId}`)
      t.like(options, {
        body: {
          status: 'running'
        }
      })
      return {
        body: {
          invocation: {
            _id: 'yes_rico'
          }
        }
      }
    },
    path => {
      t.is(path, `invoker/v1/invocations/${invocationId}/payload`)
      return {
        body: {}
      }
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

  const result = await handleInvocation(
    { invocationId, log, request },
    wrap(handler)
  )
  t.like(result, {
    status: 'rejected',
    reason: {
      message: 'Kaboom!'
    }
  })
})

test('no handler', async t => {
  t.plan(3)

  const request = mockHttpClient(
    (path, options) => {
      t.is(path, `invoker/v1/invocations/${invocationId}`)
      t.like(options, {
        method: 'PUT',
        body: {
          status: 'running'
        }
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

  const result = await handleInvocation(
    { invocationId, log, request },
    {}
  )
  t.like(result, {
    status: 'rejected',
    reason: 'handler for oopsie function not found'
  })
})

test('test mode', async t => {
  t.plan(3)

  const request = mockHttpClient(
    (path, options) => {
      t.is(path, `invoker/v1/invocations/${invocationId}`)
      t.like(options, {
        method: 'PUT',
        body: {
          status: 'running'
        }
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

  const result = await handleInvocation(
    { invocationId, log, request },
    wrap(handler)
  )
  t.like(result, {
    status: 'fulfilled',
    value: {
      runtime: {
        type: 'Node.js'
      }
    }
  })
})

test('progress update', async t => {
  t.plan(7)

  const request = mockHttpClient(
    (path, options) => {
      t.is(path, `invoker/v1/invocations/${invocationId}`)
      t.like(options, {
        method: 'PUT',
        body: {
          status: 'running'
        }
      })
      return {
        body: {
          invocation: {
            _id: 'progress'
          }
        }
      }
    },
    path => {
      t.is(path, `invoker/v1/invocations/${invocationId}/payload`)
      return {
        body: {}
      }
    },
    (path, options) => {
      t.is(path, `invoker/v1/invocations/${invocationId}`)
      t.like(options, {
        method: 'PUT',
        body: {
          status: 'running',
          result: 4
        }
      })
    },
    (path, options) => {
      t.is(path, `invoker/v1/invocations/${invocationId}`)
      t.like(options, {
        method: 'PUT',
        body: {
          status: 'running',
          result: 2
        }
      })
    }
  )

  const handler = async (payload, ctx) => {
    await ctx.progress(4)
    await ctx.progress(2)
  }

  await handleInvocation(
    { invocationId, log, request },
    wrap(handler)
  )
})
