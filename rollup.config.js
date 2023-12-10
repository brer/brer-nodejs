export default {
  input: './brer.mjs',
  output: {
    exports: 'named',
    file: './brer.cjs',
    format: 'cjs'
  },
  external: [
    'node:child_process',
    'node:util',
    'undici'
  ]
}
