"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path = tslib_1.__importStar(require("path"));
const example_1 = tslib_1.__importDefault(require(process.argv[1]+"/../packages/example"));
const getPath = (dir) => path.join(__dirname, dir);
exports.default = {
    reactComponent: getPath('./templates/react-component'),
    vueComponent: getPath('./templates/vue-component'),
    componentEmpty: getPath('./templates/empty-component'),
    e2e: getPath('./templates/empty-e2e'),
    e2eExamples: example_1.default.getPathToE2E(),
};
