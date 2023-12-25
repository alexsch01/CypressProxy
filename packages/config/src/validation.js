"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNullOrArrayOfStrings = exports.isStringOrArrayOfStrings = exports.isFullyQualifiedUrl = exports.isStringOrFalse = exports.isValidCrfOrBoolean = exports.isNumberOrFalse = exports.isArray = exports.isString = exports.isNumber = exports.isBoolean = exports.isPlainObject = exports.isValidClientCertificatesSet = exports.isArrayIncludingAny = exports.isOneOf = exports.isValidRetriesConfig = exports.isValidBrowserList = exports.isValidBrowser = exports.validateAny = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const _ = tslib_1.__importStar(require("lodash"));
const is = tslib_1.__importStar(require("check-more-types"));
const common_tags_1 = require("common-tags");
const debug_1 = tslib_1.__importDefault(require("debug"));
const types_1 = require(process.argv[1]+"/../packages/types");
const debug = (0, debug_1.default)('cypress:server:validation');
// validation functions take a key and a value and should:
//  - return true if it passes validation
//  - return a error message if it fails validation
const str = JSON.stringify;
const errMsg = (key, value, type) => {
    return {
        key,
        value,
        type,
    };
};
const _isFullyQualifiedUrl = (value) => {
    return _.isString(value) && /^https?\:\/\//.test(value);
};
const isStringArray = (value) => {
    return _.isArray(value) && _.every(value, _.isString);
};
const isFalse = (value) => {
    return value === false;
};
const validateAny = (...validations) => {
    return (key, value) => {
        return validations.reduce((result, validation) => {
            if (result === true) {
                return result;
            }
            return validation(key, value);
        }, false);
    };
};
exports.validateAny = validateAny;
/**
 * Validates a single browser object.
 * @returns {string|true} Returns `true` if the object is matching browser object schema. Returns an error message if it does not.
 */
const isValidBrowser = (browser) => {
    if (!is.unemptyString(browser.name)) {
        return errMsg('name', browser, 'a non-empty string');
    }
    if (!is.oneOf(types_1.BROWSER_FAMILY)(browser.family)) {
        return errMsg('family', browser, (0, common_tags_1.commaListsOr) `either ${types_1.BROWSER_FAMILY}`);
    }
    if (!is.unemptyString(browser.displayName)) {
        return errMsg('displayName', browser, 'a non-empty string');
    }
    if (!is.unemptyString(browser.version)) {
        return errMsg('version', browser, 'a non-empty string');
    }
    if (typeof browser.path !== 'string') {
        return errMsg('path', browser, 'a string');
    }
    if (typeof browser.majorVersion !== 'string' && !(is.number(browser.majorVersion) && browser.majorVersion > 0)) {
        return errMsg('majorVersion', browser, 'a string or a positive number');
    }
    return true;
};
exports.isValidBrowser = isValidBrowser;
/**
 * Validates the list of browsers.
 */
