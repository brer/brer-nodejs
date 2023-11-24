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
  t.plan(2)

  const request = mockHttpClient(
    options => {
      t.like(options, {
        path: 'invoker/v1/invocations/my-invocation/log/0',
        body: {
          byteLength: 128
        }
      })
    },
    options => {
      t.like(options, {
        path: 'invoker/v1/invocations/my-invocation/log/1',
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
