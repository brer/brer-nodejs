import test from 'ava'

import { createLogCollector } from '../lib/log.mjs'

test('do not log partial pages', async t => {
  const request = () => {
    t.fail()
    return Promise.reject(new Error('Unexpected'))
  }

  const collect = createLogCollector(request, 128)

  await collect(Buffer.alloc(127))
  t.pass()
})

test('log full page and final partial', async t => {
  t.plan(6)

  let i = 0
  const request = options => {
    t.like(options, { path: 'rpc/v1/log' })
    t.true(Buffer.isBuffer(options.body))
    if (i === 0) {
      t.is(options.body.byteLength, 128)
    } else if (i === 1) {
      t.is(options.body.byteLength, 42)
    } else {
      t.fail()
    }
    i++
  }

  const collect = createLogCollector(request, 128)

  await collect(Buffer.alloc(127))
  await collect(Buffer.alloc(43))
  await collect()
})
