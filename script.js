process.env.CYPRESS_INTERNAL_ENV = 'development'

const ServerBase = require('./packages/server/lib/server-base.js').ServerBase

async function main() {
    const server = new ServerBase()

    const [port, warning] = await server.open({ clientRoute: '/__/' })

    console.log(port)
}

main()