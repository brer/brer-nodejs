import test from 'ava'

import { isHeadingByte, splitBuffer } from './log.mjs'

test('isHeadingByte', t => {
  t.plan(5)

  t.throws(() => isHeadingByte(undefined), { instanceOf: TypeError })
  t.true(isHeadingByte(0x2A)) // '*' ASCII
  t.true(isHeadingByte(0xE2)) // '€' first byte
  t.false(isHeadingByte(0x82)) // '€' second byte
  t.false(isHeadingByte(0xAC)) // '€' third byte
})

test('split utf-8 buffer', t => {
  t.plan(4)

  const items = Array.from(
    splitBuffer(
      Buffer.from('€€€€a€'), // '€' is 3 bytes
      7
    )
  )

  t.is(items.length, 3)
  t.is(items[0].toString(), '€€')
  t.is(items[1].toString(), '€€a')
  t.is(items[2].toString(), '€')
})

test('split gibberish buffer', t => {
  t.plan(5)

  const buffer = Buffer.from(
    new Array(11).fill(0b10101010)
  )
  t.is(buffer.byteLength, 11)

  const items = Array.from(
    splitBuffer(buffer, 7)
  )
  t.is(items.length, 2)
  t.is(items[0].byteLength, 7)
  t.is(items[1].byteLength, 4)
  t.like(items, [
    [0b10101010, 0b10101010, 0b10101010, 0b10101010, 0b10101010, 0b10101010, 0b10101010],
    [0b10101010, 0b10101010, 0b10101010, 0b10101010]
  ])
})
