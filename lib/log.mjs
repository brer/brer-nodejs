export class Pager {
  /**
   * Max buffer size in bytes, defaults to 1 MiB.
   */
  constructor (size = 1048576) {
    if (typeof size !== 'number' || !Number.isInteger(size) || size < 6) {
      throw new TypeError('Invalid chunking size (at least 6 bytes)')
    }

    this.buffer = Buffer.alloc(0)
    this.index = 0
    this.pages = []
    this.size = size
  }

  write (data) {
    if (!Buffer.isBuffer(data)) {
      throw new TypeError('Expected Buffer instance')
    }
    if (!data.byteLength) {
      return
    }

    const chunks = Array.from(
      splitBuffer(
        Buffer.concat([this.buffer, data]),
        this.size
      )
    )

    const tail = chunks.pop()
    if (!tail) {
      throw new Error('Expected buffer')
    }

    this.buffer = tail
    for (const chunk of chunks) {
      this.pages.push({
        buffer: chunk,
        index: this.index++
      })
    }
  }
}

export function * splitBuffer (buffer, size) {
  // Inclusive-start index
  let offset = 0

  while (offset < buffer.byteLength) {
    // Keep partial buffers
    if (buffer.byteLength - offset <= size) {
      yield offset === 0
        ? buffer
        : buffer.subarray(offset)
      return
    }

    // Exclusive-end index (maximum allowed)
    let end = Math.min(offset + size, buffer.byteLength)

    // Find the first heading byte, and split it away
    for (let i = 0; i < 6; i++) {
      if (end > offset && isHeadingByte(buffer[end])) {
        break
      } else if (i === 5) {
        end += 5 // unsupported encoding, reset the ending index
      } else {
        end--
      }
    }

    yield buffer.subarray(offset, end)
    offset = end
  }
}

/**
 * Detects heading UFT-8 bytes (split points).
 */
export function isHeadingByte (byte) {
  if (typeof byte !== 'number') {
    throw new TypeError('Expected byte (number)')
  }

  if ((byte & 0b10000000) === 0) {
    // ASCII
    return true
  }
  if ((byte & 0b11000000) === 0b11000000) {
    // Multi-bytes code points
    return true
  }

  // Something else we should probably ignore
  return false
}

/**
 * Send pages to server.
 */
export async function writeLog (request, invocationId, pager) {
  // Send all completed pages
  for (const page of pager.pages) {
    if (page.buffer.byteLength) {
      await request(
        `api/v1/invocations/${invocationId}/log/${page.index}`,
        {
          method: 'PUT',
          headers: {
            'content-type': 'text/plain; charset=utf-8'
          },
          body: page.buffer,
          consume: true
        }
      )

      // Mark page as done (release memory)
      page.buffer = Buffer.alloc(0)
    }
  }

  // Send current page
  if (pager.buffer.byteLength) {
    await request(
      `api/v1/invocations/${invocationId}/log/${pager.index}`,
      {
        method: 'PUT',
        headers: {
          'content-type': 'text/plain; charset=utf-8'
        },
        body: pager.buffer,
        consume: true
      }
    )
  }
}
