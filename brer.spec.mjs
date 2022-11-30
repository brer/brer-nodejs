import test from 'ava'
import nock from 'nock'

import brer from './brer.mjs'

test('brer', async t => {
  const scope = nock('http://brer')

  scope
    .post('/_api/v1/download', {})
    .reply(
      200,
      { hello: 'world' },
      {
        'content-type': 'application/json',
        'x-brer-function-name': 'my_function',
        'x-brer-invocation-id': 'my_invocation'
      }
    )

  await new Promise((resolve, reject) => {
    brer(
      async (payload, ctx) => {
        t.deepEqual(
          JSON.parse(payload.toString()),
          { hello: 'world' }
        )
        // TODO: somehow Got.js doesn't parse any header with Nock
        // t.is(ctx.functionName, 'my_function')
        // t.is(ctx.invocationId, 'my_invocation')
      },
      (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(result)
        }
      }
    )
  })
})
