"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HtmlDataSource = void 0;
const tslib_1 = require("tslib");
const resolve_dist_1 = require(process.argv[1]+"/../packages/resolve-dist");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const telemetry_1 = require(process.argv[1]+"/../packages/telemetry");
const PATH_TO_NON_PROXIED_ERROR = (0, resolve_dist_1.resolveFromPackages)('server', 'lib', 'html', 'non_proxied_error.html');
class HtmlDataSource {
    constructor(ctx) {
        this.ctx = ctx;
    }
    async fetchAppHtml() {
        if (process.env.CYPRESS_INTERNAL_VITE_DEV) {
            const response = await this.ctx.util.fetch(`http://localhost:${process.env.CYPRESS_INTERNAL_VITE_APP_PORT}/`, { method: 'GET' });
            const html = await response.text();
            return html;
        }
        // Check if the file exists. If it doesn't, it probably means that Vite is re-building
        // and we should retry a few times until the file exists
        let retryCount = 0;
        let err;
        while (retryCount < 5) {
            try {
                let html = await this.ctx.fs.readFile((0, resolve_dist_1.getPathToDist)('app', 'index.html'), 'utf8');
                return html.replace('<title>Cypress</title>', `<title>${this.ctx.project.projectTitle(this.ctx.currentProject || '')}</title>`);
            }
            catch (e) {
                err = e;
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
        throw err;
    }
    getPropertiesFromServerConfig(cfg = {}) {
        const keys = [
            'baseUrl',
            'browserUrl',
            'port',
            'proxyServer',
            'proxyUrl',
            'remote',
            'testingType',
            'componentTesting',
            'reporterUrl',
            'namespace',
            'socketIoRoute',
            'protocolEnabled',
            'hideCommandLog',
            'hideRunnerUi',
        ];
        return lodash_1.default.pick(cfg, keys);
    }
    async makeServeConfig() {
        const propertiesFromServerConfig = this.getPropertiesFromServerConfig(this.ctx._apis.projectApi.getConfig());
        let cfg = { ...propertiesFromServerConfig };
        try {
            cfg = {
                ...(await this.ctx.project.getConfig()),
                ...cfg,
            };
        }
        catch (_a) {
            // Error getting config, we will show an error screen when we render the page
        }
        // for project-base config, the remote state we wish to convey should be whatever top is set to, also known as the primary domain
        // whenever the app is served/re-served
        if (this.ctx.coreData.currentTestingType === 'e2e') {
            const remoteStates = this.ctx._apis.projectApi.getRemoteStates();
            if (remoteStates) {
                cfg.remote = remoteStates.getPrimary();
            }
        }
        cfg.browser = this.ctx._apis.projectApi.getCurrentBrowser();
        return {
            projectName: this.ctx.lifecycleManager.projectTitle,
            namespace: cfg.namespace || '__cypress-string',
            base64Config: Buffer.from(JSON.stringify(cfg)).toString('base64'),
            hideCommandLog: cfg.hideCommandLog,
            hideRunnerUi: cfg.hideRunnerUi,
        };
    }
    /**
     * The app html includes the SSR'ed data to bootstrap the page for the app
     */
    async appHtml(nonProxied) {
        if (nonProxied) {
            return this.ctx.fs.readFile(PATH_TO_NON_PROXIED_ERROR, 'utf-8');
        }
        const [appHtml, serveConfig] = await Promise.all([
            this.fetchAppHtml(),
            this.makeServeConfig(),
        ]);
        return this.replaceBody(appHtml, serveConfig);
    }
    replaceBody(html, serveConfig) {
        return html.replace('<body>', `
      <body>
        <script>
          window.__RUN_MODE_SPECS__ = ${JSON.stringify(this.ctx.project.specs)}
          window.__CYPRESS_MODE__ = ${JSON.stringify(this.ctx.isRunMode ? 'run' : 'open')};
          window.__CYPRESS_CONFIG__ = ${JSON.stringify(serveConfig)};
          window.__CYPRESS_TESTING_TYPE__ = '${this.ctx.coreData.currentTestingType}'
          window.__CYPRESS_BROWSER__ = ${JSON.stringify(this.ctx.coreData.activeBrowser)}
          ${telemetry_1.telemetry.isEnabled() ? `window.__CYPRESS_TELEMETRY__ = ${JSON.stringify({ context: telemetry_1.telemetry.getActiveContextObject(), resources: telemetry_1.telemetry.getResources(), isVerbose: telemetry_1.telemetry.isVerbose() })}` : ''}
          ${process.env.CYPRESS_INTERNAL_GQL_NO_SOCKET ? `window.__CYPRESS_GQL_NO_SOCKET__ = 'true';` : ''}
        </script>
    `);
    }
}
exports.HtmlDataSource = HtmlDataSource;
