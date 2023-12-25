"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitInfo = exports.GitInfoStatusTypeEnum = void 0;
const nexus_1 = require("nexus");
const types_1 = require(process.argv[1]+"/../packages/types");
exports.GitInfoStatusTypeEnum = (0, nexus_1.enumType)({
    name: 'GitInfoStatusType',
    members: types_1.gitStatusType,
});
exports.GitInfo = (0, nexus_1.objectType)({
    name: 'GitInfo',
    description: 'Git information about a spec file',
    definition(t) {
        t.string('author', {
            description: 'Last person to change the file in git',
        });
        t.string('lastModifiedTimestamp', {
            description: 'last modified timestamp, eg 2021-09-14 13:43:19 +1000',
        });
        t.string('lastModifiedHumanReadable', {
            description: 'last modified as a pretty string, eg 2 days ago',
        });
        t.field('statusType', {
            type: exports.GitInfoStatusTypeEnum,
            description: 'status type - created or modified',
        });
        t.string('subject', {
            description: 'subject for latest commit',
        });
        t.string('shortHash', {
            description: 'short hash for latest commit',
        });
    },
});
