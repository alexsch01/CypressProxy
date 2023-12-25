"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserStatusEnum = void 0;
const types_1 = require(process.argv[1]+"/../packages/types");
const nexus_1 = require("nexus");
exports.BrowserStatusEnum = (0, nexus_1.enumType)({
    name: 'BrowserStatus',
    members: types_1.BROWSER_STATUS,
});
