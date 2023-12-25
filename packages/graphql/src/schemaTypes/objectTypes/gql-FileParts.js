"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileParts = void 0;
const tslib_1 = require("tslib");
const nexus_1 = require("nexus");
const path_1 = tslib_1.__importDefault(require("path"));
exports.FileParts = (0, nexus_1.objectType)({
    name: 'FileParts',
    description: 'Represents a file on the file system',
    node: 'absolute',
    definition(t) {
        t.nonNull.string('absolute', {
            description: 'Absolute path to file (e.g. /Users/jess/my-project/src/component/MySpec.test.tsx)',
        });
        t.nonNull.string('relative', {
            description: 'Relative path to file (e.g. src/component/MySpec.test.tsx)',
            resolve(root, args, ctx) {
                return path_1.default.relative(ctx.currentProject || '', root.absolute);
            },
        });
        t.nonNull.string('baseName', {
            description: 'Full name of the file (e.g. MySpec.test.tsx)',
            resolve(root, args, ctx) {
                return path_1.default.basename(root.absolute);
            },
        });
        t.nonNull.string('name', {
            description: 'Full name of spec file (e.g. MySpec.test.tsx)',
            resolve(root) {
                return path_1.default.basename(root.absolute);
            },
        });
        t.nonNull.string('fileExtension', {
            description: `The file's extension`,
            resolve(root) {
                return path_1.default.extname(root.absolute);
            },
        });
        t.nonNull.string('fileName', {
            description: `The first part of the file, without extensions (e.g. MySpec)`,
            resolve(root) {
                var _a;
                return (_a = path_1.default.basename(root.absolute).split('.')[0]) !== null && _a !== void 0 ? _a : '';
            },
        });
        t.nonNull.string('contents', {
            description: `The contents of the file`,
            resolve(root, args, ctx) {
                return root.contents || ctx.fs.readFile(root.absolute, 'utf8');
            },
        });
        t.int('line', {
            description: 'If provided, used to specify the line of the file to open in openFileInIDE',
        });
        t.int('column', {
            description: 'If provided, used to specify the column of the file to open in openFileInIDE',
        });
    },
    sourceType: {
        module: __filename,
        export: 'FilePartsShape',
    },
});
