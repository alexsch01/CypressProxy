"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utils = void 0;
const tslib_1 = require("tslib");
const execa_1 = tslib_1.__importDefault(require("execa"));
const child_process_1 = tslib_1.__importDefault(require("child_process"));
const os_1 = tslib_1.__importDefault(require("os"));
const bluebird_1 = tslib_1.__importDefault(require("bluebird"));
// export an object for easy method stubbing
exports.utils = {
    execa: execa_1.default,
    spawnWithArch: (cmd, args, opts) => {
        if (os_1.default.platform() === 'darwin' && os_1.default.arch() === 'arm64') {
            // On macOS, browsers are distributed as "universal apps" which have both arm64 and x86_64 binaries
            // in the same file. The OS decides which architecture to use based on heuristics. If Cypress was
            // launched from an x86_64 process on arm64 macOS (like if an x64 version of Node.js is being used),
            // even though the Cypress CLI will correctly spawn the arm64 version of Cypress, when we spawn the
            // browser macOS will decide to use the x86_64 version, not the arm64 version. This is problematic
            // because the Rosetta translation is painfully slow. To work around this, we wrap the spawn with
            // the `arch` utility, which will launch the correct architecture (arm64) if it is available in the
            // universal app, otherwise falling back to x86_64.
            return child_process_1.default.spawn('arch', [cmd, ...args], {
                ...opts,
                env: {
                    ARCHPREFERENCE: 'arm64,x86_64',
                    ...opts.env,
                },
            });
        }
        // Outside of darwin-arm64, we can rely on the OS to launch the correct architecture of the browser.
        return child_process_1.default.spawn(cmd, args, opts);
    },
    getOutput: (cmd, args) => {
        if (os_1.default.platform() === 'win32') {
            // execa has better support for windows spawning conventions
            throw new Error('getOutput should not be used on Windows - use execa instead');
        }
        return new bluebird_1.default((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            const proc = exports.utils.spawnWithArch(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
            const finish = () => {
                proc.kill();
                resolve({ stderr, stdout });
            };
            // the "exit" event might happen before
            // the child streams are finished, thus we use
            // the "close" event
            // https://github.com/cypress-io/cypress/issues/8611
            proc.on('close', finish);
            proc.stdout.on('data', (chunk) => {
                stdout += chunk;
            });
            proc.stderr.on('data', (chunk) => {
                stderr += chunk;
            });
            proc.on('error', (err) => {
                proc.kill();
                reject(err);
            });
        });
    },
};
