"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCaOptions = void 0;
const tslib_1 = require("tslib");
const fs_1 = require("fs");
const tls_1 = tslib_1.__importDefault(require("tls"));
const getNpmConfigCAFileValue = () => {
    if (process.env.npm_config_cafile) {
        return fs_1.promises.readFile(process.env.npm_config_cafile, 'utf8').then((ca) => {
            return ca;
        }).catch(() => {
            return undefined;
        });
    }
    return Promise.resolve(undefined);
};
const getNodeExtraCACertsFileValue = () => {
    if (process.env.NODE_EXTRA_CA_CERTS) {
        return fs_1.promises.readFile(process.env.NODE_EXTRA_CA_CERTS, 'utf8').then((ca) => {
            return ca;
        }).catch(() => {
            return undefined;
        });
    }
    return Promise.resolve(undefined);
};
const getCaOptions = () => {
    // Load the contents of process.env.npm_config_cafile and process.env.NODE_EXTRA_CA_CERTS
    // They will be cached so we don't have to actually read them on every call
    return Promise.all([getNpmConfigCAFileValue(), getNodeExtraCACertsFileValue()]).then(([npm_config_cafile, NODE_EXTRA_CA_CERTS]) => {
        // Merge the contents of ca with the npm config options. These options are meant to be replacements, but we want to keep the tls client certificate
        // config that our consumers provide
        if (npm_config_cafile) {
            return { ca: [npm_config_cafile] };
        }
        if (process.env.npm_config_ca) {
            return { ca: [process.env.npm_config_ca] };
        }
        // Merge the contents of ca with the NODE_EXTRA_CA_CERTS options. This option is additive to the tls root certificates
        if (NODE_EXTRA_CA_CERTS) {
            return { ca: tls_1.default.rootCertificates.concat(NODE_EXTRA_CA_CERTS) };
        }
        return {};
    });
};
exports.getCaOptions = getCaOptions;
