"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuperDomainOrigin = exports.getOrigin = exports.urlMatchesOriginProtectionSpace = exports.urlMatchesPolicyBasedOnDomainProps = exports.urlMatchesPolicyBasedOnDomain = exports.shouldInjectDocumentDomain = exports.policyForDomain = exports.urlSameSiteMatch = exports.urlOriginsMatch = exports.getDomainNameFromParsedHost = exports.getDomainNameFromUrl = exports.parseUrlIntoHostProtocolDomainTldPort = exports.parseDomain = exports.getSuperDomain = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const minimatch_1 = tslib_1.__importDefault(require("minimatch"));
const uri = tslib_1.__importStar(require("./uri"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const parse_domain_1 = tslib_1.__importDefault(require("@cypress/parse-domain"));
const debug = (0, debug_1.default)('cypress:network:cors');
// match IP addresses or anything following the last .
const customTldsRe = /(^[\d\.]+$|\.[^\.]+$)/;
// TODO: if experimentalSkipDomainInjection plans to go GA, we can likely lump this strictSameOriginDomains
// into that config option by default. @see https://github.com/cypress-io/cypress/issues/25317
const strictSameOriginDomains = Object.freeze(['google.com']);
function getSuperDomain(url) {
    const parsed = parseUrlIntoHostProtocolDomainTldPort(url);
    return lodash_1.default.compact([parsed.domain, parsed.tld]).join('.');
}
exports.getSuperDomain = getSuperDomain;
function parseDomain(domain, options = {}) {
    return (0, parse_domain_1.default)(domain, lodash_1.default.defaults(options, {
        privateTlds: true,
        customTlds: customTldsRe,
    }));
}
exports.parseDomain = parseDomain;
function parseUrlIntoHostProtocolDomainTldPort(str) {
    let { hostname, port, protocol } = uri.parse(str);
    if (!hostname) {
        hostname = '';
    }
    if (!port) {
        port = protocol === 'https:' ? '443' : '80';
    }
    let parsed = parseDomain(hostname);
    // if we couldn't get a parsed domain
    if (!parsed) {
        // then just fall back to a dumb check
        // based on assumptions that the tld
        // is the last segment after the final
        // '.' and that the domain is the segment
        // before that
        const segments = hostname.split('.');
        parsed = {
            subdomain: segments[segments.length - 3] || '',
            tld: segments[segments.length - 1] || '',
            domain: segments[segments.length - 2] || '',
        };
    }
    const obj = {
        port,
        protocol,
        subdomain: parsed.subdomain || null,
        domain: parsed.domain,
        tld: parsed.tld,
    };
    debug('Parsed URL %o', obj);
    return obj;
}
exports.parseUrlIntoHostProtocolDomainTldPort = parseUrlIntoHostProtocolDomainTldPort;
function getDomainNameFromUrl(url) {
    const parsedHost = parseUrlIntoHostProtocolDomainTldPort(url);
    return getDomainNameFromParsedHost(parsedHost);
}
exports.getDomainNameFromUrl = getDomainNameFromUrl;
function getDomainNameFromParsedHost(parsedHost) {
    return lodash_1.default.compact([parsedHost.domain, parsedHost.tld]).join('.');
}
exports.getDomainNameFromParsedHost = getDomainNameFromParsedHost;
/**
 * same-origin: Whether or not a a urls scheme, port, and host match. @see https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy
 * same-super-domain-origin: Whether or not a url's scheme, domain, top-level domain, and port match
 * same-site: Whether or not a url's scheme, domain, and top-level domain match. @see https://developer.mozilla.org/en-US/docs/Glossary/Site
 * @param {Policy} policy - the policy being used
 * @param {string} frameUrl - the url being compared
 * @param {ParsedHostWithProtocolAndHost} topProps - the props being compared against the url
 * @returns {boolean} whether or not the props and url fit the policy
 */
function urlMatchesPolicyProps({ policy, frameUrl, topProps }) {
    if (!policy || !frameUrl || !topProps) {
        return false;
    }
    const urlProps = parseUrlIntoHostProtocolDomainTldPort(frameUrl);
    switch (policy) {
        case 'same-origin': {
            // if same origin, all parts of the props needs to match, including subdomain and scheme
            return lodash_1.default.isEqual(urlProps, topProps);
        }
        case 'same-super-domain-origin':
        case 'schemeful-same-site': {
            const { port: port1, subdomain: _unused1, ...parsedUrl } = urlProps;
            const { port: port2, subdomain: _unused2, ...relevantProps } = topProps;
            let doPortsPassSameSchemeCheck;
            if (policy === 'same-super-domain-origin') {
                // if a super domain origin comparison, the ports MUST be strictly equal
                doPortsPassSameSchemeCheck = port1 === port2;
            }
            else {
                // otherwise, this is a same-site comparison
                // If HTTPS, ports NEED to match. Otherwise, HTTP ports can be different and are same origin
                doPortsPassSameSchemeCheck = port1 !== port2 ? (port1 !== '443' && port2 !== '443') : true;
            }
            return doPortsPassSameSchemeCheck && lodash_1.default.isEqual(parsedUrl, relevantProps);
        }
        default:
            return false;
    }
}
function urlMatchesPolicy({ policy, frameUrl, topUrl }) {
    if (!policy || !frameUrl || !topUrl) {
        return false;
    }
    return urlMatchesPolicyProps({
        policy,
        frameUrl,
        topProps: parseUrlIntoHostProtocolDomainTldPort(topUrl),
    });
}
function urlOriginsMatch(frameUrl, topUrl) {
    return urlMatchesPolicy({
        policy: 'same-origin',
        frameUrl,
        topUrl,
    });
}
exports.urlOriginsMatch = urlOriginsMatch;
const urlSameSiteMatch = (frameUrl, topUrl) => {
    return urlMatchesPolicy({
        policy: 'schemeful-same-site',
        frameUrl,
        topUrl,
    });
};
exports.urlSameSiteMatch = urlSameSiteMatch;
/**
 * @param url - the url to check the policy against.
 * @param arrayOfStringOrGlobPatterns - an array of url strings or globs to match against
 * @returns {boolean} - whether or not a match was found
 */
const doesUrlHostnameMatchGlobArray = (url, arrayOfStringOrGlobPatterns) => {
    let { hostname } = uri.parse(url);
    return !!arrayOfStringOrGlobPatterns.find((globPattern) => {
        return (0, minimatch_1.default)(hostname || '', globPattern);
    });
};
/**
 * Returns the policy that will be used for the specified url.
 * @param url - the url to check the policy against.
 * @param opts - an options object containing the skipDomainInjectionForDomains config. Default is undefined.
 * @returns a Policy string.
 */
const policyForDomain = (url, opts) => {
    const obj = parseUrlIntoHostProtocolDomainTldPort(url);
    let shouldUseSameOriginPolicy = strictSameOriginDomains.includes(`${obj.domain}.${obj.tld}`);
    if (!shouldUseSameOriginPolicy && lodash_1.default.isArray(opts === null || opts === void 0 ? void 0 : opts.skipDomainInjectionForDomains)) {
        // if the strict same origins matches came up false, we should check the user provided config value for skipDomainInjectionForDomains, if one exists
        shouldUseSameOriginPolicy = doesUrlHostnameMatchGlobArray(url, opts === null || opts === void 0 ? void 0 : opts.skipDomainInjectionForDomains);
    }
    return shouldUseSameOriginPolicy ?
        'same-origin' :
        'same-super-domain-origin';
};
exports.policyForDomain = policyForDomain;
/**
 * @param url - The url to check for injection
 * @param opts - an options object containing the skipDomainInjectionForDomains config. Default is undefined.
 * @returns {boolean} whether or not document.domain should be injected solely based on the url.
 */
const shouldInjectDocumentDomain = (url, opts) => {
    // When determining if we want to injection document domain,
    // We need to make sure the experimentalSkipDomainInjection feature flag is off.
    // If on, we need to make sure the glob pattern doesn't exist in the array so we cover possible intersections (google).
    if (lodash_1.default.isArray(opts === null || opts === void 0 ? void 0 : opts.skipDomainInjectionForDomains)) {
        // if we match the glob, we want to return false
        return !doesUrlHostnameMatchGlobArray(url, opts === null || opts === void 0 ? void 0 : opts.skipDomainInjectionForDomains);
    }
    return true;
};
exports.shouldInjectDocumentDomain = shouldInjectDocumentDomain;
/**
 * Checks the supplied url's against the determined policy.
 * The policy is same-super-domain-origin unless the domain is in the list of strict same origin domains,
 * in which case the policy is 'same-origin'
 * @param frameUrl - The url you are testing the policy for.
 * @param topUrl - The url you are testing the policy in context of.
 * @param opts - an options object containing the skipDomainInjectionForDomains config. Default is undefined.
 * @returns boolean, true if matching, false if not.
 */
const urlMatchesPolicyBasedOnDomain = (frameUrl, topUrl, opts) => {
    return urlMatchesPolicy({
        policy: (0, exports.policyForDomain)(frameUrl, opts),
        frameUrl,
        topUrl,
    });
};
exports.urlMatchesPolicyBasedOnDomain = urlMatchesPolicyBasedOnDomain;
/**
 * Checks the supplied url and props against the determined policy.
 * The policy is same-super-domain-origin unless the domain is in the list of strict same origin domains,
 * in which case the policy is 'same-origin'
 * @param frameUrl - The url you are testing the policy for.
 * @param topProps - The props of the url you are testing the policy in context of.
 * @param opts - an options object containing the skipDomainInjectionForDomains config. Default is undefined.
 * @returns boolean, true if matching, false if not.
 */
const urlMatchesPolicyBasedOnDomainProps = (frameUrl, topProps, opts) => {
    const policy = (0, exports.policyForDomain)(frameUrl, opts);
    return urlMatchesPolicyProps({
        policy,
        frameUrl,
        topProps,
    });
};
exports.urlMatchesPolicyBasedOnDomainProps = urlMatchesPolicyBasedOnDomainProps;
function urlMatchesOriginProtectionSpace(urlStr, origin) {
    const normalizedUrl = uri.addDefaultPort(urlStr).format();
    const normalizedOrigin = uri.addDefaultPort(origin).format();
    return lodash_1.default.startsWith(normalizedUrl, normalizedOrigin);
}
exports.urlMatchesOriginProtectionSpace = urlMatchesOriginProtectionSpace;
function getOrigin(url) {
    // @ts-ignore
    const { origin } = new URL(url);
    // origin is comprised of:
    // protocol + subdomain + superdomain + port
    return origin;
}
exports.getOrigin = getOrigin;
/**
 * Returns the super-domain of a URL
 *
 * The primary driver uses the super-domain origin to allow tests to
 * navigate between subdomains of the same super-domain by setting
 * document.domain to the super-domain
 * @param url - the full absolute url
 * @returns the super domain origin
 * ex: http://www.example.com:8081/my/path -> http://example.com:8081
 */
function getSuperDomainOrigin(url) {
    // @ts-ignore
    const { port, protocol } = new URL(url);
    // super domain origin is comprised of:
    // protocol + superdomain + port (subdomain is not factored in)
    return lodash_1.default.compact([`${protocol}//${getSuperDomain(url)}`, port]).join(':');
}
exports.getSuperDomainOrigin = getSuperDomainOrigin;
