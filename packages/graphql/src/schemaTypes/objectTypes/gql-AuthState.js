"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthState = exports.AuthStateNameEnum = void 0;
const nexus_1 = require("nexus");
const types_1 = require(process.argv[1]+"/../packages/types");
exports.AuthStateNameEnum = (0, nexus_1.enumType)({
    name: 'AuthStateNameEnum',
    members: types_1.authStateName,
});
exports.AuthState = (0, nexus_1.objectType)({
    name: 'AuthState',
    description: 'Represents state of auth based on most recent message from login flow',
    definition(t) {
        t.field('name', {
            type: exports.AuthStateNameEnum,
            description: 'Name of auth state, e.g. AUTH_BROWSER_LAUNCHED',
        });
        t.string('message', {
            description: 'Message for the auth state',
        });
        t.nonNull.boolean('browserOpened', {
            description: 'Whether the browser was successfully opened for login',
        });
    },
});
