"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addComponentDefinition = exports.addE2EDefinition = void 0;
const tslib_1 = require("tslib");
const t = tslib_1.__importStar(require("@babel/types"));
const recast_1 = require("recast");
const dedent_1 = tslib_1.__importDefault(require("dedent"));
const assert_1 = tslib_1.__importDefault(require("assert"));
/**
 * AST definition Node for:
 *
 * e2e: {
 *   setupNodeEvents(on, config) {
 *     // implement node event listeners here
 *   }
 * }
 */
function addE2EDefinition() {
    return extractProperty(`
    const toMerge = {
      e2e: {
        setupNodeEvents(on, config) {
          // implement node event listeners here
        },
      }
    }
  `);
}
exports.addE2EDefinition = addE2EDefinition;
/**
 * AST definition Node for:
 *
 * component: {
 *   devServer: {
 *     bundler: 'bundler',
 *     framework: 'framework',
 *   }
 * }
 */
function addComponentDefinition(config) {
    const componentConfig = JSON.stringify({
        component: {
            devServer: {
                framework: config.framework,
                bundler: config.bundler,
            },
            specPattern: config.specPattern,
        },
    }, null, 2);
    return extractProperty(`
    const toMerge = ${componentConfig}
  `);
}
exports.addComponentDefinition = addComponentDefinition;
function extractProperty(str) {
    const toParse = (0, recast_1.parse)((0, dedent_1.default)(str), {
        parser: require('recast/parsers/typescript'),
    });
    let complete = false;
    let toAdd;
    (0, recast_1.visit)(toParse, {
        visitObjectExpression(path) {
            if (complete)
                return false;
            if (path.node.properties.length > 1 || !t.isObjectProperty(path.node.properties[0])) {
                throw new Error(`Can only parse an expression with a single property`);
            }
            toAdd = path.node.properties[0];
            complete = true;
            return false;
        },
    });
    (0, assert_1.default)(toAdd, `Missing property to merge into config from string: ${str}`);
    return toAdd;
}
