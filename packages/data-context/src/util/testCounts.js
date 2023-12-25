"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTestCounts = void 0;
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const readline_1 = tslib_1.__importDefault(require("readline"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const codegen_1 = require("../codegen");
const templates_1 = tslib_1.__importDefault(require("../codegen/templates"));
const debug = (0, debug_1.default)('cypress:data-context:util:testCounts');
async function getTestCounts(specs) {
    const templateSpecPaths = await (0, codegen_1.getExampleSpecPaths)(templates_1.default.e2eExamples);
    const startTime = performance.now();
    const specCountPromises = specs.map((spec) => {
        return new Promise((resolve, reject) => {
            let testCounts = 0;
            readline_1.default.createInterface({
                input: fs_1.default.createReadStream(spec.absolute),
            })
                .on('line', (line) => {
                // test for "it(" appearing at beginning of line or with space before
                const isTest = /(^| )it\(/.test(line);
                if (isTest) {
                    testCounts++;
                }
            })
                .on('close', () => {
                resolve({
                    path: spec.absolute,
                    isExample: templateSpecPaths.some((templateSpec) => templateSpec === spec.relativeToCommonRoot),
                    testCounts,
                });
            });
        });
    });
    const countResults = await Promise.all(specCountPromises);
    const countSummary = countResults.reduce((summary, curr) => {
        summary.totalTests += curr.testCounts;
        if (curr.isExample) {
            summary.exampleSpecs++;
            summary.exampleTests += curr.testCounts;
        }
        return summary;
    }, { totalTests: 0, exampleSpecs: 0, exampleTests: 0 });
    const totalTime = performance.now() - startTime;
    debug(`took ${totalTime} ms to count ${specs.length} specs`);
    return {
        totalSpecs: specs.length,
        ...countSummary,
    };
}
exports.getTestCounts = getTestCounts;
