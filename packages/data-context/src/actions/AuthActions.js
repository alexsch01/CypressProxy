"use strict";
var _AuthActions_cancelActiveLogin;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthActions = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@urql/core");
class AuthActions {
    constructor(ctx) {
        this.ctx = ctx;
        _AuthActions_cancelActiveLogin.set(this, null);
    }
    async getUser() {
        return this.authApi.getUser().then((obj) => {
            if (obj.authToken) {
                this.ctx.coreData.user = obj;
                // When we get the user at startup, check the auth by
                // hitting the network
                this.checkAuth().catch((err) => {
                    // Don't worry about handling the error here
                    this.ctx.logTraceError(err);
                });
            }
        });
    }
    get authApi() {
        return this.ctx._apis.authApi;
    }
    async checkAuth() {
        var _a, _b;
        const operationDoc = (0, core_1.gql) `
      query Cypress_CheckAuth { 
        cloudViewer { 
          id 
          email 
          fullName 
        } 
      }`;
        const result = await this.ctx.cloud.executeRemoteGraphQL({
            fieldName: 'cloudViewer',
            operationType: 'query',
            operationDoc,
            operationVariables: {},
        });
        if (!((_a = result.data) === null || _a === void 0 ? void 0 : _a.cloudViewer) && !((_b = result.error) === null || _b === void 0 ? void 0 : _b.networkError)) {
            this.ctx.coreData.user = null;
            await this.logout();
        }
    }
    async login(utmSource, utmMedium, utmContent) {
        const onMessage = (authState) => {
            this.ctx.update((coreData) => {
                coreData.authState = authState;
            });
            // Ensure auth state changes during the login lifecycle
            // are propagated to the clients
            this.ctx.emitter.authChange();
        };
        const user = await new Promise((resolve, reject) => {
            // A resolver is exposed to the instance so that we can
            // resolve this promise and the original mutation promise
            // if a reset occurs
            tslib_1.__classPrivateFieldSet(this, _AuthActions_cancelActiveLogin, () => resolve(null), "f");
            // NOTE: auth.logIn should never reject, it uses `onMessage` to propagate state changes (including errors) to the frontend.
            this.authApi.logIn(onMessage, utmSource, utmMedium, utmContent || null).then(resolve, reject);
        });
        const isMainWindowFocused = this.ctx._apis.electronApi.isMainWindowFocused();
        if (!isMainWindowFocused) {
            const isBrowserFocusSupported = this.ctx.coreData.activeBrowser
                && await this.ctx.browser.isFocusSupported(this.ctx.coreData.activeBrowser);
            const isBrowserOpen = this.ctx.coreData.app.browserStatus === 'open';
            if (!isBrowserFocusSupported || !isBrowserOpen) {
                this.ctx._apis.electronApi.focusMainWindow();
            }
            else {
                await this.ctx.actions.browser.focusActiveBrowserWindow();
            }
        }
        if (!user) {
            // if the user is null, this promise is resolving due to a
            // login mutation cancellation. the state should already
            // be reset, so abort early.
            return;
        }
        this.setAuthenticatedUser(user);
        tslib_1.__classPrivateFieldSet(this, _AuthActions_cancelActiveLogin, null, "f");
        this.resetAuthState();
    }
    resetAuthState() {
        // closes the express server opened during login, if it's still open
        this.authApi.resetAuthState();
        // if a login mutation is still in progress, we
        // forcefully resolve it so that the mutation does not persist
        if (tslib_1.__classPrivateFieldGet(this, _AuthActions_cancelActiveLogin, "f")) {
            tslib_1.__classPrivateFieldGet(this, _AuthActions_cancelActiveLogin, "f").call(this);
            tslib_1.__classPrivateFieldSet(this, _AuthActions_cancelActiveLogin, null, "f");
        }
        this.ctx.update((coreData) => {
            coreData.authState = { browserOpened: false };
        });
        this.ctx.emitter.authChange();
    }
    async logout() {
        try {
            this.ctx.update((coreData) => {
                coreData.authState.browserOpened = false;
            });
            await this.authApi.logOut();
        }
        catch (e) {
            this.ctx.logTraceError(e);
        }
        finally {
            this.setAuthenticatedUser(null);
            this.ctx.cloud.reset();
            this.ctx.emitter.authChange();
        }
    }
    setAuthenticatedUser(authUser) {
        this.ctx.update((coreData) => {
            coreData.user = authUser;
        });
        return this;
    }
}
exports.AuthActions = AuthActions;
_AuthActions_cancelActiveLogin = new WeakMap();
