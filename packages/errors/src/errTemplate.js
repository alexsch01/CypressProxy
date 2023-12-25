"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errTemplate = exports.errPartial = exports.isErrorLike = exports.stackTrace = exports.StackTrace = exports.guard = exports.Guard = exports.fmt = exports.PartialErr = exports.theme = void 0;
const tslib_1 = require("tslib");
const assert_1 = tslib_1.__importDefault(require("assert"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const strip_ansi_1 = tslib_1.__importDefault(require("strip-ansi"));
const errorUtils_1 = require("./errorUtils");
const stripIndent_1 = require("./stripIndent");
exports.theme = {
    blue: chalk_1.default.blueBright,
    gray: chalk_1.default.gray,
    white: chalk_1.default.white,
    yellow: chalk_1.default.yellow,
    magenta: chalk_1.default.magentaBright,
};
class PartialErr {
    constructor(strArr, args) {
        this.strArr = strArr;
        this.args = args;
    }
}
exports.PartialErr = PartialErr;
class Format {
    constructor(type, val, config) {
        this.type = type;
        this.val = val;
        this.config = config;
        this.color = config.color || fmtHighlight[this.type];
    }
    formatVal(target) {
        if (this.val instanceof Guard) {
            return `${this.val.val}`;
        }
        const str = target === 'ansi' ? this.formatAnsi() : this.formatMarkdown();
        // add a newline to ensure this is on its own line
        return isMultiLine(str) ? `\n\n${str}` : str;
    }
    formatAnsi() {
        const val = this.prepVal('ansi');
        if (this.type === 'terminal') {
            return `${exports.theme.gray('$')} ${this.color(val)}`;
        }
        return this.color(val);
    }
    formatMarkdown() {
        if (this.type === 'comment') {
            return `${this.val}`;
        }
        const val = this.prepVal('markdown');
        if (this.type === 'terminal') {
            return `${'```'}\n$ ${val}\n${'```'}`;
        }
        if (this.type === 'code') {
            return `${'```'}\n${val}\n${'```'}`;
        }
        return mdFence(this.prepVal('markdown'));
    }
    prepVal(target) {
        var _a;
        if (this.val instanceof PartialErr) {
            return prepMessage(this.val.strArr, this.val.args, target, true);
        }
        if (isErrorLike(this.val)) {
            return `${this.val.name}: ${this.val.message}`;
        }
        if (this.val && (((_a = this.config) === null || _a === void 0 ? void 0 : _a.stringify) || typeof this.val === 'object' || Array.isArray(this.val))) {
            return JSON.stringify(this.val, null, 2);
        }
        return `${this.val}`;
    }
}
function mdFence(val) {
    // Don't double fence values
    if (val.includes('`')) {
        return val;
    }
    if (isMultiLine(val)) {
        return `\`\`\`\n${val}\n\`\`\``;
    }
    return `\`${val}\``;
}
function isMultiLine(val) {
    return Boolean(val.split('\n').length > 1);
}
function makeFormat(type, config) {
    return (val, overrides) => {
        return new Format(type, val, {
            ...config,
            ...overrides,
        });
    };
}
const fmtHighlight = {
    meta: exports.theme.gray,
    comment: exports.theme.gray,
    path: exports.theme.blue,
    code: exports.theme.blue,
    url: exports.theme.blue,
    flag: exports.theme.magenta,
    stringify: exports.theme.magenta,
    highlight: exports.theme.yellow,
    highlightSecondary: exports.theme.magenta,
    highlightTertiary: exports.theme.blue,
    terminal: exports.theme.blue,
};
exports.fmt = {
    meta: makeFormat('meta'),
    comment: makeFormat('comment'),
    path: makeFormat('path'),
    code: makeFormat('code', { block: true }),
    url: makeFormat('url'),
    flag: makeFormat('flag'),
    stringify: makeFormat('stringify', { stringify: true }),
    highlight: makeFormat('highlight'),
    highlightSecondary: makeFormat('highlightSecondary'),
    highlightTertiary: makeFormat('highlightTertiary'),
    terminal: makeFormat('terminal'),
    off: guard,
    listItem,
    listItems,
    listFlags,
    stackTrace,
    cypressVersion,
};
function cypressVersion(version) {
    const parts = version.split('.');
    if (parts.length !== 3) {
        throw new Error('Cypress version provided must be in x.x.x format');
    }
    return guard(`Cypress version ${version}`);
}
function _item(item, options = {}) {
    const { prefix, color } = lodash_1.default.defaults(options, {
        prefix: '',
        color: 'blue',
    });
    return (0, stripIndent_1.stripIndent) `${exports.theme.gray(prefix)}${exports.theme[color](item)}`;
}
function listItem(item, options = {}) {
    lodash_1.default.defaults(options, {
        prefix: '  > ',
    });
    return guard(_item(item, options));
}
function listItems(items, options = {}) {
    lodash_1.default.defaults(options, {
        prefix: ' - ',
    });
    return guard(items
        .map((item) => _item(item, options))
        .join('\n'));
}
function listFlags(obj, mapper) {
    return guard(lodash_1.default
        .chain(mapper)
        .map((flag, key) => {
        const v = obj[key];
        if (v) {
            return `The ${flag} flag you passed was: ${exports.theme.yellow(v)}`;
        }
        return undefined;
    })
        .compact()
        .join('\n')
        .value());
}
class Guard {
    constructor(val) {
        this.val = val;
    }
}
exports.Guard = Guard;
/**
 * Prevents a string from being colored "blue" when wrapped in the errTemplate
 * tag template literal
 */
function guard(val) {
    return new Guard(val);
}
exports.guard = guard;
/**
 * Marks the value as "details". This is when we print out the stack trace to the console
 * (if it's an error), or use the stack trace as the originalError
 */
class StackTrace {
    /**
     * @param {string | Error | object} stackTrace
     */
    constructor(val) {
        this.val = val;
    }
}
exports.StackTrace = StackTrace;
function stackTrace(val) {
    return new StackTrace(val);
}
exports.stackTrace = stackTrace;
function isErrorLike(err) {
    return err && typeof err === 'object' && Boolean('name' in err && 'message' in err);
}
exports.isErrorLike = isErrorLike;
/**
 * Creates a "partial" that can be interpolated into the full Error template. The partial runs through
 * stripIndent prior to being added into the template
 */
const errPartial = (templateStr, ...args) => {
    return new PartialErr(templateStr, args);
};
exports.errPartial = errPartial;
let originalError = undefined;
let details;
/**
 * Creates a consistently formatted object to return from the error call.
 *
 * For the console:
 *   - By default, wrap every arg in yellow, unless it's "guarded" or is a "details"
 *   - Details stack gets logged at the end of the message in gray | magenta
 *
 * For the browser:
 *   - Wrap every arg in backticks, for better rendering in markdown
 *   - If details is an error, it gets provided as originalError
 */
const errTemplate = (strings, ...args) => {
    const msg = (0, errorUtils_1.trimMultipleNewLines)(prepMessage(strings, args, 'ansi'));
    return {
        message: msg,
        details,
        originalError,
        messageMarkdown: (0, errorUtils_1.trimMultipleNewLines)((0, strip_ansi_1.default)(prepMessage(strings, args, 'markdown'))),
    };
};
exports.errTemplate = errTemplate;
/**
 * Takes an `errTemplate` / `errPartial` and converts it into a string, formatted conditionally
 * depending on the target environment
 *
 * @param templateStrings
 * @param args
 * @param target
 * @returns
 */
function prepMessage(templateStrings, args, target, isPartial = false) {
    // Reset the originalError to undefined on each new template string pass, we only need it to guard
    if (!isPartial) {
        originalError = undefined;
        details = undefined;
    }
    const templateArgs = [];
    for (const arg of args) {
        // We assume null/undefined values are skipped when rendering, for conditional templating
        if (arg == null) {
            templateArgs.push('');
        }
        else if (arg instanceof Guard) {
            // Guard prevents any formatting
            templateArgs.push(`${arg.val}`);
        }
        else if (arg instanceof Format) {
            // Format = stringify & color ANSI, or make a markdown block
            templateArgs.push(arg.formatVal(target));
        }
        else if (arg instanceof StackTrace) {
            (0, assert_1.default)(!originalError, `Cannot use fmt.stackTrace() multiple times in the same errTemplate`);
            (0, assert_1.default)(!isPartial, `Cannot use fmt.stackTrace() in errPartial template string`);
            if (isErrorLike(arg.val)) {
                originalError = arg.val;
                details = originalError.stack;
            }
            else {
                if (process.env.CYPRESS_INTERNAL_ENV !== 'production') {
                    throw new Error(`Cannot use arg.stackTrace with a non error-like value, saw ${JSON.stringify(arg.val)}`);
                }
                const err = new Error();
                err.stack = typeof arg.val === 'string' ? arg.val : JSON.stringify(arg.val);
                originalError = err;
                details = err.stack;
            }
            templateArgs.push('');
        }
        else if (arg instanceof PartialErr) {
            // Partial error = prepMessage + interpolate
            templateArgs.push(prepMessage(arg.strArr, arg.args, target, true));
        }
        else {
            throw new Error(`Invalid value passed to prepMessage, saw ${arg}`);
        }
    }
    return (0, stripIndent_1.stripIndent)(templateStrings, ...templateArgs);
}
