"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCypressErr = exports.log = exports.warning = exports.get = exports.stripAnsi = exports.cloneErr = exports.throwErr = exports.logWarning = exports.getError = exports.getMsgByType = exports.AllCypressErrors = exports.warnIfExplicitCiBuildId = void 0;
const tslib_1 = require("tslib");
const ansi_up_1 = tslib_1.__importDefault(require("ansi_up"));
/* eslint-disable no-console */
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path_1 = tslib_1.__importDefault(require("path"));
const strip_ansi_1 = tslib_1.__importDefault(require("strip-ansi"));
exports.stripAnsi = strip_ansi_1.default;
const errorUtils_1 = require("./errorUtils");
const errTemplate_1 = require("./errTemplate");
const stackUtils_1 = require("./stackUtils");
const ansi_up = new ansi_up_1.default();
ansi_up.use_classes = true;
const displayRetriesRemaining = function (tries) {
    const times = tries === 1 ? 'time' : 'times';
    const lastTryNewLine = tries === 1 ? '\n' : '';
    return errTemplate_1.fmt.meta(`We will try connecting to it ${tries} more ${times}...${lastTryNewLine}`);
};
const getUsedTestsMessage = (limit, usedTestsMessage) => {
    return lodash_1.default.isFinite(limit)
        ? errTemplate_1.fmt.off(`The limit is ${chalk_1.default.yellow(`${limit}`)} ${usedTestsMessage} results.`)
        : errTemplate_1.fmt.off('');
};
const warnIfExplicitCiBuildId = function (ciBuildId) {
    if (!ciBuildId) {
        return null;
    }
    return (0, errTemplate_1.errPartial) `\
It also looks like you also passed in an explicit ${errTemplate_1.fmt.flag('--ci-build-id')} flag.

This is only necessary if you are NOT running in one of our supported CI providers.

This flag must be unique for each new run, but must also be identical for each machine you are trying to --group or run in --parallel.\
`;
};
exports.warnIfExplicitCiBuildId = warnIfExplicitCiBuildId;
/**
 * All Cypress Errors should be defined here:
 *
 * The errors must return an "errTemplate", this is processed by the
 */
