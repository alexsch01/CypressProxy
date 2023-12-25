"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRING_MATCHER_FIELDS = exports.DICT_STRING_MATCHER_FIELDS = exports.PLAIN_FIELDS = exports.SERIALIZABLE_RES_PROPS = exports.SERIALIZABLE_REQ_PROPS = void 0;
const tslib_1 = require("tslib");
const _ = tslib_1.__importStar(require("lodash"));
exports.SERIALIZABLE_REQ_PROPS = [
    'headers',
    'body',
    'url',
    'method',
    'httpVersion',
    'responseTimeout',
    'followRedirect',
    'resourceType',
    'query',
];
exports.SERIALIZABLE_RES_PROPS = _.concat(exports.SERIALIZABLE_REQ_PROPS, 'statusCode', 'statusMessage', 'delay', 'throttleKbps');
/**
 * RouteMatcher fields which are sent as-is (booleans, numbers...)
 */
exports.PLAIN_FIELDS = ['https', 'port', 'middleware', 'times'];
/**
 * RouteMatcher fields that represent a dict of StringMatchers
 */
exports.DICT_STRING_MATCHER_FIELDS = ['headers', 'query'];
/**
 * RouteMatcher fields that represent StringMatchers
 */
exports.STRING_MATCHER_FIELDS = ['auth.username', 'auth.password', 'hostname', 'method', 'path', 'pathname', 'url', 'resourceType'];