const isValidBrowserList = (_key, browsers) => {
    debug('browsers %o', browsers);
    if (!browsers) {
        return 'Missing browsers list';
    }
    if (!Array.isArray(browsers)) {
        debug('browsers is not an array', typeof browsers);
        return 'Browsers should be an array';
    }
    if (!browsers.length) {
        return 'Expected at least one browser';
    }
    for (let k = 0; k < browsers.length; k += 1) {
        const validationResult = (0, exports.isValidBrowser)(browsers[k]);
        if (validationResult !== true) {
            validationResult.list = 'browsers';
            return validationResult;
        }
    }
    return true;
};
exports.isValidBrowserList = isValidBrowserList;
const isValidExperimentalRetryOptionsConfig = (key, value, strategy) => {
    if (value == null)
        return true;
    const isValidMaxRetries = isValidRetryValue(`${key}.maxRetries`, value.maxRetries, 1);
    if (isValidMaxRetries !== true) {
        return isValidMaxRetries;
    }
    const validKeys = ['maxRetries'];
    // if the strategy is 'detect-flake-but-always-fail' and the stopIfAnyPassed is required and must be a boolean
    if (strategy === 'detect-flake-but-always-fail') {
        validKeys.push('stopIfAnyPassed');
        if (_.isNull(value.stopIfAnyPassed) || value.stopIfAnyPassed === undefined) {
            return errMsg(`${key}.stopIfAnyPassed`, value.stopIfAnyPassed, 'is required when using the "detect-flake-but-always-fail" strategy');
        }
        const isValidStopIfAnyPasses = _.isBoolean(value.stopIfAnyPassed);
        if (!isValidStopIfAnyPasses) {
            return errMsg(`${key}.stopIfAnyPassed`, value.stopIfAnyPassed, 'a boolean');
        }
    }
    // if the strategy is 'detect-flake-and-pass-on-threshold' then passesRequired is required and must be a valid retry value and less than or equal to maxRetries
    if (strategy === 'detect-flake-and-pass-on-threshold') {
        validKeys.push('passesRequired');
        if (_.isNull(value.passesRequired) || value.passesRequired === undefined) {
            return errMsg(`${key}.passesRequired`, value.stopIfAnyPassed, 'is required when using the "detect-flake-and-pass-on-threshold" strategy');
        }
        const isValidPassesRequired = Number.isInteger(value.passesRequired) && value.passesRequired >= 1 && value.passesRequired <= value.maxRetries;
        if (!isValidPassesRequired) {
            return errMsg(`${key}.passesRequired`, value.passesRequired, 'a positive whole number less than or equals to maxRetries');
        }
    }
    const extraneousKeys = _.difference(Object.keys(value), validKeys);
    if (extraneousKeys.length > 0) {
        return errMsg(key, value, `an object with keys ${validKeys.join(', ')}`);
    }
    return true;
};
const isValidRetryValue = (key, value, minimumValue) => {
    if (_.isNull(value))
        return true;
    if (Number.isInteger(value) && value >= minimumValue)
        return true;
    return errMsg(key, value, `a positive whole number greater than or equals ${minimumValue} or null`);
};
const isValidRetriesConfig = (key, value) => {
    const optionalKeys = ['runMode', 'openMode'];
    const experimentalOptions = ['experimentalStrategy', 'experimentalOptions'];
    const experimentalStrategyOptions = ['detect-flake-but-always-fail', 'detect-flake-and-pass-on-threshold'];
    const optionalKeysAreValid = (key) => {
        return (parentVal, optionName) => {
            if (!optionalKeys.includes(optionName)) {
                return errMsg(key, parentVal, 'an object with keys "openMode" and "runMode" with values of numbers, booleans, or nulls');
            }
            const optionValue = _.get(parentVal, optionName);
            if (_.isBoolean(optionValue))
                return true;
            return isValidRetryValue(`${key}.${optionName}`, _.get(parentVal, optionName), 0);
        };
    };
    if (_.isObject(value)) {
        const traditionalConfigOptions = _.omit(value, experimentalOptions);
        const experimentalConfigOptions = _.pick(value, experimentalOptions);
        const openAndRunModeConfigOptions = _.pick(value, optionalKeys);
        for (const optionKey in traditionalConfigOptions) {
            if (Object.prototype.hasOwnProperty.call(traditionalConfigOptions, optionKey)) {
                const optionValidation = optionalKeysAreValid(key)(value, optionKey);
                if (optionValidation !== true || _.isObject(optionValidation)) {
                    return optionValidation;
                }
            }
        }
        // check experimental configuration. experimentalStrategy MUST be present if experimental config is provided and set to one of the provided enumerations
        if (experimentalConfigOptions.experimentalStrategy) {
            // make sure the strategy provided is one of our valid enums
            const isValidStrategy = experimentalStrategyOptions.includes(experimentalConfigOptions.experimentalStrategy);
            if (!isValidStrategy) {
                return errMsg(`${key}.experimentalStrategy`, experimentalConfigOptions.experimentalStrategy, `one of ${experimentalStrategyOptions.map((s) => `"${s}"`).join(', ')}`);
            }
            // if a strategy is provided, and traditional options are also provided, such as runMode and openMode, then these values need to be booleans
            for (const optionalKey in openAndRunModeConfigOptions) {
                if (Object.prototype.hasOwnProperty.call(openAndRunModeConfigOptions, optionalKey)) {
                    const optionalConfigVal = _.get(openAndRunModeConfigOptions, optionalKey);
                    if (!_.isBoolean(optionalConfigVal)) {
                        return errMsg(`${key}.${optionalKey}`, optionalConfigVal, 'a boolean since an experimental strategy is provided');
                    }
                }
            }
            // if options aren't present (either undefined or null) or are configured correctly, return true
            if (experimentalConfigOptions.experimentalOptions == null) {
                return true;
            }
            const isValidExperimentalRetryOptions = isValidExperimentalRetryOptionsConfig(`${key}.experimentalOptions`, experimentalConfigOptions.experimentalOptions, experimentalConfigOptions.experimentalStrategy);
            if (isValidExperimentalRetryOptions !== true) {
                return isValidExperimentalRetryOptions;
            }
        }
        else {
            for (const optionalKey in openAndRunModeConfigOptions) {
                if (Object.prototype.hasOwnProperty.call(openAndRunModeConfigOptions, optionalKey)) {
                    const optionalConfigVal = _.get(openAndRunModeConfigOptions, optionalKey);
                    if (!_.isNumber(optionalConfigVal)) {
                        return errMsg(`${key}.${optionalKey}`, optionalConfigVal, 'a number since no experimental strategy is provided');
                    }
                }
            }
            if (experimentalConfigOptions.experimentalOptions) {
                return errMsg(`${key}.experimentalOptions`, experimentalConfigOptions.experimentalOptions, 'provided only if an experimental strategy is provided');
            }
        }
    }
    else {
        const isValidValue = isValidRetryValue(key, value, 0);
        if (isValidValue !== true) {
            return errMsg(key, value, 'a positive number or null or an object with keys "openMode" and "runMode" with values of numbers, booleans, or nulls, or experimental configuration with key "experimentalStrategy" with value "detect-flake-but-always-fail" or "detect-flake-and-pass-on-threshold" and key "experimentalOptions" to provide a valid configuration for your selected strategy');
        }
    }
    return true;
};
exports.isValidRetriesConfig = isValidRetriesConfig;
/**
 * Checks if given value for a key is equal to one of the provided values.
 * @example
  ```
  validate = v.isOneOf("foo", "bar")
  validate("example", "foo") // true
  validate("example", "else") // error message string
  ```
  */
