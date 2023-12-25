"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferencesTypeEnum = void 0;
const nexus_1 = require("nexus");
exports.PreferencesTypeEnum = (0, nexus_1.enumType)({
    name: 'PreferencesTypeEnum',
    members: ['global', 'project'],
});
