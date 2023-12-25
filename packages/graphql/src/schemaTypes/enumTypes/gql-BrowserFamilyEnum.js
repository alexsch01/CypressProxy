"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserFamilyEnum = void 0;
const types_1 = require(process.argv[1]+"/../packages/types");
const nexus_1 = require("nexus");
exports.BrowserFamilyEnum = (0, nexus_1.enumType)({
    name: 'BrowserFamily',
    members: types_1.BROWSER_FAMILY,
});