exports.AllCypressErrors = {
    CANNOT_TRASH_ASSETS: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        Warning: We failed to trash the existing run results.

        This error will not affect or change the exit code.

        ${errTemplate_1.fmt.stackTrace(arg1)}`;
    },
    CANNOT_REMOVE_OLD_BROWSER_PROFILES: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        Warning: We failed to remove old browser profiles from previous runs.

        This error will not affect or change the exit code.

        ${errTemplate_1.fmt.stackTrace(arg1)}`;
    },
    VIDEO_RECORDING_FAILED: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        Warning: We failed to record the video.

        This error will not affect or change the exit code.

        ${errTemplate_1.fmt.stackTrace(arg1)}`;
    },
    VIDEO_CAPTURE_FAILED: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        Warning: We failed capturing this video.

        This error will not affect or change the exit code.

        ${errTemplate_1.fmt.stackTrace(arg1)}`;
    },
    VIDEO_COMPRESSION_FAILED: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        Warning: We failed compressing this video.

        This error will not affect or change the exit code.

        ${errTemplate_1.fmt.stackTrace(arg1)}`;
    },
    CHROME_WEB_SECURITY_NOT_SUPPORTED: (browser) => {
        return (0, errTemplate_1.errTemplate) `\
        Your project has set the configuration option: \`chromeWebSecurity\` to \`false\`.

        This option will not have an effect in ${errTemplate_1.fmt.off(lodash_1.default.capitalize(browser))}. Tests that rely on web security being disabled will not run as expected.`;
    },
    BROWSER_UNSUPPORTED_LAUNCH_OPTION: (browser, options) => {
        return (0, errTemplate_1.errTemplate) `\
        Warning: The following browser launch options were provided but are not supported by ${errTemplate_1.fmt.highlightSecondary(browser)}

        ${errTemplate_1.fmt.listItems(options)}`;
    },
    BROWSER_NOT_FOUND_BY_NAME: (browser, foundBrowsersStr) => {
        let canarySuffix = null;
        if (browser === 'canary') {
            canarySuffix = (0, errTemplate_1.errPartial) `\
          ${errTemplate_1.fmt.off('\n\n')}
          Note: In ${errTemplate_1.fmt.cypressVersion(`4.0.0`)}, Canary must be launched as ${errTemplate_1.fmt.highlightSecondary(`chrome:canary`)}, not ${errTemplate_1.fmt.highlightSecondary(`canary`)}.

          See https://on.cypress.io/migration-guide for more information on breaking changes in 4.0.0.`;
        }
        return (0, errTemplate_1.errTemplate) `\
        Can't run because you've entered an invalid browser name.

        Browser: ${errTemplate_1.fmt.highlight(browser)} was not found on your system or is not supported by Cypress.

        Cypress supports the following browsers:
        ${errTemplate_1.fmt.listItems(['electron', 'chrome', 'chromium', 'chrome:canary', 'edge', 'firefox'])}

        You can also use a custom browser: https://on.cypress.io/customize-browsers

        Available browsers found on your system are:
        ${errTemplate_1.fmt.listItems(foundBrowsersStr)}${canarySuffix}`;
    },
    BROWSER_NOT_FOUND_BY_PATH: (arg1, arg2) => {
        return (0, errTemplate_1.errTemplate) `\
        We could not identify a known browser at the path you provided: ${errTemplate_1.fmt.path(arg1)}

        Read more about how to troubleshoot launching browsers: https://on.cypress.io/troubleshooting-launching-browsers

        The output from the command we ran was:

        ${errTemplate_1.fmt.highlightSecondary(arg2)}`;
    },
    NOT_LOGGED_IN: () => {
        return (0, errTemplate_1.errTemplate) `\
        You're not logged in.

        Run ${errTemplate_1.fmt.highlight(`cypress open`)} to open Cypress and log in.`;
    },
    TESTS_DID_NOT_START_RETRYING: (arg1) => {
        return (0, errTemplate_1.errTemplate) `Timed out waiting for the browser to connect. ${errTemplate_1.fmt.off(arg1)}`;
    },
    TESTS_DID_NOT_START_FAILED: () => {
        return (0, errTemplate_1.errTemplate) `The browser never connected. Something is wrong. The tests cannot run. Aborting...`;
    },
    CLOUD_CANCEL_SKIPPED_SPEC: () => {
        return (0, errTemplate_1.errTemplate) `${errTemplate_1.fmt.off(`\n  `)}This spec and its tests were skipped because the run has been canceled.`;
    },
    CLOUD_API_RESPONSE_FAILED_RETRYING: (arg1) => {
        const time = (0, errorUtils_1.pluralize)('time', arg1.tries);
        const delay = errorUtils_1.humanTime.long(arg1.delayMs, false);
        return (0, errTemplate_1.errTemplate) `\
        We encountered an unexpected error communicating with our servers.

        ${errTemplate_1.fmt.highlightSecondary(arg1.response)}

        We will retry ${errTemplate_1.fmt.off(arg1.tries)} more ${errTemplate_1.fmt.off(time)} in ${errTemplate_1.fmt.off(delay)}...
        `;
        /* Because of fmt.listFlags() and fmt.listItems() */
        /* eslint-disable indent */
    },
    CLOUD_CANNOT_PROCEED_IN_PARALLEL: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        We encountered an unexpected error communicating with our servers.

        ${errTemplate_1.fmt.highlightSecondary(arg1.response)}

        Because you passed the ${errTemplate_1.fmt.flag(`--parallel`)} flag, this run cannot proceed because it requires a valid response from our servers.

        ${errTemplate_1.fmt.listFlags(arg1.flags, {
            group: '--group',
            ciBuildId: '--ciBuildId',
        })}`;
    },
    CLOUD_CANNOT_PROCEED_IN_SERIAL: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        We encountered an unexpected error communicating with our servers.

        ${errTemplate_1.fmt.highlightSecondary(arg1.response)}

        ${errTemplate_1.fmt.listFlags(arg1.flags, {
            group: '--group',
            ciBuildId: '--ciBuildId',
        })}`;
    },
    CLOUD_UNKNOWN_INVALID_REQUEST: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        We encountered an unexpected error communicating with our servers.

        ${errTemplate_1.fmt.highlightSecondary(arg1.response)}

        There is likely something wrong with the request.

        ${errTemplate_1.fmt.listFlags(arg1.flags, {
            tags: '--tag',
            group: '--group',
            parallel: '--parallel',
            ciBuildId: '--ciBuildId',
        })}`;
    },
    CLOUD_UNKNOWN_CREATE_RUN_WARNING: (arg1) => {
        if (!Object.keys(arg1.props).length) {
            return (0, errTemplate_1.errTemplate) `\
          Warning from Cypress Cloud: ${errTemplate_1.fmt.highlight(arg1.message)}
      `;
        }
        return (0, errTemplate_1.errTemplate) `\
        Warning from Cypress Cloud: ${errTemplate_1.fmt.highlight(arg1.message)}

        Details:
        ${errTemplate_1.fmt.meta(arg1.props)}`;
    },
    CLOUD_STALE_RUN: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        You are attempting to pass the ${errTemplate_1.fmt.flag(`--parallel`)} flag to a run that was completed over 24 hours ago.

        The existing run is: ${errTemplate_1.fmt.url(arg1.runUrl)}

        You cannot parallelize a run that has been complete for that long.

        ${errTemplate_1.fmt.listFlags(arg1, {
            tags: '--tag',
            group: '--group',
            parallel: '--parallel',
            ciBuildId: '--ciBuildId',
        })}

        https://on.cypress.io/stale-run`;
    },
    CLOUD_ALREADY_COMPLETE: (props) => {
        return (0, errTemplate_1.errTemplate) `\
        The run you are attempting to access is already complete and will not accept new groups.

        The existing run is: ${errTemplate_1.fmt.url(props.runUrl)}

        When a run finishes all of its groups, it waits for a configurable set of time before finally completing. You must add more groups during that time period.

        ${errTemplate_1.fmt.listFlags(props, {
            tags: '--tag',
            group: '--group',
            parallel: '--parallel',
            ciBuildId: '--ciBuildId',
        })}

        https://on.cypress.io/already-complete`;
    },
    CLOUD_PARALLEL_REQUIRED: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        You did not pass the ${errTemplate_1.fmt.flag(`--parallel`)} flag, but this run's group was originally created with the --parallel flag.

        The existing run is: ${errTemplate_1.fmt.url(arg1.runUrl)}

        ${errTemplate_1.fmt.listFlags(arg1, {
            tags: '--tag',
            group: '--group',
            parallel: '--parallel',
            ciBuildId: '--ciBuildId',
        })}

        You must use the --parallel flag with this group.

        https://on.cypress.io/parallel-required`;
    },
    CLOUD_PARALLEL_DISALLOWED: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        You passed the ${errTemplate_1.fmt.flag(`--parallel`)} flag, but this run group was originally created without the --parallel flag.

        The existing run is: ${errTemplate_1.fmt.url(arg1.runUrl)}

        ${errTemplate_1.fmt.listFlags(arg1, {
            group: '--group',
            parallel: '--parallel',
            ciBuildId: '--ciBuildId',
        })}

        You can not use the --parallel flag with this group.

        https://on.cypress.io/parallel-disallowed`;
    },
    CLOUD_PARALLEL_GROUP_PARAMS_MISMATCH: (arg1) => {
        var _a;
        let params = arg1.parameters;
        if ((_a = arg1.payload) === null || _a === void 0 ? void 0 : _a.differentParams) {
            params = {};
            lodash_1.default.map(arg1.parameters, (value, key) => {
                var _a, _b;
                if (key === 'specs' && ((_a = arg1.payload.differentSpecs) === null || _a === void 0 ? void 0 : _a.length)) {
                    const addedSpecs = [];
                    const missingSpecs = [];
                    lodash_1.default.forEach(arg1.payload.differentSpecs, (s) => {
                        if (value.includes(s)) {
                            addedSpecs.push(s);
                        }
                        else {
                            missingSpecs.push(s);
                        }
                    });
                    params['differentSpecs'] = {
                        added: addedSpecs,
                        missing: missingSpecs,
                    };
                }
                else if ((_b = arg1.payload.differentParams[key]) === null || _b === void 0 ? void 0 : _b.expected) {
                    params[key] = `${value}.... (Expected: ${(arg1.payload.differentParams[key].expected)})`;
                }
                else {
                    params[key] = value;
                }
            });
        }
        return (0, errTemplate_1.errTemplate) `\
        You passed the ${errTemplate_1.fmt.flag(`--parallel`)} flag, but we do not parallelize tests across different environments.

        This machine is sending different environment parameters than the first machine that started this parallel run.

        The existing run is: ${errTemplate_1.fmt.url(arg1.runUrl)}

        In order to run in parallel mode each machine must send identical environment parameters such as:

        ${errTemplate_1.fmt.listItems([
            'specs',
            'osName',
            'osVersion',
            'browserName',
            'browserVersion (major)',
        ])}

        This machine sent the following parameters:

        ${errTemplate_1.fmt.meta(params)}

        https://on.cypress.io/parallel-group-params-mismatch`;
    },
    CLOUD_RUN_GROUP_NAME_NOT_UNIQUE: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        You passed the ${errTemplate_1.fmt.flag(`--group`)} flag, but this group name has already been used for this run.

        The existing run is: ${errTemplate_1.fmt.url(arg1.runUrl)}

        ${errTemplate_1.fmt.listFlags(arg1, {
            group: '--group',
            parallel: '--parallel',
            ciBuildId: '--ciBuildId',
        })}

        If you are trying to parallelize this run, then also pass the ${errTemplate_1.fmt.flag(`--parallel`)} flag, else pass a different group name.

        ${(0, exports.warnIfExplicitCiBuildId)(arg1.ciBuildId)}

        https://on.cypress.io/run-group-name-not-unique`;
    },
    CLOUD_AUTO_CANCEL_NOT_AVAILABLE_IN_PLAN: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
      ${errTemplate_1.fmt.highlightSecondary(`Auto Cancellation`)} is not included under your current billing plan.

      To enable this service, please visit your billing and upgrade to another plan with Auto Cancellation.

      ${errTemplate_1.fmt.off(arg1.link)}`;
    },
    CLOUD_AUTO_CANCEL_MISMATCH: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        You passed the ${errTemplate_1.fmt.flag(`--auto-cancel-after-failures`)} flag, but this run originally started with a different value for the ${errTemplate_1.fmt.flag(`--auto-cancel-after-failures`)} flag.

        The existing run is: ${errTemplate_1.fmt.url(arg1.runUrl)}

        ${errTemplate_1.fmt.listFlags(arg1, {
            tags: '--tag',
            group: '--group',
            parallel: '--parallel',
            ciBuildId: '--ciBuildId',
            autoCancelAfterFailures: '--auto-cancel-after-failures',
        })}

        The first setting of --auto-cancel-after-failures for any given run takes precedent.

        https://on.cypress.io/auto-cancellation-mismatch`;
    },
    DEPRECATED_BEFORE_BROWSER_LAUNCH_ARGS: () => {
        return (0, errTemplate_1.errTemplate) `\
      Deprecation Warning: The ${errTemplate_1.fmt.highlight(`before:browser:launch`)} plugin event changed its signature in ${errTemplate_1.fmt.cypressVersion(`4.0.0`)}

      The event switched from yielding the second argument as an ${errTemplate_1.fmt.highlightSecondary(`array`)} of browser arguments to an options ${errTemplate_1.fmt.highlightSecondary(`object`)} with an ${errTemplate_1.fmt.highlightSecondary(`args`)} property.

      We've detected that your code is still using the previous, deprecated interface signature.

      This code will not work in a future version of Cypress. Please see the upgrade guide: https://on.cypress.io/deprecated-before-browser-launch-args`;
    },
    DUPLICATE_TASK_KEY: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
      Warning: Multiple attempts to register the following task(s):

      ${errTemplate_1.fmt.listItems(arg1, { color: 'yellow' })}

      Only the last attempt will be registered.`;
    },
    INDETERMINATE_CI_BUILD_ID: (arg1, arg2) => {
        return (0, errTemplate_1.errTemplate) `\
        You passed the ${errTemplate_1.fmt.flag(`--group`)} or ${errTemplate_1.fmt.flag(`--parallel`)} flag but we could not automatically determine or generate a ciBuildId.

        ${errTemplate_1.fmt.listFlags(arg1, {
            group: '--group',
            parallel: '--parallel',
        })}

        In order to use either of these features a ciBuildId must be determined.

        The ciBuildId is automatically detected if you are running Cypress in any of the these CI providers:

        ${errTemplate_1.fmt.listItems(arg2)}

        Because the ciBuildId could not be auto-detected you must pass the --ci-build-id flag manually.

        https://on.cypress.io/indeterminate-ci-build-id`;
    },
    RECORD_PARAMS_WITHOUT_RECORDING: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        You passed the ${errTemplate_1.fmt.flag(`--ci-build-id`)}, ${errTemplate_1.fmt.flag(`--group`)}, ${errTemplate_1.fmt.flag(`--tag`)}, ${errTemplate_1.fmt.flag(`--parallel`)}, or ${errTemplate_1.fmt.flag(`--auto-cancel-after-failures`)} flag without also passing the ${errTemplate_1.fmt.flag(`--record`)} flag.

        ${errTemplate_1.fmt.listFlags(arg1, {
            ciBuildId: '--ci-build-id',
            tags: '--tag',
            group: '--group',
            parallel: '--parallel',
            autoCancelAfterFailures: '--auto-cancel-after-failures',
        })}

        These flags can only be used when recording to Cypress Cloud.

        https://on.cypress.io/record-params-without-recording`;
    },
    INCORRECT_CI_BUILD_ID_USAGE: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        You passed the ${errTemplate_1.fmt.flag(`--ci-build-id`)} flag but did not provide either a ${errTemplate_1.fmt.flag(`--group`)} or ${errTemplate_1.fmt.flag(`--parallel`)} flag.

        ${errTemplate_1.fmt.listFlags(arg1, {
            ciBuildId: '--ci-build-id',
        })}

        The --ci-build-id flag is used to either group or parallelize multiple runs together.

        https://on.cypress.io/incorrect-ci-build-id-usage`;
        /* eslint-enable indent */
    },
    RECORD_KEY_MISSING: () => {
        return (0, errTemplate_1.errTemplate) `\
        You passed the ${errTemplate_1.fmt.flag(`--record`)} flag but did not provide us your Record Key.

        You can pass us your Record Key like this:

          ${errTemplate_1.fmt.terminal(`cypress run --record --key <record_key>`)}

        You can also set the key as an environment variable with the name: ${errTemplate_1.fmt.highlightSecondary(`CYPRESS_RECORD_KEY`)}

        https://on.cypress.io/how-do-i-record-runs`;
    },
    // TODO: make this relative path, not absolute
    CANNOT_RECORD_NO_PROJECT_ID: (configFilePath) => {
        return (0, errTemplate_1.errTemplate) `\
        You passed the ${errTemplate_1.fmt.flag(`--record`)} flag but this project has not been setup to record.

        This project is missing the ${errTemplate_1.fmt.highlight(`projectId`)} inside of: ${errTemplate_1.fmt.path(configFilePath)}

        We cannot uniquely identify this project without this id.

        You need to setup this project to record. This will generate a unique projectId.

        Alternatively if you omit the ${errTemplate_1.fmt.flag(`--record`)} flag this project will run without recording.

        https://on.cypress.io/recording-project-runs`;
    },
    PROJECT_ID_AND_KEY_BUT_MISSING_RECORD_OPTION: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        This project has been configured to record runs on our Cypress Cloud.

        It currently has the projectId: ${errTemplate_1.fmt.highlight(arg1)}

        You also provided your Record Key, but you did not pass the ${errTemplate_1.fmt.flag(`--record`)} flag.

        This run will not be recorded.

        If you meant to have this run recorded please additionally pass this flag:

          ${errTemplate_1.fmt.terminal('cypress run --record')}

        If you don't want to record these runs, you can silence this warning:

          ${errTemplate_1.fmt.terminal('cypress run --record false')}

        https://on.cypress.io/recording-project-runs`;
    },
    CLOUD_INVALID_RUN_REQUEST: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        Recording this run failed. The request was invalid.

        ${errTemplate_1.fmt.highlight(arg1.message)}

        Errors:

        ${errTemplate_1.fmt.meta(arg1.errors)}

        Request Sent:

        ${errTemplate_1.fmt.meta(arg1.object)}`;
    },
    RECORDING_FROM_FORK_PR: () => {
        return (0, errTemplate_1.errTemplate) `\
        Warning: It looks like you are trying to record this run from a forked PR.

        The ${errTemplate_1.fmt.highlight(`Record Key`)} is missing. Your CI provider is likely not passing private environment variables to builds from forks.

        These results will not be recorded.

        This error will not affect or change the exit code.`;
    },
    CLOUD_CANNOT_UPLOAD_ARTIFACTS: (apiErr) => {
        return (0, errTemplate_1.errTemplate) `\
        Warning: We encountered an error while uploading screenshots & videos from your run.

        These results will not be recorded.

        This error will not affect or change the exit code.

        ${errTemplate_1.fmt.highlightSecondary(apiErr)}`;
    },
    CLOUD_CANNOT_UPLOAD_ARTIFACTS_PROTOCOL: (apiErr) => {
        return (0, errTemplate_1.errTemplate) `\
        Warning: We encountered an error while confirming the upload of artifacts.

        These results will not display artifacts.

        This error will not affect or change the exit code.

        ${errTemplate_1.fmt.highlightSecondary(apiErr)}`;
    },
    CLOUD_CANNOT_CREATE_RUN_OR_INSTANCE: (apiErr) => {
        return (0, errTemplate_1.errTemplate) `\
        Warning: We encountered an error communicating with our servers.

        This run will proceed, but will not be recorded.

        This error will not affect or change the exit code.

        ${errTemplate_1.fmt.highlightSecondary(apiErr)}`;
    },
    CLOUD_RECORD_KEY_NOT_VALID: (recordKey, projectId) => {
        return (0, errTemplate_1.errTemplate) `\
        Your Record Key ${errTemplate_1.fmt.highlight(recordKey)} is not valid with this projectId: ${errTemplate_1.fmt.highlightSecondary(projectId)}

        It may have been recently revoked by you or another user.

        Please log into Cypress Cloud to see the valid Record Keys.

        https://on.cypress.io/dashboard/projects/${errTemplate_1.fmt.off(projectId)}`;
    },
    CLOUD_PROJECT_NOT_FOUND: (projectId, configFileBaseName) => {
        return (0, errTemplate_1.errTemplate) `\
        We could not find a Cypress Cloud project with the projectId: ${errTemplate_1.fmt.highlight(projectId)}

        This ${errTemplate_1.fmt.highlightSecondary(`projectId`)} came from your ${errTemplate_1.fmt.path(configFileBaseName)} file or an environment variable.

        Please log into Cypress Cloud and find your project.

        We will list the correct projectId in the 'Settings' tab.

        Alternatively, you can create a new project directly from within the Cypress app.

        https://on.cypress.io/cloud`;
    },
    // TODO: make this relative path, not absolute
    NO_PROJECT_ID: (configFilePath) => {
        return (0, errTemplate_1.errTemplate) `Can't find ${errTemplate_1.fmt.highlight(`projectId`)} in the config file: ${errTemplate_1.fmt.path(configFilePath || '')}`;
    },
    NO_PROJECT_FOUND_AT_PROJECT_ROOT: (projectRoot) => {
        return (0, errTemplate_1.errTemplate) `Can't find a project at the path: ${errTemplate_1.fmt.path(projectRoot)}`;
    },
    CANNOT_FETCH_PROJECT_TOKEN: () => {
        return (0, errTemplate_1.errTemplate) `Can't find project's secret key.`;
    },
    CANNOT_CREATE_PROJECT_TOKEN: () => {
        return (0, errTemplate_1.errTemplate) `Can't create project's secret key.`;
    },
    PORT_IN_USE_SHORT: (arg1) => {
        return (0, errTemplate_1.errTemplate) `Port ${errTemplate_1.fmt.highlight(arg1)} is already in use.`;
    },
    PORT_IN_USE_LONG: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
      Can't run project because port is currently in use: ${errTemplate_1.fmt.highlight(arg1)}

      Assign a different port with the ${errTemplate_1.fmt.flag(`--port <port>`)} argument or shut down the other running process.`;
    },
    ERROR_READING_FILE: (filePath, err) => {
        return (0, errTemplate_1.errTemplate) `\
        Error reading from: ${errTemplate_1.fmt.path(filePath)}

        ${errTemplate_1.fmt.stackTrace(err)}`;
    },
    ERROR_WRITING_FILE: (filePath, err) => {
        return (0, errTemplate_1.errTemplate) `\
        Error writing to: ${errTemplate_1.fmt.path(filePath)}

        ${errTemplate_1.fmt.stackTrace(err)}`;
    },
    NO_SPECS_FOUND: (folderPath, globPattern) => {
        // no glob provided, searched all specs
        if (!globPattern) {
            return (0, errTemplate_1.errTemplate) `\
          Can't run because ${errTemplate_1.fmt.highlightSecondary(`no spec files`)} were found.

          We searched for specs inside of this folder:

          ${errTemplate_1.fmt.listItem(folderPath)}`;
        }
        const globPaths = lodash_1.default.castArray(globPattern).map((pattern) => {
            const [resolvedBasePath, resolvedPattern] = (0, errorUtils_1.parseResolvedPattern)(folderPath, pattern);
            return path_1.default.join(resolvedBasePath, errTemplate_1.theme.yellow(resolvedPattern));
        });
        const phrase = globPaths.length > 1 ? 'these glob patterns' : 'this glob pattern';
        return (0, errTemplate_1.errTemplate) `\
        Can't run because ${errTemplate_1.fmt.highlightSecondary(`no spec files`)} were found.

        We searched for specs matching ${errTemplate_1.fmt.off(phrase)}:

        ${errTemplate_1.fmt.listItems(globPaths, { color: 'blue', prefix: '  > ' })}`;
    },
    RENDERER_CRASHED: (browserName) => {
        return (0, errTemplate_1.errTemplate) `\
        We detected that the ${errTemplate_1.fmt.highlight(browserName)} Renderer process just crashed.

        We have failed the current spec but will continue running the next spec.

        This can happen for a number of different reasons.

        If you're running lots of tests on a memory intense application.
          - Try increasing the CPU/memory on the machine you're running on.
          - Try enabling ${errTemplate_1.fmt.highlight('experimentalMemoryManagement')} in your config file.
          - Try lowering ${errTemplate_1.fmt.highlight('numTestsKeptInMemory')} in your config file during 'cypress open'.

        You can learn more here:

        https://on.cypress.io/renderer-process-crashed`;
    },
    BROWSER_CRASHED: (browserName, code, signal) => {
        return (0, errTemplate_1.errTemplate) `\
        We detected that the ${errTemplate_1.fmt.highlight(browserName)} process just crashed with code '${errTemplate_1.fmt.highlight(code)}' and signal '${errTemplate_1.fmt.highlight(signal)}'.

        We have failed the current spec but will continue running the next spec.

        This can happen for many different reasons:

        - You wrote an endless loop and you must fix your own code
        - You are running lots of tests on a memory intense application
        - You are running in a memory starved VM environment
        - There are problems with your GPU / GPU drivers
        - There are browser bugs`;
    },
    AUTOMATION_SERVER_DISCONNECTED: () => {
        return (0, errTemplate_1.errTemplate) `The automation client disconnected. Cannot continue running tests.`;
    },
    SUPPORT_FILE_NOT_FOUND: (supportFilePath) => {
        return (0, errTemplate_1.errTemplate) `\
        Your ${errTemplate_1.fmt.highlight(`supportFile`)} is missing or invalid: ${errTemplate_1.fmt.path(supportFilePath)}

        The supportFile must be a .js, .ts, .coffee file or be supported by your preprocessor plugin (if configured).

        Fix your support file, or set supportFile to ${errTemplate_1.fmt.highlightSecondary(`false`)} if a support file is not necessary for your project.

        If you have just renamed the extension of your supportFile, restart Cypress.

        https://on.cypress.io/support-file-missing-or-invalid`;
    },
    DEFAULT_SUPPORT_FILE_NOT_FOUND: (supportFilePath) => {
        return (0, errTemplate_1.errTemplate) `\
        Your project does not contain a default ${errTemplate_1.fmt.highlight(`supportFile`)}. We expect a file matching ${errTemplate_1.fmt.path(supportFilePath)} to exist.

        If a support file is not necessary for your project, set ${errTemplate_1.fmt.highlight(`supportFile`)} to ${errTemplate_1.fmt.highlightSecondary(`false`)}.

        https://on.cypress.io/support-file-missing-or-invalid`;
    },
    // TODO: make this relative path, not absolute
    CONFIG_FILE_REQUIRE_ERROR: (configFilePath, err) => {
        return (0, errTemplate_1.errTemplate) `\
        Your ${errTemplate_1.fmt.highlight(`configFile`)} is invalid: ${errTemplate_1.fmt.path(configFilePath)}

        It threw an error when required, check the stack trace below:

        ${errTemplate_1.fmt.stackTrace(err)}
      `;
    },
    // TODO: make this relative path, not absolute
    SETUP_NODE_EVENTS_IS_NOT_FUNCTION: (configFilePath, testingType, exported) => {
        const code = (0, errTemplate_1.errPartial) `
      {
        ${errTemplate_1.fmt.off(testingType)}: {
          setupNodeEvents(on, config) {
            ${errTemplate_1.fmt.comment(`// configure tasks and plugins here`)}
          }
        }
      }`;
        return (0, errTemplate_1.errTemplate) `\
      Your ${errTemplate_1.fmt.highlight(`configFile`)} is invalid: ${errTemplate_1.fmt.path(configFilePath)}

      The ${errTemplate_1.fmt.highlightSecondary(`${testingType}.setupNodeEvents()`)} function must be defined with the following signature:

      ${errTemplate_1.fmt.code(code)}

      Instead we saw:

      ${errTemplate_1.fmt.stringify(exported)}

      https://on.cypress.io/plugins-api
    `;
    },
    CONFIG_FILE_SETUP_NODE_EVENTS_ERROR: (configFilePath, testingType, err) => {
        return (0, errTemplate_1.errTemplate) `
      Your ${errTemplate_1.fmt.highlightSecondary(`configFile`)} threw an error from: ${errTemplate_1.fmt.path(configFilePath)}

      The error was thrown while executing your ${errTemplate_1.fmt.highlight(`${testingType}.setupNodeEvents()`)} function:

      ${errTemplate_1.fmt.stackTrace(err)}
    `;
    },
    CONFIG_FILE_UNEXPECTED_ERROR: (configFilePath, err) => {
        return (0, errTemplate_1.errTemplate) `
      Your ${errTemplate_1.fmt.highlight(`configFile`)} threw an error from: ${errTemplate_1.fmt.path(configFilePath)}

      We stopped running your tests because your config file crashed.

      ${errTemplate_1.fmt.stackTrace(err)}
    `;
    },
    // TODO: make this relative path, not absolute
    SETUP_NODE_EVENTS_INVALID_EVENT_NAME_ERROR: (configFilePath, invalidEventName, validEventNames, err) => {
        return (0, errTemplate_1.errTemplate) `
      Your ${errTemplate_1.fmt.highlightSecondary(`configFile`)} threw a validation error from: ${errTemplate_1.fmt.path(configFilePath)}

      You must pass a valid event name when registering a plugin.

      You passed: ${errTemplate_1.fmt.highlight(invalidEventName)}

      The following are valid events:

      ${errTemplate_1.fmt.listItems(validEventNames)}

      Learn more at https://docs.cypress.io/api/plugins/writing-a-plugin#config

      ${errTemplate_1.fmt.stackTrace(err)}
    `;
    },
    BUNDLE_ERROR: (filePath, arg2) => {
        // IF YOU MODIFY THIS MAKE SURE TO UPDATE
        // THE ERROR MESSAGE IN THE RUNNER TOO
        return (0, errTemplate_1.errTemplate) `\
      Oops...we found an error preparing this test file:

      ${errTemplate_1.fmt.listItem(filePath)}

      The error was:

      ${errTemplate_1.fmt.highlight(arg2)}

      This occurred while Cypress was compiling and bundling your test code. This is usually caused by:

      - A missing file or dependency
      - A syntax error in the file or one of its dependencies

      Fix the error in your code and re-run your tests.`;
    },
    // happens when there is an error in configuration file like "cypress.json"
    // TODO: make this relative path, not absolute
    CONFIG_VALIDATION_MSG_ERROR: (fileType, fileName, validationMsg) => {
        if (!fileType) {
            return (0, errTemplate_1.errTemplate) `
        An invalid configuration value was set:

        ${errTemplate_1.fmt.highlight(validationMsg)}`;
        }
        return (0, errTemplate_1.errTemplate) `
      Your ${errTemplate_1.fmt.highlight(fileType)} as ${errTemplate_1.fmt.path(fileName)} set an invalid value:

      ${errTemplate_1.fmt.highlight(validationMsg)}`;
    },
    // TODO: make this relative path, not absolute
    CONFIG_VALIDATION_ERROR: (fileType, filePath, validationResult) => {
        const { key, type, value, list } = validationResult;
        if (!fileType) {
            return (0, errTemplate_1.errTemplate) `\
        An invalid configuration value was set.

        Expected ${errTemplate_1.fmt.highlight(key)} to be ${errTemplate_1.fmt.off(type)}.

        Instead the value was: ${errTemplate_1.fmt.stringify(value)}`;
        }
        if (list) {
            return (0, errTemplate_1.errTemplate) `\
        Your ${errTemplate_1.fmt.highlight(fileType)} at ${errTemplate_1.fmt.path(filePath)} set an invalid value:

        The error occurred while validating the ${errTemplate_1.fmt.highlightSecondary(list)} list.

        Expected ${errTemplate_1.fmt.highlight(key)} to be ${errTemplate_1.fmt.off(type)}.

        Instead the value was: ${errTemplate_1.fmt.stringify(value)}`;
        }
        return (0, errTemplate_1.errTemplate) `\
      Your ${errTemplate_1.fmt.highlight(fileType)} at ${errTemplate_1.fmt.path(filePath)} set an invalid value:

      Expected ${errTemplate_1.fmt.highlight(key)} to be ${errTemplate_1.fmt.off(type)}.

      Instead the value was: ${errTemplate_1.fmt.stringify(value)}`;
    },
    RENAMED_CONFIG_OPTION: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        The ${errTemplate_1.fmt.highlight(arg1.name)} configuration option you have supplied has been renamed.

        Please rename ${errTemplate_1.fmt.highlight(arg1.name)} to ${errTemplate_1.fmt.highlightSecondary(arg1.newName)}`;
    },
    CANNOT_CONNECT_BASE_URL: () => {
        return (0, errTemplate_1.errTemplate) `\
        Cypress failed to verify that your server is running.

        Please start this server and then run Cypress again.`;
    },
    CANNOT_CONNECT_BASE_URL_WARNING: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        Cypress could not verify that this server is running:

        ${errTemplate_1.fmt.listItem(arg1)}

        This server has been configured as your ${errTemplate_1.fmt.highlight(`baseUrl`)}, and tests will likely fail if it is not running.`;
    },
    // TODO: test this
    CANNOT_CONNECT_BASE_URL_RETRYING: (arg1) => {
        switch (arg1.attempt) {
            case 1:
                return (0, errTemplate_1.errTemplate) `\
            Cypress could not verify that this server is running:

            ${errTemplate_1.fmt.listItem(arg1.baseUrl)}

            We are verifying this server because it has been configured as your ${errTemplate_1.fmt.highlight(`baseUrl`)}.

            Cypress automatically waits until your server is accessible before running tests.

            ${displayRetriesRemaining(arg1.remaining)}`;
            default:
                return (0, errTemplate_1.errTemplate) `${displayRetriesRemaining(arg1.remaining)}`;
        }
    },
    // TODO: test this
    INVALID_REPORTER_NAME: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        Error loading the reporter: ${errTemplate_1.fmt.highlight(arg1.name)}

        We searched for the reporter in these paths:

        ${errTemplate_1.fmt.listItems(arg1.paths)}

        Learn more at https://on.cypress.io/reporters

        ${errTemplate_1.fmt.stackTrace(arg1.error)}
        `;
    },
    // TODO: manually test this
    NO_DEFAULT_CONFIG_FILE_FOUND: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        Could not find a Cypress configuration file in this folder: ${errTemplate_1.fmt.path(arg1)}`;
    },
    CONFIG_FILES_LANGUAGE_CONFLICT: (projectRoot, filesFound) => {
        return (0, errTemplate_1.errTemplate) `
      Could not load a Cypress configuration file because there are multiple matches.

      We've found ${errTemplate_1.fmt.highlight(filesFound.length)} Cypress configuration files named
      ${errTemplate_1.fmt.highlight(filesFound.join(', '))} at the location below:

      ${errTemplate_1.fmt.listItem(projectRoot)}

      Please delete the conflicting configuration files.
      `;
    },
    CONFIG_FILE_NOT_FOUND: (configFileBaseName, projectRoot) => {
        return (0, errTemplate_1.errTemplate) `\
        Could not find a Cypress configuration file.

        We looked but did not find a ${errTemplate_1.fmt.highlight(configFileBaseName)} file in this folder: ${errTemplate_1.fmt.path(projectRoot)}`;
    },
    INVOKED_BINARY_OUTSIDE_NPM_MODULE: () => {
        return (0, errTemplate_1.errTemplate) `\
        It looks like you are running the Cypress binary directly.

        This is not the recommended approach, and Cypress may not work correctly.

        Please install the ${errTemplate_1.fmt.highlight(`cypress`)} NPM package and follow the instructions here:

        https://on.cypress.io/installing-cypress`;
    },
    FREE_PLAN_EXCEEDS_MONTHLY_PRIVATE_TESTS: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        You've exceeded the limit of private test results under your free plan this month. ${getUsedTestsMessage(arg1.limit, arg1.usedTestsMessage)}

        To continue recording tests this month you must upgrade your account. Please visit your billing to upgrade to another billing plan.

        ${errTemplate_1.fmt.off(arg1.link)}`;
    },
    FREE_PLAN_IN_GRACE_PERIOD_EXCEEDS_MONTHLY_PRIVATE_TESTS: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        You've exceeded the limit of private test results under your free plan this month. ${getUsedTestsMessage(arg1.limit, arg1.usedTestsMessage)}

        Your plan is now in a grace period, which means your tests will still be recorded until ${errTemplate_1.fmt.off(arg1.gracePeriodMessage)}. Please upgrade your plan to continue recording tests on Cypress Cloud in the future.

        ${errTemplate_1.fmt.off(arg1.link)}`;
    },
    PAID_PLAN_EXCEEDS_MONTHLY_PRIVATE_TESTS: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        You've exceeded the limit of private test results under your current billing plan this month. ${getUsedTestsMessage(arg1.limit, arg1.usedTestsMessage)}

        To upgrade your account, please visit your billing to upgrade to another billing plan.

        ${errTemplate_1.fmt.off(arg1.link)}`;
    },
    FREE_PLAN_EXCEEDS_MONTHLY_TESTS: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        You've exceeded the limit of test results under your free plan this month. ${getUsedTestsMessage(arg1.limit, arg1.usedTestsMessage)}

        To continue recording tests this month you must upgrade your account. Please visit your billing to upgrade to another billing plan.

        ${errTemplate_1.fmt.off(arg1.link)}`;
    },
    FREE_PLAN_IN_GRACE_PERIOD_EXCEEDS_MONTHLY_TESTS: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        You've exceeded the limit of test results under your free plan this month. ${getUsedTestsMessage(arg1.limit, arg1.usedTestsMessage)}

        Your plan is now in a grace period, which means you will have the full benefits of your current plan until ${errTemplate_1.fmt.highlight(arg1.gracePeriodMessage)}.

        Please visit your billing to upgrade your plan.

        ${errTemplate_1.fmt.off(arg1.link)}`;
    },
    PLAN_EXCEEDS_MONTHLY_TESTS: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        You've exceeded the limit of test results under your ${errTemplate_1.fmt.highlight(arg1.planType)} billing plan this month. ${getUsedTestsMessage(arg1.limit, arg1.usedTestsMessage)}

        To continue getting the full benefits of your current plan, please visit your billing to upgrade.

        ${errTemplate_1.fmt.off(arg1.link)}`;
    },
    FREE_PLAN_IN_GRACE_PERIOD_PARALLEL_FEATURE: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        ${errTemplate_1.fmt.highlightSecondary(`Parallelization`)} is not included under your free plan.

        Your plan is now in a grace period, which means your tests will still run in parallel until ${errTemplate_1.fmt.highlight(arg1.gracePeriodMessage)}. Please upgrade your plan to continue running your tests in parallel in the future.

        ${errTemplate_1.fmt.off(arg1.link)}`;
    },
    PARALLEL_FEATURE_NOT_AVAILABLE_IN_PLAN: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        ${errTemplate_1.fmt.highlightSecondary(`Parallelization`)} is not included under your current billing plan.

        To run your tests in parallel, please visit your billing and upgrade to another plan with parallelization.

        ${errTemplate_1.fmt.off(arg1.link)}`;
    },
    PLAN_IN_GRACE_PERIOD_RUN_GROUPING_FEATURE_USED: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        ${errTemplate_1.fmt.highlightSecondary(`Grouping`)} is not included under your free plan.

        Your plan is now in a grace period, which means your tests will still run with groups until ${errTemplate_1.fmt.highlight(arg1.gracePeriodMessage)}. Please upgrade your plan to continue running your tests with groups in the future.

        ${errTemplate_1.fmt.off(arg1.link)}`;
    },
    RUN_GROUPING_FEATURE_NOT_AVAILABLE_IN_PLAN: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        ${errTemplate_1.fmt.highlightSecondary(`Grouping`)} is not included under your current billing plan.

        To run your tests with groups, please visit your billing and upgrade to another plan with grouping.

        ${errTemplate_1.fmt.off(arg1.link)}`;
    },
    // TODO: fix
    FIXTURE_NOT_FOUND: (arg1, arg2) => {
        return (0, errTemplate_1.errTemplate) `\
        A fixture file could not be found at any of the following paths:

          ${errTemplate_1.fmt.listItem(arg1)}
          ${errTemplate_1.fmt.listItem(arg1)}.[ext]

        Cypress looked for these file extensions at the provided path:

          ${errTemplate_1.fmt.listItem(arg2.join(', '))}

        Provide a path to an existing fixture file.`;
    },
    BAD_POLICY_WARNING: (policyKeys) => {
        return (0, errTemplate_1.errTemplate) `\
        Cypress detected policy settings on your computer that may cause issues.

        The following policies were detected that may prevent Cypress from automating Chrome:

        ${errTemplate_1.fmt.listItems(policyKeys)}

        For more information, see https://on.cypress.io/bad-browser-policy`;
    },
    BAD_POLICY_WARNING_TOOLTIP: () => {
        return (0, errTemplate_1.errTemplate) `Cypress detected policy settings on your computer that may cause issues with using this browser. For more information, see https://on.cypress.io/bad-browser-policy`;
    },
    EXTENSION_NOT_LOADED: (browserName, extensionPath) => {
        return (0, errTemplate_1.errTemplate) `\
        ${errTemplate_1.fmt.off(browserName)} could not install the extension at path: ${errTemplate_1.fmt.path(extensionPath)}

        Please verify that this is the path to a valid, unpacked WebExtension.`;
    },
    INVALID_CYPRESS_INTERNAL_ENV: (val) => {
        return (0, errTemplate_1.errTemplate) `\
        We have detected an unknown or unsupported ${errTemplate_1.fmt.highlightSecondary(`CYPRESS_INTERNAL_ENV`)} value: ${errTemplate_1.fmt.highlight(val)}

        CYPRESS_INTERNAL_ENV is reserved for internal use and cannot be modified.`;
    },
    CDP_VERSION_TOO_OLD: (minimumVersion, currentVersion) => {
        const phrase = currentVersion.major !== 0
            ? errTemplate_1.fmt.highlight(`${currentVersion.major}.${currentVersion.minor}`)
            : errTemplate_1.fmt.off('an older version');
        return (0, errTemplate_1.errTemplate) `A minimum CDP version of ${errTemplate_1.fmt.highlight(minimumVersion)} is required, but the current browser has ${phrase}.`;
    },
    CDP_COULD_NOT_CONNECT: (browserName, port, err) => {
        // we include a stack trace here because it may contain useful information
        // to debug since this is an "uncontrolled" error even though it doesn't
        // come from a user
        return (0, errTemplate_1.errTemplate) `\
        Cypress failed to make a connection to the Chrome DevTools Protocol after retrying for 50 seconds.

        This usually indicates there was a problem opening the ${errTemplate_1.fmt.off(lodash_1.default.capitalize(browserName))} browser.

        The CDP port requested was ${errTemplate_1.fmt.highlight(port)}.

        ${errTemplate_1.fmt.stackTrace(err)}`;
    },
    FIREFOX_COULD_NOT_CONNECT: (arg1) => {
        // we include a stack trace here because it may contain useful information
        // to debug since this is an "uncontrolled" error even though it doesn't
        // come from a user
        return (0, errTemplate_1.errTemplate) `\
        Cypress failed to make a connection to Firefox.

        This usually indicates there was a problem opening the Firefox browser.

        ${errTemplate_1.fmt.stackTrace(arg1)}`;
    },
    CDP_COULD_NOT_RECONNECT: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        There was an error reconnecting to the Chrome DevTools protocol. Please restart the browser.

        ${errTemplate_1.fmt.stackTrace(arg1)}`;
    },
    CDP_RETRYING_CONNECTION: (attempt, browserName, connectRetryThreshold) => {
        return (0, errTemplate_1.errTemplate) `Still waiting to connect to ${errTemplate_1.fmt.off(lodash_1.default.capitalize(browserName))}, retrying in 1 second ${errTemplate_1.fmt.meta(`(attempt ${attempt}/${connectRetryThreshold})`)}`;
    },
    BROWSER_PROCESS_CLOSED_UNEXPECTEDLY: (browserName) => {
        return (0, errTemplate_1.errTemplate) `\
      We detected that the ${errTemplate_1.fmt.highlight(browserName)} browser process closed unexpectedly.

      We have failed the current spec and aborted the run.`;
    },
    BROWSER_PAGE_CLOSED_UNEXPECTEDLY: (browserName) => {
        return (0, errTemplate_1.errTemplate) `\
      We detected that the ${errTemplate_1.fmt.highlight(browserName)} tab running Cypress tests closed unexpectedly.

      We have failed the current spec and aborted the run.`;
    },
    UNEXPECTED_BEFORE_BROWSER_LAUNCH_PROPERTIES: (arg1, arg2) => {
        return (0, errTemplate_1.errTemplate) `\
        The ${errTemplate_1.fmt.highlight('launchOptions')} object returned by your plugin's ${errTemplate_1.fmt.highlightSecondary(`before:browser:launch`)} handler contained unexpected properties:

        ${errTemplate_1.fmt.listItems(arg1)}

        launchOptions may only contain the properties:

        ${errTemplate_1.fmt.listItems(arg2)}

        https://on.cypress.io/browser-launch-api`;
    },
    // TODO: test this
    COULD_NOT_PARSE_ARGUMENTS: (argName, argValue, errMsg) => {
        return (0, errTemplate_1.errTemplate) `\
        Cypress encountered an error while parsing the argument: ${errTemplate_1.fmt.highlight(`--${argName}`)}

        You passed: ${errTemplate_1.fmt.highlightTertiary(argValue)}

        The error was: ${errTemplate_1.fmt.highlightSecondary(errMsg)}`;
    },
    FIREFOX_MARIONETTE_FAILURE: (origin, err) => {
        return (0, errTemplate_1.errTemplate) `\
        Cypress could not connect to Firefox.

        An unexpected error was received from Marionette: ${errTemplate_1.fmt.highlightSecondary(origin)}

        To avoid this error, ensure that there are no other instances of Firefox launched by Cypress running.

        ${errTemplate_1.fmt.stackTrace(err)}`;
    },
    FOLDER_NOT_WRITABLE: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        This folder is not writable: ${errTemplate_1.fmt.path(arg1)}

        Writing to this directory is required by Cypress in order to store screenshots and videos.

        Enable write permissions to this directory to ensure screenshots and videos are stored.

        If you don't require screenshots or videos to be stored you can safely ignore this warning.`;
    },
    EXPERIMENTAL_SAMESITE_REMOVED: () => {
        return (0, errTemplate_1.errTemplate) `\
        The ${errTemplate_1.fmt.highlight(`experimentalGetCookiesSameSite`)} configuration option was removed in ${errTemplate_1.fmt.cypressVersion(`5.0.0`)}.

        Returning the ${errTemplate_1.fmt.highlightSecondary(`sameSite`)} property is now the default behavior of the ${errTemplate_1.fmt.highlightSecondary(`cy.cookie`)} commands.

        You can safely remove this option from your config.`;
    },
    // TODO: verify configFile is absolute path
    // TODO: make this relative path, not absolute
    EXPERIMENTAL_COMPONENT_TESTING_REMOVED: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
        The ${errTemplate_1.fmt.highlight('experimentalComponentTesting')} configuration option was removed in ${errTemplate_1.fmt.cypressVersion(`7.0.0`)}.

        Please remove this flag from: ${errTemplate_1.fmt.path(arg1.configFile)}

        Component Testing is now a standalone command. You can now run your component tests with:

          ${errTemplate_1.fmt.terminal(`cypress open-ct`)}

        https://on.cypress.io/migration-guide`;
    },
    EXPERIMENTAL_SESSION_SUPPORT_REMOVED: () => {
        return (0, errTemplate_1.errTemplate) `\
        The ${errTemplate_1.fmt.highlight(`experimentalSessionSupport`)} configuration option was removed in ${errTemplate_1.fmt.cypressVersion(`9.6.0`)}.

        You can safely remove this option from your config.

        https://on.cypress.io/session`;
    },
    EXPERIMENTAL_SESSION_AND_ORIGIN_REMOVED: () => {
        return (0, errTemplate_1.errTemplate) `\
        The ${errTemplate_1.fmt.highlight(`experimentalSessionAndOrigin`)} configuration option was removed in ${errTemplate_1.fmt.cypressVersion(`12.0.0`)}.

        You can safely remove this option from your config.

        https://on.cypress.io/session
        https://on.cypress.io/origin`;
    },
    EXPERIMENTAL_SHADOW_DOM_REMOVED: () => {
        return (0, errTemplate_1.errTemplate) `\
        The ${errTemplate_1.fmt.highlight(`experimentalShadowDomSupport`)} configuration option was removed in ${errTemplate_1.fmt.cypressVersion(`5.2.0`)}. It is no longer necessary when utilizing the ${errTemplate_1.fmt.highlightSecondary(`includeShadowDom`)} option.

        You can safely remove this option from your config.`;
    },
    EXPERIMENTAL_NETWORK_STUBBING_REMOVED: () => {
        return (0, errTemplate_1.errTemplate) `\
        The ${errTemplate_1.fmt.highlight(`experimentalNetworkStubbing`)} configuration option was removed in ${errTemplate_1.fmt.cypressVersion(`6.0.0`)}.

        It is no longer necessary for using ${errTemplate_1.fmt.highlightSecondary(`cy.intercept()`)}. You can safely remove this option from your config.`;
    },
    EXPERIMENTAL_RUN_EVENTS_REMOVED: () => {
        return (0, errTemplate_1.errTemplate) `\
        The ${errTemplate_1.fmt.highlight(`experimentalRunEvents`)} configuration option was removed in ${errTemplate_1.fmt.cypressVersion(`6.7.0`)}. It is no longer necessary when listening to run events in the plugins file.

        You can safely remove this option from your config.`;
    },
    EXPERIMENTAL_STUDIO_REMOVED: () => {
        return (0, errTemplate_1.errTemplate) `\
        We're ending the experimental phase of Cypress Studio in ${errTemplate_1.fmt.cypressVersion(`10.0.0`)}.

        If you don't think you can live without Studio or you'd like to learn about how to work around its removal, please join the discussion here: http://on.cypress.io/studio-removal

        Your feedback will help us factor in product decisions that may see Studio return in a future release.

        You can safely remove the ${errTemplate_1.fmt.highlight(`experimentalStudio`)} configuration option from your config.`;
    },
    EXPERIMENTAL_SINGLE_TAB_RUN_MODE: () => {
        return (0, errTemplate_1.errTemplate) `\
        The ${errTemplate_1.fmt.highlight(`experimentalSingleTabRunMode`)} experiment is currently only supported for Component Testing.

        If you have feedback about the experiment, please join the discussion here: http://on.cypress.io/single-tab-run-mode`;
    },
    EXPERIMENTAL_STUDIO_E2E_ONLY: () => {
        return (0, errTemplate_1.errTemplate) `\
        The ${errTemplate_1.fmt.highlight(`experimentalStudio`)} experiment is currently only supported for End to End Testing.

        If you have feedback about the experiment, please join the discussion here: http://on.cypress.io/studio-beta`;
    },
    EXPERIMENTAL_RUN_ALL_SPECS_E2E_ONLY: () => {
        const code = (0, errTemplate_1.errPartial) `
    {
      e2e: {
        experimentalRunAllSpecs: true
      },
    }`;
        return (0, errTemplate_1.errTemplate) `\
        The ${errTemplate_1.fmt.highlight(`experimentalRunAllSpecs`)} experiment is currently only supported for End to End Testing and must be configured as an e2e testing type property: ${errTemplate_1.fmt.highlightSecondary(`e2e.experimentalRunAllSpecs`)}.

        ${errTemplate_1.fmt.code(code)}

        If you have feedback about the experiment, please join the discussion here: http://on.cypress.io/run-all-specs`;
    },
    EXPERIMENTAL_ORIGIN_DEPENDENCIES_E2E_ONLY: () => {
        const code = (0, errTemplate_1.errPartial) `
    {
      e2e: {
        experimentalOriginDependencies: true
      },
    }`;
        return (0, errTemplate_1.errTemplate) `\
        The ${errTemplate_1.fmt.highlight(`experimentalOriginDependencies`)} experiment is currently only supported for End to End Testing and must be configured as an e2e testing type property: ${errTemplate_1.fmt.highlightSecondary(`e2e.experimentalOriginDependencies`)}.

        ${errTemplate_1.fmt.code(code)}`;
    },
    EXPERIMENTAL_USE_DEFAULT_DOCUMENT_DOMAIN_E2E_ONLY: () => {
        const code = (0, errTemplate_1.errPartial) `
    {
      e2e: {
        experimentalSkipDomainInjection: ['*.salesforce.com', '*.force.com', '*.google.com', 'google.com']
      },
    }`;
        return (0, errTemplate_1.errTemplate) `\
        The ${errTemplate_1.fmt.highlight(`experimentalSkipDomainInjection`)} experiment is currently only supported for End to End Testing and must be configured as an e2e testing type property: ${errTemplate_1.fmt.highlightSecondary(`e2e.experimentalSkipDomainInjection`)}.
        The suggested values are only a recommendation.

        ${errTemplate_1.fmt.code(code)}`;
    },
    FIREFOX_GC_INTERVAL_REMOVED: () => {
        return (0, errTemplate_1.errTemplate) `\
        The ${errTemplate_1.fmt.highlight(`firefoxGcInterval`)} configuration option was removed in ${errTemplate_1.fmt.cypressVersion(`8.0.0`)}. It was introduced to work around a bug in Firefox 79 and below.

        Since Cypress no longer supports Firefox 85 and below in Cypress ${errTemplate_1.fmt.cypressVersion(`8.0.0`)}, this option was removed.

        You can safely remove this option from your config.`;
    },
    // TODO: make this relative path, not absolute
    INCOMPATIBLE_PLUGIN_RETRIES: (arg1) => {
        return (0, errTemplate_1.errTemplate) `\
      We've detected that the incompatible plugin ${errTemplate_1.fmt.highlight(`cypress-plugin-retries`)} is installed at: ${errTemplate_1.fmt.path(arg1)}

      Test retries is now natively supported in ${errTemplate_1.fmt.cypressVersion(`5.0.0`)}.

      Remove the plugin from your dependencies to silence this warning.

      https://on.cypress.io/test-retries
      `;
    },
    // TODO: test this
    INVALID_CONFIG_OPTION: (arg1) => {
        const phrase = arg1.length > 1 ? 'options are' : 'option is';
        return (0, errTemplate_1.errTemplate) `\
        The following configuration ${errTemplate_1.fmt.off(phrase)} invalid:

        ${errTemplate_1.fmt.listItems(arg1, { color: 'yellow' })}

        https://on.cypress.io/configuration
        `;
    },
    PLUGINS_RUN_EVENT_ERROR: (arg1, arg2) => {
        return (0, errTemplate_1.errTemplate) `\
        An error was thrown in your plugins file while executing the handler for the ${errTemplate_1.fmt.highlight(arg1)} event.

        The error we received was:

        ${errTemplate_1.fmt.stackTrace(arg2)}`;
    },
    CONFIG_FILE_INVALID_DEV_START_EVENT: (pluginsFilePath) => {
        const code = (0, errTemplate_1.errPartial) `
      module.exports = (on, config) => {
        on('dev-server:start', () => {
          ${errTemplate_1.fmt.comment('// start dev server here')}
          return startDevServer(...)
        }
      }`;
        return (0, errTemplate_1.errTemplate) `\
        To run component tests, Cypress needs you to configure the ${errTemplate_1.fmt.highlight(`dev-server:start`)} event.

        Please update this file: ${errTemplate_1.fmt.path(pluginsFilePath)}

        ${errTemplate_1.fmt.code(code)}

        https://on.cypress.io/component-testing`;
    },
    UNSUPPORTED_BROWSER_VERSION: (errorMsg) => {
        return (0, errTemplate_1.errTemplate) `${errTemplate_1.fmt.off(errorMsg)}`;
    },
    // V10 Added:
    MULTIPLE_SUPPORT_FILES_FOUND: (arg1, arg2) => {
        return (0, errTemplate_1.errTemplate) `\
      There were multiple support files found matching your ${errTemplate_1.fmt.highlightSecondary(`supportFile`)} pattern.

      Your supportFile is set to: ${errTemplate_1.fmt.highlight(arg1)}

      We found the following files:

      ${errTemplate_1.fmt.listItems(arg2)}

      Please remove or combine the support files into a single file.`;
    },
    CONFIG_FILE_MIGRATION_NEEDED: (projectRoot) => {
        return (0, errTemplate_1.errTemplate) `
        There is a ${errTemplate_1.fmt.highlight(`cypress.json`)} file at the path: ${errTemplate_1.fmt.path(projectRoot)}

        ${errTemplate_1.fmt.cypressVersion('10.0.0')} no longer supports ${errTemplate_1.fmt.highlight(`cypress.json`)}.

        Please run ${errTemplate_1.fmt.highlightTertiary('cypress open')} to launch the migration tool to migrate to ${errTemplate_1.fmt.highlightSecondary('cypress.config.{js,ts,mjs,cjs}')}.

        https://on.cypress.io/migration-guide
      `;
    },
    LEGACY_CONFIG_ERROR_DURING_MIGRATION: (file, error) => {
        return (0, errTemplate_1.errTemplate) `
        Your ${errTemplate_1.fmt.highlight(file)} file threw an error. ${errTemplate_1.fmt.stackTrace(error)}

        Please ensure your pluginsFile is valid and relaunch the migration tool to migrate to ${errTemplate_1.fmt.cypressVersion('10.0.0')}.
      `;
    },
    LEGACY_CONFIG_FILE: (baseFileName, projectRoot, legacyConfigFile = 'cypress.json') => {
        return (0, errTemplate_1.errTemplate) `
      There is both a ${errTemplate_1.fmt.highlight(baseFileName)} and a ${errTemplate_1.fmt.highlight(legacyConfigFile)} file at the location below:

      ${errTemplate_1.fmt.path(projectRoot)}

      Cypress no longer supports ${errTemplate_1.fmt.off(legacyConfigFile)}, please remove it from your project.
    `;
    },
    SETUP_NODE_EVENTS_DO_NOT_SUPPORT_DEV_SERVER: (configFilePath) => {
        const code = (0, errTemplate_1.errPartial) `
      {
        component: {
          devServer (cypressDevServerConfig, devServerConfig) {
            ${errTemplate_1.fmt.comment(`// start dev server here`)}
        }
      }`;
        return (0, errTemplate_1.errTemplate) `\
      Your ${errTemplate_1.fmt.highlightSecondary(`configFile`)} is invalid: ${errTemplate_1.fmt.path(configFilePath)}

      Binding to the ${errTemplate_1.fmt.highlightSecondary(`on('dev-server:start')`)} event is no longer necessary.

      Please update your code to use the ${errTemplate_1.fmt.highlight(`component.devServer()`)} function.

      ${errTemplate_1.fmt.code(code)}

      Learn more: https://on.cypress.io/dev-server
    `;
    },
    PLUGINS_FILE_CONFIG_OPTION_REMOVED: (_errShape) => {
        const code = (0, errTemplate_1.errPartial) `
    {
      e2e: {
        setupNodeEvents()
      },
      component: {
        setupNodeEvents()
      },
    }`;
        return (0, errTemplate_1.errTemplate) `\
        The ${errTemplate_1.fmt.highlight('pluginsFile')} configuration option you have supplied has been replaced with ${errTemplate_1.fmt.highlightSecondary('setupNodeEvents')}.

        This new option is not a one-to-one correlation and it must be configured separately as a testing type property: ${errTemplate_1.fmt.highlightSecondary('e2e.setupNodeEvents')} and ${errTemplate_1.fmt.highlightSecondary('component.setupNodeEvents')}

        ${errTemplate_1.fmt.code(code)}

        https://on.cypress.io/migration-guide`;
    },
    VIDEO_UPLOAD_ON_PASSES_REMOVED: (_errShape) => {
        return (0, errTemplate_1.errTemplate) `\
        The ${errTemplate_1.fmt.highlight(`videoUploadOnPasses`)} configuration option was removed in ${errTemplate_1.fmt.cypressVersion(`13.0.0`)}.

        You can safely remove this option from your config.

        https://on.cypress.io/migration-guide`;
    },
    CONFIG_FILE_INVALID_ROOT_CONFIG: (errShape) => {
        const code = (0, errTemplate_1.errPartial) `
      {
        e2e: {
          specPattern: '...',
        },
        component: {
          specPattern: '...',
        },
      }`;
        return (0, errTemplate_1.errTemplate) `\
      The ${errTemplate_1.fmt.highlight(errShape.name)} configuration option is now invalid when set from the root of the config object in ${errTemplate_1.fmt.cypressVersion(`10.0.0`)}.

      It is now configured separately as a testing type property: ${errTemplate_1.fmt.highlightSecondary(`e2e.${errShape.name}`)} and ${errTemplate_1.fmt.highlightSecondary(`component.${errShape.name}`)}

      ${errTemplate_1.fmt.code(code)}

      https://on.cypress.io/migration-guide`;
    },
    CONFIG_FILE_INVALID_ROOT_CONFIG_E2E: (errShape) => {
        const code = (0, errTemplate_1.errPartial) `
      {
        e2e: {
          ${errTemplate_1.fmt.off(errShape.name)}: '...',
        }
      }`;
        return (0, errTemplate_1.errTemplate) `\
      The ${errTemplate_1.fmt.highlight(errShape.name)} configuration option is now invalid when set from the root of the config object in ${errTemplate_1.fmt.cypressVersion(`10.0.0`)}.

      It is now configured separately as a testing type property: ${errTemplate_1.fmt.highlightSecondary(`e2e.${errShape.name}`)}

      ${errTemplate_1.fmt.code(code)}

      https://on.cypress.io/migration-guide`;
    },
    CONFIG_FILE_INVALID_ROOT_CONFIG_COMPONENT: (errShape) => {
        const code = (0, errTemplate_1.errPartial) `
      {
        component: {
          ${errTemplate_1.fmt.off(errShape.name)}: '...',
        }
      }`;
        return (0, errTemplate_1.errTemplate) `\
      The ${errTemplate_1.fmt.highlight(errShape.name)} configuration option is now invalid when set from the root of the config object in ${errTemplate_1.fmt.cypressVersion(`10.0.0`)}.

      It is now configured separately as a testing type property: ${errTemplate_1.fmt.highlightSecondary(`component.${errShape.name}`)}

      ${errTemplate_1.fmt.code(code)}

      https://on.cypress.io/migration-guide`;
    },
    // TODO: add path to config file
    CONFIG_FILE_INVALID_TESTING_TYPE_CONFIG_COMPONENT: (errShape) => {
        const code = (0, errTemplate_1.errPartial) `
      {
        e2e: {
          ${errTemplate_1.fmt.off(errShape.name)}: '...',
        }
      }`;
        return (0, errTemplate_1.errTemplate) `\
      The ${errTemplate_1.fmt.highlight(`component.${errShape.name}`)} configuration option is not valid for component testing.

      Please remove this option or add this as an e2e testing type property: ${errTemplate_1.fmt.highlightSecondary(`e2e.${errShape.name}`)}

      ${errTemplate_1.fmt.code(code)}

      https://on.cypress.io/migration-guide`;
    },
    CONFIG_FILE_INVALID_TESTING_TYPE_CONFIG_E2E: (errShape) => {
        const code = (0, errTemplate_1.errPartial) `
      {
        e2e: {
          ${errTemplate_1.fmt.off(errShape.name)}: '...',
        }
      }`;
        return (0, errTemplate_1.errTemplate) `\
      The ${errTemplate_1.fmt.highlight(`e2e.${errShape.name}`)} configuration option is not valid for e2e testing.

      Please remove this option or add this as a component testing type property: ${errTemplate_1.fmt.highlightSecondary(`component.${errShape.name}`)}

      ${errTemplate_1.fmt.code(code)}

      https://on.cypress.io/migration-guide`;
    },
    CONFIG_FILE_DEV_SERVER_IS_NOT_VALID: (configFilePath, setupNodeEvents) => {
        var _a, _b;
        const re = /.?(cypress\.config.*)/;
        const configFile = (_b = (_a = configFilePath.match(re)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : `configFile`;
        const code = (0, errTemplate_1.errPartial) `
      {
        component: {
          devServer: {
            framework: 'create-react-app', ${errTemplate_1.fmt.comment('// Your framework')}
            bundler: 'webpack' ${errTemplate_1.fmt.comment('// Your dev server')}
          }
        }
      }`;
        return (0, errTemplate_1.errTemplate) `\
      Your ${errTemplate_1.fmt.highlightSecondary(configFile)} is invalid: ${errTemplate_1.fmt.path(configFilePath)}

      The ${errTemplate_1.fmt.highlight(`component.devServer`)} must be an object with a supported ${errTemplate_1.fmt.highlight('framework')} and ${errTemplate_1.fmt.highlight('bundler')}.

      ${errTemplate_1.fmt.code(code)}

      Instead, we saw:

      ${errTemplate_1.fmt.stringify(setupNodeEvents)}

      Learn more: https://on.cypress.io/dev-server
    `;
    },
    CONFIG_FILE_DEV_SERVER_INVALID_RETURN: (devServerOptions) => {
        return (0, errTemplate_1.errTemplate) `
      The returned value of the ${errTemplate_1.fmt.highlight('devServer')} function is not valid.

      The returned value must be an object with a ${errTemplate_1.fmt.highlight('port')} property of the dev-server that is running.

      Instead, we saw:

      ${errTemplate_1.fmt.stringify(devServerOptions)}

      Learn more: https://on.cypress.io/dev-server
    `;
    },
    UNEXPECTED_MUTATION_ERROR: (mutationField, args, err) => {
        return (0, errTemplate_1.errTemplate) `
      An unexpected internal error occurred while executing the ${errTemplate_1.fmt.highlight(mutationField)} operation with payload:

      ${errTemplate_1.fmt.stringify(args)}

      ${errTemplate_1.fmt.stackTrace(err)}
    `;
    },
    CLOUD_GRAPHQL_ERROR: (err) => {
        return (0, errTemplate_1.errTemplate) `
      We received an unexpected error response from the request to Cypress Cloud:

      ${errTemplate_1.fmt.stringify(err.message)}
    `;
    },
    UNEXPECTED_INTERNAL_ERROR: (err) => {
        return (0, errTemplate_1.errTemplate) `
      We encountered an unexpected internal error.

      Please check GitHub or open a new issue if you don't see one already with the details below:

      ${errTemplate_1.fmt.stackTrace(err)}
    `;
    },
    MIGRATION_ALREADY_OCURRED: (configFile, legacyConfigFile) => {
        return (0, errTemplate_1.errTemplate) `
      You are attempting to use Cypress with an older config file: ${errTemplate_1.fmt.highlight(legacyConfigFile)}
      When you upgraded to Cypress v10.0 the config file was updated and moved to a new location: ${errTemplate_1.fmt.highlight(configFile)}

      You may need to update any CLI scripts to ensure that they are referring the new version. This would typically look something like:
      "${errTemplate_1.fmt.highlight(`cypress open --config-file=${configFile}`)}"

      https://on.cypress.io/migration-guide
    `;
    },
    TEST_FILES_RENAMED: (errShape, err) => {
        const stackTrace = err ? errTemplate_1.fmt.stackTrace(err) : null;
        const newName = errShape.newName || '<unknown>';
        const testingTypedHelpMessage = errShape.testingType
            ? (0, errTemplate_1.errPartial) `${errTemplate_1.fmt.highlightSecondary(`${errShape.testingType}.${newName}`)}`
            : (0, errTemplate_1.errPartial) `${errTemplate_1.fmt.highlightSecondary(`e2e.${newName}`)} or ${errTemplate_1.fmt.highlightSecondary(`component.${newName}`)}`;
        const code = errShape.testingType
            ? (0, errTemplate_1.errPartial) `
        {
          ${errTemplate_1.fmt.off(errShape.testingType)}: {
            specPattern: '...',
          },
        }`
            : (0, errTemplate_1.errPartial) `
        {
          e2e: {
            specPattern: '...',
          },
          component: {
            specPattern: '...',
          },
        }`;
        return (0, errTemplate_1.errTemplate) `\
      The ${errTemplate_1.fmt.highlight(errShape.name)} configuration option is now invalid when set on the config object in ${errTemplate_1.fmt.cypressVersion(`10.0.0`)}.

      It is now renamed to ${errTemplate_1.fmt.highlight(newName)} and configured separately as a testing type property: ${testingTypedHelpMessage}
      ${errTemplate_1.fmt.code(code)}

      https://on.cypress.io/migration-guide

      ${stackTrace}
      `;
    },
    COMPONENT_FOLDER_REMOVED: (errShape, err) => {
        const stackTrace = err ? errTemplate_1.fmt.stackTrace(err) : null;
        const code = (0, errTemplate_1.errPartial) `
    {
      component: {
        specPattern: '...',
      },
    }`;
        return (0, errTemplate_1.errTemplate) `\
      The ${errTemplate_1.fmt.highlight(errShape.name)} configuration option is now invalid when set on the config object in ${errTemplate_1.fmt.cypressVersion(`10.0.0`)}.

      It is now renamed to ${errTemplate_1.fmt.highlight('specPattern')} and configured separately as a component testing property: ${errTemplate_1.fmt.highlightSecondary('component.specPattern')}
      ${errTemplate_1.fmt.code(code)}

      https://on.cypress.io/migration-guide

      ${stackTrace}
      `;
    },
    INTEGRATION_FOLDER_REMOVED: (errShape, err) => {
        const stackTrace = err ? errTemplate_1.fmt.stackTrace(err) : null;
        const code = (0, errTemplate_1.errPartial) `
    {
      e2e: {
        specPattern: '...',
      },
    }`;
        return (0, errTemplate_1.errTemplate) `\
      The ${errTemplate_1.fmt.highlight(errShape.name)} configuration option is now invalid when set on the config object in ${errTemplate_1.fmt.cypressVersion(`10.0.0`)}.

      It is now renamed to ${errTemplate_1.fmt.highlight('specPattern')} and configured separately as a end to end testing property: ${errTemplate_1.fmt.highlightSecondary('e2e.specPattern')}
      ${errTemplate_1.fmt.code(code)}

      https://on.cypress.io/migration-guide

      ${stackTrace}
      `;
    },
    MIGRATION_MISMATCHED_CYPRESS_VERSIONS: (version, currentVersion) => {
        return (0, errTemplate_1.errTemplate) `
      You are running ${errTemplate_1.fmt.cypressVersion(currentVersion)} in global mode, but you are attempting to migrate a project where ${errTemplate_1.fmt.cypressVersion(version)} is installed.

      Ensure the project you are migrating has Cypress version ${errTemplate_1.fmt.cypressVersion(currentVersion)} installed.

      https://on.cypress.io/migration-guide
    `;
    },
    MIGRATION_CYPRESS_NOT_FOUND: () => {
        return (0, errTemplate_1.errTemplate) `
      You are running Cypress 10+ in global mode and attempting to open or migrate a project where an install of ${errTemplate_1.fmt.code('cypress')} cannot be found.

      Ensure that ${errTemplate_1.fmt.code('cypress@10')} or greater is installed in the project you are attempting to open or migrate.

      https://on.cypress.io/migration-guide
    `;
    },
    DEV_SERVER_CONFIG_FILE_NOT_FOUND: (devServer, root, searchedFor) => {
        const devServerConfigFile = `${devServer}Config`;
        return (0, errTemplate_1.errTemplate) `\
      You are using ${errTemplate_1.fmt.highlight(devServer)} for your dev server, but a configuration file was not found. We traversed upwards from:

      ${errTemplate_1.fmt.highlightSecondary(root)}

      looking for a file named:

      ${errTemplate_1.fmt.listItems(searchedFor, { prefix: ' - ' })}

      Add your ${errTemplate_1.fmt.highlight(devServer)} config at one of the above paths, or import your configuration file and provide it to
      the devServer config as a ${errTemplate_1.fmt.highlight(devServerConfigFile)} option.
    `;
    },
    TESTING_TYPE_NOT_CONFIGURED: (testingType) => {
        return (0, errTemplate_1.errTemplate) `
      The testing type selected (${errTemplate_1.fmt.highlight(testingType)}) is not configured in your config file.

      Please run ‘cypress open’ and choose your testing type to automatically update your configuration file.

      https://on.cypress.io/configuration
    `;
    },
    COMPONENT_TESTING_MISMATCHED_DEPENDENCIES: (dependencies) => {
        const deps = dependencies.map((dep) => {
            if (dep.detectedVersion) {
                return `\`${dep.dependency.installer}\`. Expected ${dep.dependency.minVersion}, found ${dep.detectedVersion}.`;
            }
            return `\`${dep.dependency.installer}\`. Expected ${dep.dependency.minVersion} but dependency was not found.`;
        });
        return (0, errTemplate_1.errTemplate) `
      We detected that you have versions of dependencies that are not officially supported:

      ${errTemplate_1.fmt.listItems(deps, { prefix: ' - ' })}

      If you're experiencing problems, downgrade dependencies and restart Cypress.
    `;
    },
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _typeCheck = exports.AllCypressErrors;
function getMsgByType(type, ...args) {
    const err = (0, exports.getError)(type, ...args);
    return err.message;
}
exports.getMsgByType = getMsgByType;
/**
 * Given an error name & params for the error, returns a "CypressError",
 * with a forBrowser property, used when we want to format the value for sending to
 * the browser rather than the terminal.
 *
 * @param type
 * @param args
 * @returns
 */
const getError = function (type, ...args) {
    var _a, _b;
    // If we don't know this "type" of error, return as a non-cypress error
    if (!exports.AllCypressErrors[type]) {
        const err = new Error(`UNKNOWN ERROR ${JSON.stringify(type)}`);
        err.isCypressErr = false;
        err.type = type;
        err.messageMarkdown = err.message;
        return err;
    }
    // @ts-expect-error
    const result = exports.AllCypressErrors[type](...args);
    const { message, details, originalError, messageMarkdown } = result;
    const err = new Error(message);
    err.isCypressErr = true;
    err.type = type;
    err.details = details;
    err.messageMarkdown = messageMarkdown;
    err.originalError = originalError;
    if (originalError) {
        err.stack = originalError.stack;
        err.stackWithoutMessage = (0, stackUtils_1.stackWithoutMessage)((_a = originalError.stack) !== null && _a !== void 0 ? _a : '');
    }
    else {
        const newErr = new Error();
        Error.captureStackTrace(newErr, exports.getError);
        err.stack = newErr.stack;
        err.stackWithoutMessage = (0, stackUtils_1.stackWithoutMessage)((_b = err.stack) !== null && _b !== void 0 ? _b : '');
    }
    return err;
};
exports.getError = getError;
exports.get = exports.getError;
const logWarning = function (type, ...args) {
    const err = (0, exports.getError)(type, ...args);
    (0, errorUtils_1.logError)(err, 'magenta');
    return null;
};
exports.logWarning = logWarning;
exports.warning = exports.logWarning;
const throwErr = function (type, ...args) {
    var _a;
    const err = (0, exports.getError)(type, ...args);
    if (!err.originalError) {
        Error.captureStackTrace(err, exports.throwErr);
        err.stackWithoutMessage = (0, stackUtils_1.stackWithoutMessage)((_a = err.stack) !== null && _a !== void 0 ? _a : '');
    }
    throw err;
};
exports.throwErr = throwErr;
const cloneErr = function (err, options = {}) {
    lodash_1.default.defaults(options, {
        html: false,
    });
    // pull off these properties
    const obj = lodash_1.default.pick(err, 'message', 'messageMarkdown', 'type', 'name', 'stack', 'fileName', 'lineNumber', 'columnNumber');
    if (options.html) {
        obj.message = ansi_up.ansi_to_html(err.message)
            // revert back the distorted characters
            // in case there is an error in a child_process
            // that contains quotes
            .replace(/\&\#x27;/g, '\'')
            .replace(/\&quot\;/g, '"');
    }
    // and any own (custom) properties
    // of the err object
    Object.entries(err || {}).forEach(([prop, val]) => {
        obj[prop] = val;
    });
    if (err.stackWithoutMessage) {
        obj.stack = err.stackWithoutMessage;
    }
    return obj;
};
exports.cloneErr = cloneErr;
// Re-exporting old namespaces for legacy server access
var errorUtils_2 = require("./errorUtils");
Object.defineProperty(exports, "log", { enumerable: true, get: function () { return errorUtils_2.logError; } });
Object.defineProperty(exports, "isCypressErr", { enumerable: true, get: function () { return errorUtils_2.isCypressErr; } });
