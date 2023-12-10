export function mockHttpClient (...fns) {
  let i = 0
  return async (path, options = {}) => {
    const fn = fns[i++]
    if (!fn) {
      throw new Error(`Request #${i} was not mocked`)
    }

    const { body, headers } = fn(path, options) || {}

    return {
      headers: wrapHeaders({
        'content-type': 'application/json',
        ...headers
      }),
      status: body === undefined ? 204 : 200,
      arrayBuffer: () => Promise.resolve(Buffer.from(JSON.stringify(body))),
      json: () => Promise.resolve(body)
    }
  }
}

function wrapHeaders (obj) {
  const map = new Map()
  for (const key of Object.keys(obj)) {
    map.set(key, obj[key])
  }
  return map
}
