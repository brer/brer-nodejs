import test from 'ava'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { executeRuntime } from '../lib/runtime.mjs'
import { mockHttpClient } from './_client.mjs'

const invocationId = 'test-runtime'
const dummy = resolve(fileURLToPath(import.meta.url), '..', '_child.mjs')
const log = () => {}
const run = (request, env) => executeRuntime(
  { log, request, invocationId },
  dummy,
  env
)

test('ok handler', async t => {
  t.plan(8)

  const request = mockHttpClient(
    (path, options) => {
      t.is(path, `api/v1/invocations/${invocationId}`)
      t.like(options, {
        method: 'PUT',
        body: {
          status: 'running'
        }
      })
      return {
        body: {
          invocation: {
            _id: 'fulfilled_result'
          }
        }
      }
    },
    (path, options) => {
      t.is(path, `api/v1/invocations/${invocationId}/log/0`)
      t.like(options, {
        method: 'PUT'
      })
      t.is(options.body.toString('utf-8'), 'hello\nworld\n')
    },
    (path, options) => {
      t.is(path, `api/v1/invocations/${invocationId}`)
      t.like(options, {
        method: 'PUT',
        body: {
          status: 'completed',
          result: 42
        }
      })
    }
  )

  const obj = await run(request, {
    BRER_NODEJS_MODE: 'fulfilled'
  })
  t.like(obj, {
    status: 'fulfilled',
    value: 42
  })
})

test('ko handler', async t => {
  t.plan(8)

  const request = mockHttpClient(
    (path, options) => {
      t.is(path, `api/v1/invocations/${invocationId}`)
      t.like(options, {
        method: 'PUT',
        body: {
          status: 'running'
        }
      })
      return {
        body: {
          invocation: {
            _id: 'rejected_result'
          }
        }
      }
    },
    (path, options) => {
      t.is(path, `api/v1/invocations/${invocationId}/log/0`)
      t.like(options, {
        method: 'PUT'
      })
      t.is(options.body.toString('utf-8'), 'oh\nno\n')
    },
    (path, options) => {
      t.is(path, `api/v1/invocations/${invocationId}`)
      t.like(options, {
        method: 'PUT',
        body: {
          status: 'failed',
          reason: {
            type: 'Error',
            message: 'Oh no'
          }
        }
      })
    }
  )

  const obj = await run(request, {
    BRER_NODEJS_MODE: 'rejected'
  })
  t.like(obj, {
    status: 'rejected',
    reason: {
      type: 'Error',
      message: 'Oh no'
    }
  })
})

test('early worker termination', async t => {
  t.plan(8)

  const request = mockHttpClient(
    (path, options) => {
      t.is(path, `api/v1/invocations/${invocationId}`)
      t.like(options, {
        method: 'PUT',
        body: {
          status: 'running'
        }
      })
      return {
        body: {
          invocation: {
            _id: 'rejected_result'
          }
        }
      }
    },
    (path, options) => {
      t.is(path, `api/v1/invocations/${invocationId}/log/0`)
      t.like(options, {
        method: 'PUT'
      })
      t.is(options.body.toString('utf-8'), 'moon\nmoon\n')
    },
    (path, options) => {
      t.is(path, `api/v1/invocations/${invocationId}`)
      t.like(options, {
        body: {
          status: 'failed',
          reason: 'early worker termination'
        }
      })
    }
  )

  const obj = await run(request, {
    BRER_NODEJS_MODE: 'exit'
  })
  t.like(obj, {
    status: 'rejected',
    reason: 'early worker termination'
  })
})
