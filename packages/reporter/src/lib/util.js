"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onEnterOrSpace = exports.indent = exports.getFilenameParts = exports.formatDuration = void 0;
const INDENT_BASE = 5;
const INDENT_AMOUNT = 15;
function indent(level) {
    return INDENT_BASE + level * INDENT_AMOUNT;
}
exports.indent = indent;
// Returns a keyboard handler that invokes the provided function when either enter or space is pressed
const onEnterOrSpace = (f) => {
    return (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
            f();
        }
    };
};
exports.onEnterOrSpace = onEnterOrSpace;
const formatDuration = (duration) => {
    if (!duration)
        return '--';
    if (duration < 1000) {
        return `${duration}ms`;
    }
    const seconds = Math.round(duration / 1000);
    const displaySeconds = String(seconds % 60).padStart(2, '0');
    const displayMinutes = String(Math.floor((seconds / 60) % 60)).padStart(2, '0');
    const displayHours = String(Math.floor(seconds / (60 * 60)));
    if (displayHours === '0')
        return `${displayMinutes}:${displaySeconds}`;
    return `${displayHours}:${displayMinutes}:${displaySeconds}`;
};
exports.formatDuration = formatDuration;
const splitFilename = (filename, index) => {
    if (index < 0) {
        return [filename, ''];
    }
    return [filename.substr(0, index), filename.substr(index)];
};
// strips directory path and then
// '.cy', '.spec', and '.test' as well as the last file extension should be split off from the main part of the filename
const getFilenameParts = (spec) => {
    var _a;
    if (!spec) {
        return ['', ''];
    }
    // remove directory path
    const specWithoutPath = spec.substr(spec.lastIndexOf('/') + 1);
    if (!specWithoutPath) {
        return [spec, ''];
    }
    // if it contains .cy, .spec, or .test, split it before that
    const specIndex = (_a = specWithoutPath.match(/(?=(\.cy|\.spec|\.test))/)) === null || _a === void 0 ? void 0 : _a.index;
    if (specIndex && specIndex > -1) {
        return splitFilename(specWithoutPath, specIndex);
    }
    // if it didn't contain .cy, .spec, or .test, split it before the last extension
    const dotIndex = specWithoutPath.lastIndexOf('.');
    // if there's no extension, return the whole thing
    if (dotIndex < 0)
        return [specWithoutPath, ''];
    return splitFilename(specWithoutPath, dotIndex);
};
exports.getFilenameParts = getFilenameParts;
