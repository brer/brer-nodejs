export function mockHttpClient (...fns) {
  let i = 0
  return async (path, options = {}) => {
    const fn = fns[i++]
    if (!fn) {
      throw new Error(`Request #${i} was not mocked`)
    }

    const { body, headers } = fn(path, options) || {}

    const contentType = Buffer.isBuffer(body)
      ? 'application/octet-stream'
      : 'application/json'

    return {
      headers: wrapHeaders({
        'content-type': contentType,
        ...headers
      }),
      body,
      status: body === undefined ? 204 : 200
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
