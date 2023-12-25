"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCspDirectives = exports.parseCspHeaders = exports.unsupportedCSPDirectives = exports.problematicCspDirectives = exports.nonceDirectives = exports.cspHeaderNames = void 0;
const cspRegExp = /[; ]*([^\n\r; ]+) ?([^\n\r;]+)*/g;
exports.cspHeaderNames = ['content-security-policy', 'content-security-policy-report-only'];
exports.nonceDirectives = ['script-src-elem', 'script-src', 'default-src'];
exports.problematicCspDirectives = [
    ...exports.nonceDirectives,
    'child-src', 'frame-src', 'form-action',
];
exports.unsupportedCSPDirectives = [
    /**
     * In order for Cypress to run content in an iframe, we must remove the `frame-ancestors` directive
     * from the CSP header. This is because this directive behaves like the `X-Frame-Options='deny'` header
     * and prevents the iframe content from being loaded if it detects that it is not being loaded in the
     * top-level frame.
     */
    'frame-ancestors',
    /**
     * The `navigate-to` directive is not yet fully supported, so we are erring on the side of caution
     */
    'navigate-to',
    /**
     * The `sandbox` directive seems to affect all iframes on the page, even if the page is a direct child of Cypress
     */
    'sandbox',
    /**
     * Since Cypress might modify the DOM of the application under test, `trusted-types` would prevent the
     * DOM injection from occurring.
     */
    'trusted-types',
    'require-trusted-types-for',
];
const caseInsensitiveGetAllHeaders = (headers, lowercaseProperty) => {
    return Object.entries(headers).reduce((acc, [key, value]) => {
        if (key.toLowerCase() === lowercaseProperty) {
            // It's possible to set more than 1 CSP header, and in those instances CSP headers
            // are NOT merged by the browser. Instead, the most **restrictive** CSP header
            // that applies to the given resource will be used.
            // https://www.w3.org/TR/CSP2/#content-security-policy-header-field
            //
            // Therefore, we need to return each header as it's own value so we can apply
            // injection nonce values to each one, because we don't know which will be
            // the most restrictive.
            acc.push.apply(acc, `${value}`.split(',')
                .filter(Boolean)
                .map((policyString) => `${policyString}`.trim()));
        }
        return acc;
    }, []);
};
function getCspHeaders(headers, headerName = 'content-security-policy') {
    return caseInsensitiveGetAllHeaders(headers, headerName.toLowerCase());
}
/**
 * Parses the provided headers object and returns an array of policy Map objects.
 * This will parse all CSP headers that match the provided `headerName` parameter,
 * even if they are not lower case.
 * @param headers - The headers object to parse
 * @param headerName - The name of the header to parse. Defaults to `content-security-policy`
 * @param excludeDirectives - An array of directives to exclude from the returned policy maps
 * @returns An array of policy Map objects
 *
 * @example
 * const policyMaps = parseCspHeaders({
 *    'Content-Security-Policy': 'default-src self; script-src self https://www.google-analytics.com',
 *    'content-security-policy': 'default-src self; script-src https://www.mydomain.com',
 * })
 * // policyMaps = [
 * //  Map {
 * //    'default-src' => [ 'self' ],
 * //    'script-src' => [ 'self', 'https://www.google-analytics.com' ]
 * //  },
 * //  Map {
 * //    'default-src' => [ 'self' ],
 * //    'script-src' => [ 'https://www.mydomain.com' ]
 * //  }
 * // ]
 */
function parseCspHeaders(headers, headerName = 'content-security-policy', excludeDirectives = []) {
    const cspHeaders = getCspHeaders(headers, headerName);
    // We must make an policy map for each CSP header individually
    return cspHeaders.reduce((acc, cspHeader) => {
        const policies = new Map();
        let policy = cspRegExp.exec(cspHeader);
        while (policy) {
            const [/* regExpMatch */ , directive, values = ''] = policy;
            if (!excludeDirectives.includes(directive)) {
                const currentDirective = policies.get(directive) || [];
                policies.set(directive, [...currentDirective, ...values.split(' ').filter(Boolean)]);
            }
            policy = cspRegExp.exec(cspHeader);
        }
        return [...acc, policies];
    }, []);
}
exports.parseCspHeaders = parseCspHeaders;
/**
 * Generates a CSP header string from the provided policy map.
 * @param policies - The policy map to generate the CSP header string from
 * @returns A CSP header policy string
 * @example
 * const policyString = generateCspHeader(new Map([
 *    ['default-src', ['self']],
 *    ['script-src', ['self', 'https://www.google-analytics.com']],
 * ]))
 * // policyString = 'default-src self; script-src self https://www.google-analytics.com'
 */
function generateCspDirectives(policies) {
    return Array.from(policies.entries()).map(([directive, values]) => `${directive} ${values.join(' ')}`).join('; ');
}
exports.generateCspDirectives = generateCspDirectives;
