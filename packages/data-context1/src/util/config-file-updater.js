"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDefineConfigFunction = exports.insertValueInJSString = exports.insertValuesInConfigFile = void 0;
const tslib_1 = require("tslib");
const parser_1 = require("@babel/parser");
const recast_1 = require("recast");
const debug_1 = tslib_1.__importDefault(require("debug"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const stringify_object_1 = tslib_1.__importDefault(require("stringify-object"));
const debug = (0, debug_1.default)('cypress:data-context:config-file-updater');
async function insertValuesInConfigFile(file, obj, errors) {
    const fileContents = await fs_extra_1.default.readFile(file, { encoding: 'utf8' });
    const transformedFileContents = await insertValueInJSString(fileContents, obj, errors);
    debug('transformedFileContents %s', transformedFileContents);
    await fs_extra_1.default.writeFile(file, transformedFileContents).catch((e) => {
        throw new Error(`Failed to update config file ${file} with ${(0, stringify_object_1.default)(obj)}: ${e.message}`);
    });
}
exports.insertValuesInConfigFile = insertValuesInConfigFile;
async function insertValueInJSString(fileContents, obj, errors) {
    const ast = (0, parser_1.parse)(fileContents, { plugins: ['typescript'], sourceType: 'module' });
    let objectLiteralNode;
    function handleExport(nodePath) {
        if (nodePath.node.type === 'CallExpression'
            && nodePath.node.callee.type === 'Identifier') {
            const functionName = nodePath.node.callee.name;
            if (isDefineConfigFunction(ast, functionName)) {
                return handleExport(nodePath.get('arguments', 0));
            }
        }
        if (nodePath.node.type === 'ObjectExpression' && !nodePath.node.properties.find((prop) => prop.type !== 'ObjectProperty')) {
            objectLiteralNode = nodePath.node;
            debug('found object literal %o', objectLiteralNode);
            return;
        }
        throw errors.get('COULD_NOT_UPDATE_CONFIG_FILE', obj, 'Exported object is not an object literal');
    }
    (0, recast_1.visit)(ast, {
        visitAssignmentExpression(nodePath) {
            if (nodePath.node.left.type === 'MemberExpression') {
                if (nodePath.node.left.object.type === 'Identifier' && nodePath.node.left.object.name === 'module'
                    && nodePath.node.left.property.type === 'Identifier' && nodePath.node.left.property.name === 'exports') {
                    handleExport(nodePath.get('right'));
                }
            }
            return false;
        },
        visitExportDefaultDeclaration(nodePath) {
            handleExport(nodePath.get('declaration'));
            return false;
        },
    });
    const splicers = [];
    if (!objectLiteralNode) {
        // if the export is no object literal
        throw errors.get('COULD_NOT_UPDATE_CONFIG_FILE', obj, 'No export could be found');
    }
    setRootKeysSplicers(splicers, obj, objectLiteralNode, '  ', errors);
    setSubKeysSplicers(splicers, obj, objectLiteralNode, '  ', '  ', errors);
    // sort splicers to keep the order of the original file
    const sortedSplicers = splicers.sort((a, b) => a.start === b.start ? 0 : a.start > b.start ? 1 : -1);
    debug('sortedSplicers %o', sortedSplicers);
    if (!sortedSplicers.length)
        return fileContents;
    let nextStartingIndex = 0;
    let resultCode = '';
    sortedSplicers.forEach((splicer) => {
        resultCode += fileContents.slice(nextStartingIndex, splicer.start) + splicer.replaceString;
        nextStartingIndex = splicer.end;
    });
    return resultCode + fileContents.slice(nextStartingIndex);
}
exports.insertValueInJSString = insertValueInJSString;
function isDefineConfigFunction(ast, functionName) {
    let value = false;
    (0, recast_1.visit)(ast, {
        visitVariableDeclarator(nodePath) {
            var _a, _b, _c, _d;
            // if this is a require of cypress
            if (((_a = nodePath.node.init) === null || _a === void 0 ? void 0 : _a.type) === 'CallExpression'
                && nodePath.node.init.callee.type === 'Identifier'
                && nodePath.node.init.callee.name === 'require'
                && ((_b = nodePath.node.init.arguments[0]) === null || _b === void 0 ? void 0 : _b.type) === 'StringLiteral'
                && nodePath.node.init.arguments[0].value === 'cypress') {
                if (((_c = nodePath.node.id) === null || _c === void 0 ? void 0 : _c.type) === 'ObjectPattern') {
                    const defineConfigFunctionNode = nodePath.node.id.properties.find((prop) => {
                        return prop.type === 'ObjectProperty'
                            && prop.key.type === 'Identifier'
                            && prop.key.name === 'defineConfig';
                    });
                    if (defineConfigFunctionNode) {
                        value = ((_d = defineConfigFunctionNode.value) === null || _d === void 0 ? void 0 : _d.name) === functionName;
                    }
                }
            }
            return false;
        },
        visitImportDeclaration(nodePath) {
            var _a, _b;
            if (nodePath.node.source.type === 'StringLiteral'
                && nodePath.node.source.value === 'cypress') {
                const defineConfigFunctionNode = (_a = nodePath.node.specifiers) === null || _a === void 0 ? void 0 : _a.find((specifier) => {
                    return specifier.type === 'ImportSpecifier'
                        && specifier.imported.type === 'Identifier'
                        && specifier.imported.name === 'defineConfig';
                });
                if (defineConfigFunctionNode) {
                    value = ((_b = defineConfigFunctionNode.local) === null || _b === void 0 ? void 0 : _b.name) === functionName;
                }
            }
            return false;
        },
    });
    return value;
}
exports.isDefineConfigFunction = isDefineConfigFunction;
function setRootKeysSplicers(splicers, obj, objectLiteralNode, lineStartSpacer, errors) {
    const objectLiteralStartIndex = objectLiteralNode.start + 1;
    // add values
    const objKeys = Object.keys(obj).filter((key) => ['boolean', 'number', 'string'].includes(typeof obj[key]));
    // update values
    const keysToUpdate = objKeys.filter((key) => {
        return objectLiteralNode.properties.find((prop) => {
            return prop.type === 'ObjectProperty'
                && matchKey(prop, key);
        });
    });
    debug('keys to update %O', keysToUpdate);
    keysToUpdate.forEach((key) => {
        const propertyToUpdate = propertyFromKey(objectLiteralNode, key);
        if (propertyToUpdate) {
            setSplicerToUpdateProperty(splicers, propertyToUpdate, obj[key], key, obj, errors);
        }
    });
    const keysToInsert = objKeys.filter((key) => !keysToUpdate.includes(key));
    debug('keys to instert %O', keysToInsert);
    if (keysToInsert.length) {
        const valuesInserted = `\n${lineStartSpacer}${keysToInsert.map((key) => `${key}: ${(0, stringify_object_1.default)(obj[key])},`).join(`\n${lineStartSpacer}`)}`;
        splicers.push({
            start: objectLiteralStartIndex,
            end: objectLiteralStartIndex,
            replaceString: valuesInserted,
        });
    }
}
function setSubKeysSplicers(splicers, obj, objectLiteralNode, lineStartSpacer, parentLineStartSpacer, errors) {
    var _a;
    const objectLiteralStartIndex = objectLiteralNode.start + 1;
    const keysToUpdateWithObjects = [];
    const objSubkeys = Object.keys(obj).filter((key) => typeof obj[key] === 'object').reduce((acc, key) => {
        keysToUpdateWithObjects.push(key);
        Object.entries(obj[key]).forEach(([subkey, value]) => {
            if (['boolean', 'number', 'string'].includes(typeof value)) {
                acc.push({ parent: key, subkey });
            }
        });
        return acc;
    }, []);
    // add values where the parent key needs to be created
    const subkeysToInsertWithoutKey = objSubkeys.filter(({ parent }) => {
        return !objectLiteralNode.properties.find((prop) => {
            return prop.type === 'ObjectProperty'
                && matchKey(prop, parent);
        });
    });
    const keysToInsertForSubKeys = {};
    subkeysToInsertWithoutKey.forEach((keyTuple) => {
        const subkeyList = keysToInsertForSubKeys[keyTuple.parent] || [];
        subkeyList.push(keyTuple.subkey);
        keysToInsertForSubKeys[keyTuple.parent] = subkeyList;
    });
    let subvaluesInserted = '';
    for (const key in keysToInsertForSubKeys) {
        subvaluesInserted += `\n${parentLineStartSpacer}${key}: {`;
        (_a = keysToInsertForSubKeys[key]) === null || _a === void 0 ? void 0 : _a.forEach((subkey) => {
            subvaluesInserted += `\n${parentLineStartSpacer}${lineStartSpacer}${subkey}: ${(0, stringify_object_1.default)(obj[key][subkey])},`;
        });
        subvaluesInserted += `\n${parentLineStartSpacer}},`;
    }
    if (subkeysToInsertWithoutKey.length) {
        splicers.push({
            start: objectLiteralStartIndex,
            end: objectLiteralStartIndex,
            replaceString: subvaluesInserted,
        });
    }
    // add/update values where parent key already exists
    keysToUpdateWithObjects.filter((parent) => {
        return objectLiteralNode.properties.find((prop) => {
            return prop.type === 'ObjectProperty'
                && matchKey(prop, parent);
        });
    }).forEach((key) => {
        const propertyToUpdate = propertyFromKey(objectLiteralNode, key);
        if ((propertyToUpdate === null || propertyToUpdate === void 0 ? void 0 : propertyToUpdate.value.type) === 'ObjectExpression') {
            setRootKeysSplicers(splicers, obj[key], propertyToUpdate.value, parentLineStartSpacer + lineStartSpacer, errors);
        }
    });
}
function setSplicerToUpdateProperty(splicers, propertyToUpdate, updatedValue, key, obj, errors) {
    if (propertyToUpdate && (isPrimitive(propertyToUpdate.value) || isUndefinedOrNull(propertyToUpdate.value))) {
        splicers.push({
            start: propertyToUpdate.value.start,
            end: propertyToUpdate.value.end,
            replaceString: (0, stringify_object_1.default)(updatedValue),
        });
    }
    else {
        debug('error', propertyToUpdate === null || propertyToUpdate === void 0 ? void 0 : propertyToUpdate.value);
        throw errors.get('COULD_NOT_UPDATE_CONFIG_FILE', obj, `Value for \`${key}\` is not a primitive. Updating this value could break your config.`);
    }
}
function propertyFromKey(objectLiteralNode, key) {
    return objectLiteralNode === null || objectLiteralNode === void 0 ? void 0 : objectLiteralNode.properties.find((prop) => {
        return prop.type === 'ObjectProperty'
            && matchKey(prop, key);
    });
}
function isPrimitive(value) {
    return value.type === 'NumericLiteral' || value.type === 'StringLiteral' || value.type === 'BooleanLiteral';
}
function isUndefinedOrNull(value) {
    return value.type === 'Identifier' && ['undefined', 'null'].includes(value.name);
}
function matchKey(prop, key) {
    return prop.key.type === 'Identifier' && prop.key.name === key
        || prop.key.type === 'StringLiteral' && prop.key.value === key;
}