const isOneOf = (...values) => {
    return (key, value) => {
        if (values.some((v) => {
            if (typeof value === 'function') {
                return value(v);
            }
            return v === value;
        })) {
            return true;
        }
        const strings = values.map((a) => str(a)).join(', ');
        return errMsg(key, value, `one of these values: ${strings}`);
    };
};
exports.isOneOf = isOneOf;
/**
 * Checks if given array value for a key includes only members of the provided values.
 * @example
  ```
  validate = v.isArrayIncludingAny("foo", "bar", "baz")
  validate("example", ["foo"]) // true
  validate("example", ["bar", "baz"]) // true
  validate("example", ["foo", "else"]) // error message string
  validate("example", ["foo", "bar", "baz", "else"]) // error message string
  ```
  */
const isArrayIncludingAny = (...values) => {
    const validValues = values.map((a) => str(a)).join(', ');
    return (key, value) => {
        if (!Array.isArray(value) || !value.every((v) => values.includes(v))) {
            return errMsg(key, value, `an array including any of these values: [${validValues}]`);
        }
        return true;
    };
};
exports.isArrayIncludingAny = isArrayIncludingAny;
/**
 * Validates whether the supplied set of cert information is valid
 * @returns {string|true} Returns `true` if the information set is valid. Returns an error message if it is not.
 */
