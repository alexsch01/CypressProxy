process.env.CYPRESS_INTERNAL_ENV = 'development'

const ServerBase = require('./packages/server/lib/server-base.js').ServerBase
const SocketBase = require('./packages/server/lib/socket-base.js').SocketBase

async function main() {
    const server = new ServerBase()

    const [port, warning] = await server.open({clientRoute: '/__/'}, {
      getCurrentBrowser: () => null,
      getSpec: () => null,
      exit: false,
      onError: () => {},
      onWarning: () => {},
      shouldCorrelatePreRequests: () => false,
      testingType: 'e2e',
      SocketCtor: SocketBase,
    })

    console.log(port)
}

main()