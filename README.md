# Brer bindings for Node.js

This is the Node.js package for Brer Function declaration.

```javascript
import brer from 'brer'

brer(async function (payload, ctx) {
  console.log('Function name: ' + ctx.functionName)
  console.log('Invocation id: ' + ctx.functionName)

  console.log('Payload type: ' + ctx.contentType)
  // TODO: do something useful with the payload (Buffer)
})
```
