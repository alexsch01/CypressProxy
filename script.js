process.env.CYPRESS_INTERNAL_ENV = 'development'

const ServerBase = require('./packages/server/lib/server-base.js').ServerBase
const SocketE2E = require('./packages/server/lib/socket-e2e.js').SocketE2E

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
      SocketCtor: SocketE2E,
    })

    console.log(port)
}

main()