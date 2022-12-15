import test from 'ava'
import nock from 'nock'

import brer from './brer.mjs'

const scope = nock('https://fake.brer.io')

test('validation', async t => {
  await t.throwsAsync(() => brer(null), {
    instanceOf: TypeError,
    message: 'Expected handler function'
  })
})

test('completed invocation', async t => {
  scope
    .post('/rpc/v1/run', {})
    .reply(200, {
      invocation: {
        _id: 'my_completed_invocation',
        functionName: 'my_function'
      }
    })

  scope
    .post('/rpc/v1/download')
    .reply(200, { hello: 'world' })

  scope
    .post('/rpc/v1/complete', { result: 42 })
    .reply(200, {})

  const result = await brer(async (payload, ctx) => {
    t.deepEqual(
      JSON.parse(payload.toString()),
      { hello: 'world' }
    )
    t.like(ctx, {
      invocation: {
        _id: 'my_completed_invocation',
        functionName: 'my_function'
      }
    })
    return 42
  })

  t.is(result, 42)
})

test('failed invocation', async t => {
  scope
    .post('/rpc/v1/run', {})
    .reply(200, {
      invocation: {
        _id: 'my_failed_invocation',
        functionName: 'my_function'
      }
    })

  scope
    .post('/rpc/v1/download')
    .reply(200, { hello: 'world' })

  scope
    .post('/rpc/v1/fail', data => t.like(data, {
      reason: {
        message: 'Cockroaches'
      }
    }))
    .reply(200, {})

  await t.throwsAsync(
    () => brer(async (payload, ctx) => {
      t.deepEqual(
        JSON.parse(payload.toString()),
        { hello: 'world' }
      )
      t.like(ctx, {
        invocation: {
          _id: 'my_failed_invocation',
          functionName: 'my_function'
        }
      })
      throw new Error('Cockroaches')
    }),
    { message: 'Cockroaches' }
  )
})
