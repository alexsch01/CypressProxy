"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineConfigAvailable = exports.addTestingTypeToCypressConfig = exports.addToCypressConfig = exports.addProjectIdToCypressConfig = void 0;
const tslib_1 = require("tslib");
// Separating this, so we don't pull all of the server side
// babel transforms, etc. into client-side usage of the config code
tslib_1.__exportStar(require("./browser"), exports);
tslib_1.__exportStar(require("./project"), exports);
var addToCypressConfig_1 = require("./ast-utils/addToCypressConfig");
Object.defineProperty(exports, "addProjectIdToCypressConfig", { enumerable: true, get: function () { return addToCypressConfig_1.addProjectIdToCypressConfig; } });
Object.defineProperty(exports, "addToCypressConfig", { enumerable: true, get: function () { return addToCypressConfig_1.addToCypressConfig; } });
Object.defineProperty(exports, "addTestingTypeToCypressConfig", { enumerable: true, get: function () { return addToCypressConfig_1.addTestingTypeToCypressConfig; } });
Object.defineProperty(exports, "defineConfigAvailable", { enumerable: true, get: function () { return addToCypressConfig_1.defineConfigAvailable; } });
tslib_1.__exportStar(require("./utils"), exports);
