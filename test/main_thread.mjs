import test from 'ava'
import { resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'

import { runMainThread, serializeError } from '../lib/main_thread.mjs'
import { mockHttpClient } from './_client.mjs'

const log = () => {}

test('happy path', async t => {
  t.plan(4)

  const request = mockHttpClient(
    path => {
      t.is(path, 'rpc/v1/run')
      return {
        body: {
          invocation: {
            _id: 'fulfilled_result'
          }
        }
      }
    },
    (path, options) => {
      t.is(path, 'rpc/v1/complete')
      t.like(options, {
        body: {
          result: 42
        }
      })
    }
  )

  const result = await runMainThread(
    log,
    request,
    resolvePath(
      fileURLToPath(import.meta.url),
      '..',
      '_worker.mjs'
    )
  )
  t.like(result, {
    status: 'fulfilled',
    value: 42
  })
})

test('handled rejection', async t => {
  t.plan(4)

  const request = mockHttpClient(
    path => {
      t.is(path, 'rpc/v1/run')
      return {
        body: {
          invocation: {
            _id: 'rejected_result'
          }
        }
      }
    },
    (path, options) => {
      t.is(path, 'rpc/v1/fail')
      t.like(options, {
        body: {
          reason: 'oh no'
        }
      })
    }
  )

  const result = await runMainThread(
    log,
    request,
    resolvePath(
      fileURLToPath(import.meta.url),
      '..',
      '_worker.mjs'
    )
  )
  t.like(result, {
    status: 'rejected',
    reason: 'oh no'
  })
})

test('no message', async t => {
  t.plan(4)

  const request = mockHttpClient(
    path => {
      t.is(path, 'rpc/v1/run')
      return {
        body: {
          invocation: {
            _id: 'clean_exit'
          }
        }
      }
    },
    (path, options) => {
      t.is(path, 'rpc/v1/fail')
      t.like(options, {
        body: {
          reason: {
            message: 'Early worker termination'
          }
        }
      })
    }
  )

  const result = await runMainThread(
    log,
    request,
    resolvePath(
      fileURLToPath(import.meta.url),
      '..',
      '_worker.mjs'
    )
  )
  t.like(result, {
    status: 'rejected',
    reason: {
      message: 'Early worker termination'
    }
  })
})

test('unhandled rejection', async t => {
  t.plan(4)

  const request = mockHttpClient(
    path => {
      t.is(path, 'rpc/v1/run')
      return {
        body: {
          invocation: {
            _id: 'yes rico kaboom'
          }
        }
      }
    },
    (path, options) => {
      t.is(path, 'rpc/v1/fail')
      t.like(options, {
        body: {
          reason: {
            message: 'Unknown command yes rico kaboom'
          }
        }
      })
    }
  )

  const result = await runMainThread(
    log,
    request,
    resolvePath(
      fileURLToPath(import.meta.url),
      '..',
      '_worker.mjs'
    )
  )
  t.like(result, {
    status: 'rejected',
    reason: {
      message: 'Unknown command yes rico kaboom'
    }
  })
})

test('logs collection', async t => {
  t.plan(6)

  const request = mockHttpClient(
    path => {
      t.is(path, 'rpc/v1/run')
      return {
        body: {
          invocation: {
            _id: 'test_logs_collection'
          }
        }
      }
    },
    (path, options) => {
      t.is(path, 'rpc/v1/log')
      t.is(
        options.body.toString(),
        'cache invalidation\nnaming things\n'
      )
    },
    (path, options) => {
      t.is(path, 'rpc/v1/complete')
      t.like(options, {
        body: {
          result: 'check logs'
        }
      })
    }
  )

  const result = await runMainThread(
    log,
    request,
    resolvePath(
      fileURLToPath(import.meta.url),
      '..',
      '_worker.mjs'
    )
  )
  t.like(result, {
    status: 'fulfilled',
    value: 'check logs'
  })
})

test('serializeError', t => {
  t.plan(1)

  t.like(
    serializeError(new Error('Test')),
    {
      type: 'Error',
      message: 'Test'
    }
  )
})
