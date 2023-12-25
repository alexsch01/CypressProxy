"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileDetailsInput = void 0;
const nexus_1 = require("nexus");
exports.FileDetailsInput = (0, nexus_1.inputObjectType)({
    name: 'FileDetailsInput',
    definition(t) {
        t.nonNull.string('filePath', {
            description: 'When we open a file we take a filePath, either relative to the project root, or absolute on disk',
        });
        t.int('column');
        t.int('line');
    },
});
