"use strict";
const server_base_1 = require("../server-base");
const socket_e2e_1 = require("../socket-e2e");
module.exports = (mode, options) => {
    const temp = async () => {
        const server = new server_base_1.ServerBase();
        const [port, warning] = await server.open({}, {
            getCurrentBrowser: () => null,
            getSpec: () => null,
            exit: false,
            onError: () => { },
            onWarning: () => { },
            shouldCorrelatePreRequests: () => false,
            testingType: 'e2e',
            SocketCtor: socket_e2e_1.SocketE2E,
        });
        console.log(port);
        await new Promise(() => { });
    };
    temp();
};
