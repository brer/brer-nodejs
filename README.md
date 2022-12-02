# Brer bindings for Node.js

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

This is the Node.js package for Brer Function declaration.

```javascript
import brer from 'brer'

brer(async function myTask (payload, ctx) {
  console.log('Function name: ' + ctx.invocation.functionName)
  console.log('Invocation id: ' + ctx.invocation._id)

  console.log('Payload type: ' + ctx.contentType)
  // TODO: do something useful with the payload (Buffer)
})
```