// _key: string, certsForUrls: any[]): ErrResult | true {}
const isValidClientCertificatesSet = (_key, certsForUrls) => {
    debug('clientCerts: %o', certsForUrls);
    if (!Array.isArray(certsForUrls)) {
        return errMsg(`clientCertificates.certs`, certsForUrls, 'an array of certs for URLs');
    }
    let urls = [];
    for (let i = 0; i < certsForUrls.length; i++) {
        debug(`Processing clientCertificates: ${i}`);
        let certsForUrl = certsForUrls[i];
        if (!certsForUrl) {
            continue;
        }
        if (!certsForUrl.url) {
            return errMsg(`clientCertificates[${i}].url`, certsForUrl.url, 'a URL matcher');
        }
        if (certsForUrl.url !== '*') {
            try {
                let parsed = new URL(certsForUrl.url);
                if (parsed.protocol !== 'https:') {
                    return errMsg(`clientCertificates[${i}].url`, certsForUrl.url, 'an https protocol');
                }
            }
            catch (e) {
                return errMsg(`clientCertificates[${i}].url`, certsForUrl.url, 'a valid URL');
            }
        }
        if (urls.includes(certsForUrl.url)) {
            return `clientCertificates has duplicate client certificate URL: ${certsForUrl.url}`;
        }
        urls.push(certsForUrl.url);
        if (certsForUrl.ca && !Array.isArray(certsForUrl.ca)) {
            return errMsg(`clientCertificates[${i}].ca`, certsForUrl.ca, 'an array of CA filepaths');
        }
        if (!Array.isArray(certsForUrl.certs)) {
            return errMsg(`clientCertificates[${i}].certs`, certsForUrl.certs, 'an array of certs');
        }
        for (let j = 0; j < certsForUrl.certs.length; j++) {
            let certInfo = certsForUrl.certs[j];
            // Only one of PEM or PFX cert allowed
            if (certInfo.cert && certInfo.pfx) {
                return `\`clientCertificates[${i}].certs[${j}]\` has both PEM and PFX defined`;
            }
            if (!certInfo.cert && !certInfo.pfx) {
                return `\`clientCertificates[${i}].certs[${j}]\` must have either PEM or PFX defined`;
            }
            if (certInfo.pfx) {
                if (path_1.default.isAbsolute(certInfo.pfx)) {
                    return errMsg(`clientCertificates[${i}].certs[${j}].pfx`, certInfo.pfx, 'a relative filepath');
                }
            }
            if (certInfo.cert) {
                if (path_1.default.isAbsolute(certInfo.cert)) {
                    return errMsg(`clientCertificates[${i}].certs[${j}].cert`, certInfo.cert, 'a relative filepath');
                }
                if (!certInfo.key) {
                    return errMsg(`clientCertificates[${i}].certs[${j}].key`, certInfo.key, 'a key filepath');
                }
                if (path_1.default.isAbsolute(certInfo.key)) {
                    return errMsg(`clientCertificates[${i}].certs[${j}].key`, certInfo.key, 'a relative filepath');
                }
            }
        }
        if (certsForUrl.ca) {
            for (let k = 0; k < certsForUrl.ca.length; k++) {
                if (path_1.default.isAbsolute(certsForUrl.ca[k] || '')) {
                    return errMsg(`clientCertificates[${k}].ca[${k}]`, certsForUrl.ca[k], 'a relative filepath');
                }
            }
        }
    }
    return true;
};
exports.isValidClientCertificatesSet = isValidClientCertificatesSet;
const isPlainObject = (key, value) => {
    if (value == null || _.isPlainObject(value)) {
        return true;
    }
    return errMsg(key, value, 'a plain object');
};
exports.isPlainObject = isPlainObject;
function isBoolean(key, value) {
    if (value == null || _.isBoolean(value)) {
        return true;
    }
    return errMsg(key, value, 'a boolean');
}
exports.isBoolean = isBoolean;
function isNumber(key, value) {
    if (value == null || _.isNumber(value)) {
        return true;
    }
    return errMsg(key, value, 'a number');
}
exports.isNumber = isNumber;
function isString(key, value) {
    if (value == null || _.isString(value)) {
        return true;
    }
    return errMsg(key, value, 'a string');
}
exports.isString = isString;
function isArray(key, value) {
    if (value == null || _.isArray(value)) {
        return true;
    }
    return errMsg(key, value, 'an array');
}
exports.isArray = isArray;
function isNumberOrFalse(key, value) {
    if (_.isNumber(value) || isFalse(value)) {
        return true;
    }
    return errMsg(key, value, 'a number or false');
}
exports.isNumberOrFalse = isNumberOrFalse;
function isValidCrfOrBoolean(key, value) {
    // a valid number that is between 1-51 including 1 or 51
    // or a boolean. false or 0 disables compression and true sets compression to 32 CRF by default.
    if (_.isBoolean(value) || (_.isNumber(value) && _.inRange(value, 0, 52))) {
        return true;
    }
    return errMsg(key, value, 'a valid CRF number between 1 & 51, 0 or false to disable compression, or true to use the default compression of 32');
}
exports.isValidCrfOrBoolean = isValidCrfOrBoolean;
function isStringOrFalse(key, value) {
    if (_.isString(value) || isFalse(value)) {
        return true;
    }
    return errMsg(key, value, 'a string or false');
}
exports.isStringOrFalse = isStringOrFalse;
function isFullyQualifiedUrl(key, value) {
    if (value == null || _isFullyQualifiedUrl(value)) {
        return true;
    }
    return errMsg(key, value, 'a fully qualified URL (starting with `http://` or `https://`)');
}
exports.isFullyQualifiedUrl = isFullyQualifiedUrl;
function isStringOrArrayOfStrings(key, value) {
    if (_.isString(value) || isStringArray(value)) {
        return true;
    }
    return errMsg(key, value, 'a string or an array of strings');
}
exports.isStringOrArrayOfStrings = isStringOrArrayOfStrings;
function isNullOrArrayOfStrings(key, value) {
    if (_.isNull(value) || isStringArray(value)) {
        return true;
    }
    return errMsg(key, value, 'an array of strings or null');
}
exports.isNullOrArrayOfStrings = isNullOrArrayOfStrings;
