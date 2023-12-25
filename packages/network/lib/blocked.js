"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matches = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const minimatch_1 = tslib_1.__importDefault(require("minimatch"));
const uri_1 = require("./uri");
function matches(urlToCheck, blockHosts) {
    // normalize into flat array
    blockHosts = [].concat(blockHosts);
    urlToCheck = (0, uri_1.stripProtocolAndDefaultPorts)(urlToCheck);
    // use minimatch against the url
    // to see if any match
    const matchUrl = (hostMatcher) => {
        return (0, minimatch_1.default)(urlToCheck, hostMatcher);
    };
    return lodash_1.default.find(blockHosts, matchUrl);
}
exports.matches = matches;
