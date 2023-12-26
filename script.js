const ServerBase = require('./packages/server/lib/server-base.js').ServerBase

async function main() {
    const server = new ServerBase()

    const port = await server.createServer()

    console.log(port)
}

main()