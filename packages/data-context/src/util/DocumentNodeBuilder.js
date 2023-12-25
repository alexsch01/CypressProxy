"use strict";
var _DocumentNodeBuilder_instances, _DocumentNodeBuilder_variableNames, _DocumentNodeBuilder_withRequiredFields;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentNodeBuilder = void 0;
const tslib_1 = require("tslib");
const graphql_1 = require("graphql");
/**
 * Builds a DocumentNode from a given GraphQLResolveInfo payload
 *
 * Used to generate a fragment to push down into the client-side cache
 */
class DocumentNodeBuilder {
    constructor(info) {
        _DocumentNodeBuilder_instances.add(this);
        this.info = info;
        _DocumentNodeBuilder_variableNames.set(this, void 0);
        const selections = tslib_1.__classPrivateFieldGet(this, _DocumentNodeBuilder_instances, "m", _DocumentNodeBuilder_withRequiredFields).call(this, info);
        this.frag = {
            kind: 'FragmentDefinition',
            name: { kind: 'Name', value: 'GeneratedFragment' },
            // variableDefinitions: info.operation?.variableDefinitions ?? [],
            typeCondition: {
                kind: 'NamedType',
                name: { kind: 'Name', value: info.parentType.name },
            },
            selectionSet: {
                kind: 'SelectionSet',
                selections,
            },
        };
        // The fragment used to write into the
        this.clientWriteFragment = {
            kind: 'Document',
            definitions: [this.frag],
        };
        tslib_1.__classPrivateFieldSet(this, _DocumentNodeBuilder_variableNames, new Set(), "f");
        this.variables = [];
        /**
         * Finds all of the variables referenced within the field nodes, pulls these definitions
         * from the outer definition
         */
        this.info.fieldNodes.map((node) => {
            (0, graphql_1.visit)(node, {
                Argument: (arg) => {
                    var _a;
                    if (arg.value.kind === 'Variable') {
                        const variableName = arg.value.name.value;
                        if (!tslib_1.__classPrivateFieldGet(this, _DocumentNodeBuilder_variableNames, "f").has(variableName)) {
                            tslib_1.__classPrivateFieldGet(this, _DocumentNodeBuilder_variableNames, "f").add(variableName);
                            const def = (_a = this.info.variableDefinitions) === null || _a === void 0 ? void 0 : _a.find((d) => d.variable.name.value === variableName);
                            if (def) {
                                this.variables.push(def);
                            }
                        }
                    }
                },
            });
        });
    }
    get variableNames() {
        return Array.from(tslib_1.__classPrivateFieldGet(this, _DocumentNodeBuilder_variableNames, "f"));
    }
    get query() {
        return {
            kind: 'Document',
            definitions: [
                this.frag,
                {
                    kind: 'OperationDefinition',
                    operation: 'query',
                    name: {
                        kind: 'Name',
                        value: this.info.operationName,
                    },
                    selectionSet: {
                        kind: 'SelectionSet',
                        selections: [
                            {
                                kind: 'FragmentSpread',
                                name: { kind: 'Name', value: 'GeneratedFragment' },
                            },
                        ],
                    },
                    variableDefinitions: this.variables,
                },
            ],
        };
    }
    get queryNode() {
        return {
            kind: 'Document',
            definitions: [
                this.frag,
                {
                    kind: 'OperationDefinition',
                    operation: 'query',
                    name: {
                        kind: 'Name',
                        value: this.info.operationName,
                    },
                    selectionSet: {
                        kind: 'SelectionSet',
                        selections: [
                            {
                                kind: 'Field',
                                name: {
                                    kind: 'Name',
                                    value: 'node',
                                },
                                arguments: [
                                    {
                                        kind: 'Argument',
                                        name: { kind: 'Name', value: 'id' },
                                        value: { kind: 'StringValue', value: 'PUSH_FRAGMENT_PLACEHOLDER' },
                                    },
                                ],
                                selectionSet: {
                                    kind: 'SelectionSet',
                                    selections: [
                                        {
                                            kind: 'Field',
                                            name: { kind: 'Name', value: '__typename' },
                                        },
                                        {
                                            kind: 'Field',
                                            name: { kind: 'Name', value: 'id' },
                                        },
                                        {
                                            kind: 'FragmentSpread',
                                            name: { kind: 'Name', value: 'GeneratedFragment' },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                    variableDefinitions: this.variables,
                },
            ],
        };
    }
}
exports.DocumentNodeBuilder = DocumentNodeBuilder;
_DocumentNodeBuilder_variableNames = new WeakMap(), _DocumentNodeBuilder_instances = new WeakSet(), _DocumentNodeBuilder_withRequiredFields = function _DocumentNodeBuilder_withRequiredFields(params) {
    let selections = [...params.fieldNodes];
    if ((params.isNode || params.isRemoteFetchable) && !selections.some((s) => s.kind === 'Field' && s.name.value === 'id')) {
        selections = [{
                kind: 'Field',
                name: { kind: 'Name', value: 'id' },
            }, ...selections];
    }
    if (params.isRemoteFetchable) {
        if (!selections.some((s) => s.kind === 'Field' && s.name.value === 'fetchingStatus')) {
            selections = [{
                    kind: 'Field',
                    name: { kind: 'Name', value: 'fetchingStatus' },
                }, ...selections];
        }
        if (!selections.some((s) => s.kind === 'Field' && s.name.value === 'error')) {
            selections = [{
                    kind: 'Field',
                    name: { kind: 'Name', value: 'error' },
                }, ...selections];
        }
    }
    return selections;
};
