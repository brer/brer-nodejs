import fetch from 'node-fetch'

export function createHttpClient (log, token) {
  const doRequest = async (path, options) => {
    const response = await fetch(getRequestUrl(path), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json; charset=utf-8',
        'user-agent': 'brer-nodejs/alpha',
        ...options.headers
      },
      body: getRequestBody(options.body)
    })

    if (!response.ok) {
      throw new Error(
        `Route ${path} replied with status ${response.status} (${response.statusText})`
      )
    }

    let responseBody
    if (response.status !== 204) {
      if (
        !options.rawBody &&
        /^application\/json/.test(response.headers.get('content-type'))
      ) {
        responseBody = await response.json()
      } else {
        responseBody = Buffer.from(await response.arrayBuffer())
      }
    }

    return {
      headers: response.headers,
      body: responseBody,
      status: response.status
    }
  }

  const doRequestWithRetry = (path, options, attempts) => {
    return doRequest(path, options).catch(err => {
      log('failed request', err)

      if (attempts < 3) {
        return doRequestWithRetry(path, options, attempts + 1)
      } else {
        return Promise.reject(err)
      }
    })
  }

  return (path, options = {}) => doRequestWithRetry(path, options, 0)
}

function getRequestUrl (path) {
  return new URL(path, process.env.BRER_URL)
}

function getRequestBody (body = {}) {
  return Buffer.isBuffer(body)
    ? body
    : JSON.stringify(body)
}
