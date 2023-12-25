"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nexusCodegen = exports.watchNexusTypegen = exports.nexusTypegen = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
const child_process_1 = require("child_process");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const p_defer_1 = tslib_1.__importDefault(require("p-defer"));
const chokidar_1 = tslib_1.__importDefault(require("chokidar"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const graphQlPackageRoot = path_1.default.join(__dirname, '..', '..');
function prefixTypegen(s) {
    return `${chalk_1.default.cyan('nexusTypegen')}: ${s}`;
}
async function windowsTouch(filename, time) {
    // `fs.utimesSync` is used here to prevent existing file contents from being overwritten.
    // It also updates the last modification timestamp of the file, which is consistent with what POSIX touch does.
    try {
        fs_extra_1.default.utimesSync(filename, time, time);
    }
    catch (e) {
        fs_extra_1.default.closeSync(fs_extra_1.default.openSync(filename, 'w'));
    }
}
async function nexusTypegen(cfg) {
    const dfd = (0, p_defer_1.default)();
    if (cfg.outputPath) {
        await fs_extra_1.default.ensureDir(path_1.default.join(graphQlPackageRoot, 'src/gen'));
        const pkgGraphql = path_1.default.join(graphQlPackageRoot, 'src/gen/cloud-source-types.gen.ts');
        // on windows there is no `touch` equivalent command
        if (process.platform === 'win32') {
            const time = new Date();
            await windowsTouch(pkgGraphql, time);
            await windowsTouch(cfg.outputPath, time);
        }
        else {
            (0, child_process_1.execSync)(`touch ${pkgGraphql}`);
            (0, child_process_1.execSync)(`touch ${cfg.outputPath}`);
        }
    }
    const nodeCmd = `node${process.platform === 'win32' ? '.cmd' : ''}`;
    const out = (0, child_process_1.spawn)(nodeCmd, ['-r', '@packages/ts/register', cfg.filePath], {
        cwd: cfg.cwd,
        env: {
            ...process.env,
            CYPRESS_INTERNAL_NEXUS_CODEGEN: 'true',
            TS_NODE_CACHE: 'false',
        },
    });
    out.stderr.on('data', (data) => {
        process.stdout.write(prefixTypegen(chalk_1.default.red(String(data))));
        dfd.resolve({});
    });
    out.stdout.on('data', (data) => {
        const outString = String(data)
            .split('\n')
            .map((s) => prefixTypegen(chalk_1.default.magentaBright(s)))
            .join('\n');
        process.stdout.write('\n');
        process.stdout.write(outString);
        process.stdout.write('\n');
        dfd.resolve({});
    });
    out.on('error', dfd.reject);
    return dfd.promise;
}
exports.nexusTypegen = nexusTypegen;
let debounced = {};
const nexusTypegenDebounced = (cfg) => {
    var _a;
    debounced[cfg.filePath] =
        (_a = debounced[cfg.filePath]) !== null && _a !== void 0 ? _a : lodash_1.default.debounce(nexusTypegen, 500);
    // @ts-expect-error
    debounced[cfg.filePath](cfg);
};
async function watchNexusTypegen(cfg) {
    const dfd = (0, p_defer_1.default)();
    const watcher = chokidar_1.default.watch(cfg.watchPaths, {
        cwd: cfg.cwd,
        ignored: /\.gen\.ts/,
        ignoreInitial: true,
    });
    watcher.on('all', (evt, path) => {
        console.log(prefixTypegen(`${evt} ${path}`));
        nexusTypegenDebounced(cfg);
    });
    watcher.on('ready', () => {
        console.log(prefixTypegen(`Codegen Watcher Ready for ${cfg.filePath}`));
        nexusTypegen(cfg).then(dfd.resolve, dfd.reject);
    });
    return dfd.promise;
}
exports.watchNexusTypegen = watchNexusTypegen;
async function nexusCodegen() {
    return nexusTypegen({
        cwd: graphQlPackageRoot,
        filePath: path_1.default.join(graphQlPackageRoot, 'src/schema.ts'),
        outputPath: path_1.default.join(graphQlPackageRoot, 'src/gen/nxs.gen.ts'),
    });
}
exports.nexusCodegen = nexusCodegen;
