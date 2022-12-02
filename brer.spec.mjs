import test from 'ava'
import nock from 'nock'

import brer from './brer.mjs'

test('brer', async t => {
  const rejection = await brer(null)
  t.is(rejection.status, 'rejected')
  t.true(rejection.reason instanceof TypeError)

  const invocationId = '00000000-0000-0000-0000-000000000000' // See ava env
  const scope = nock('https://fake.brer.io')

  scope
    .patch(`/api/v1/invocations/${invocationId}`, { status: 'running' })
    .reply(200, {
      invocation: {
        _id: invocationId,
        functionName: 'my_function'
      }
    })

  scope
    .get(`/api/v1/invocations/${invocationId}/payload`)
    .reply(200, { hello: 'world' })

  scope
    .patch(`/api/v1/invocations/${invocationId}`, {
      status: 'completed',
      result: 42
    })
    .reply(200, {})

  const result = await brer(async (payload, ctx) => {
    t.deepEqual(
      JSON.parse(payload.toString()),
      { hello: 'world' }
    )
    t.like(ctx, {
      invocation: {
        _id: invocationId,
        functionName: 'my_function'
      }
    })
    return 42
  })

  t.deepEqual(result, {
    status: 'fulfilled',
    value: 42
  })
})
