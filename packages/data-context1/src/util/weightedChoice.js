"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEIGHTED_EVEN = exports.WEIGHTED = void 0;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
/**
 * Randomly choose an index from an array based on weights
 *
 * Based on algorithm found here: https://dev.to/trekhleb/weighted-random-algorithm-in-javascript-1pdc
 *
 * @param weights array of numbered weights that correspond to the indexed values
 * @param values array of values to choose from
 */
const weightedChoice = (weights, values) => {
    var _a;
    if (weights.length === 0 || values.length === 0 || weights.length !== values.length) {
        throw new Error('The length of the weights and values must be the same and greater than zero');
    }
    const cumulativeWeights = weights.reduce((acc, curr) => {
        if (acc.length === 0) {
            return [curr];
        }
        const last = acc[acc.length - 1];
        if (!last) {
            return acc;
        }
        return [...acc, last + curr];
    }, []);
    const randomNumber = Math.random() * ((_a = cumulativeWeights[cumulativeWeights.length - 1]) !== null && _a !== void 0 ? _a : 1);
    const choice = lodash_1.default.transform(cumulativeWeights, (result, value, index) => {
        if (value >= randomNumber) {
            result.chosenIndex = index;
        }
        return result.chosenIndex === -1;
    }, { chosenIndex: -1 });
    return values[choice.chosenIndex];
};
const WEIGHTED = (weights) => {
    return {
        pick: (values) => {
            return weightedChoice(weights, values);
        },
    };
};
exports.WEIGHTED = WEIGHTED;
const WEIGHTED_EVEN = (values) => {
    return (0, exports.WEIGHTED)(lodash_1.default.fill(Array(values.length), 1));
};
exports.WEIGHTED_EVEN = WEIGHTED_EVEN;
