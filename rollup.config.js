export default {
  input: './brer.mjs',
  output: {
    file: './brer.cjs',
    format: 'cjs'
  },
  external: [
    'got',
    'node:util'
  ]
}
