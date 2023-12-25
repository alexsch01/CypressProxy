"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customScalars = void 0;
const graphql_scalars_1 = require("graphql-scalars");
const nexus_1 = require("nexus");
// Apollo VSCode is having trouble with this directive
graphql_scalars_1.JSONResolver.specifiedByUrl = null;
exports.customScalars = [
    (0, nexus_1.asNexusMethod)(graphql_scalars_1.JSONResolver, 'json'),
    (0, nexus_1.asNexusMethod)(graphql_scalars_1.DateTimeResolver, 'dateTime'),
];
