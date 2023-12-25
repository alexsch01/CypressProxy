# Socket

This is a shared lib for holding both the `socket.io` server and client.

## Using

```javascript
const socket = require(process.argv[1]+"/../socket")

// returns
{
  server: require("socket.io"),
  getPathToClientSource: function () {
    // returns path to the client 'socket.io.js' file
    // for use in the browser
  }
}
```

```javascript
const socket = require(process.argv[1]+"/../socket")

// server usage
const srv = require("http").createServer()
const io = socket.server(srv)
io.on("connection", function(){})

// client usage
const { client } = require(process.argv[1]+"/../socket/lib/client")
const client = socket.client("http://localhost:2020")
client.on("connect", function(){})
client.on("event", function(){})
client.on("disconnect", function(){})

// path usage
socket.getPathToClientSource()
// returns your/path/to/node_modules/socket.io-client/socket.io.js0
```

## Testing

```bash
yarn workspace @packages/socket test
```
