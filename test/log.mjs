import test from 'ava'

import { createLogCollector } from '../lib/log.mjs'
import { mockHttpClient } from './_client.mjs'

test('do not log partial pages', async t => {
  const request = () => {
    t.fail()
    return Promise.reject(new Error('Unexpected'))
  }

  const collect = createLogCollector(request, 'my-invocation', 128)

  await collect(Buffer.alloc(127))
  t.pass()
})

test('log full page and final partial', async t => {
  t.plan(4)

  const request = mockHttpClient(
    (path, options) => {
      t.is(path, 'api/v1/invocations/my-invocation/log/0')
      t.like(options, {
        body: {
          byteLength: 128
        }
      })
    },
    (path, options) => {
      t.is(path, 'api/v1/invocations/my-invocation/log/1')
      t.like(options, {
        body: {
          byteLength: 42
        }
      })
    }
  )

  const collect = createLogCollector(request, 'my-invocation', 128)

  await collect(Buffer.alloc(127))
  await collect(Buffer.alloc(43))
  await collect()
})
