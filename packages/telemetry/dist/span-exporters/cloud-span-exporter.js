"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTLPTraceExporter = void 0;
const api_1 = require("@opentelemetry/api");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const otlp_exporter_base_1 = require("@opentelemetry/otlp-exporter-base");
/**
 * Collector Trace Exporter for Node
 */
class OTLPTraceExporter extends exporter_trace_otlp_http_1.OTLPTraceExporter {
    constructor(config = {}) {
        super(config);
        this.enc = config.encryption;
        this.delayedItemsToExport = [];
        this.sendWithHttp = otlp_exporter_base_1.sendWithHttp;
        // when encryption is on, requirementsToExport will be set to unknown until projectId and/or record key are attached.
        // We will delay sending spans until requirementsToExport is either met or unmet. If unmet we will fail all attempts to send.
        if (this.enc) {
            this.requirementsToExport = 'unknown';
            this.headers['x-cypress-encrypted'] = '1';
        }
        else {
            this.requirementsToExport = 'met';
        }
    }
    /**
     * Adds the projectId as a header and exports any delayed spans.
     * @param projectId - the id of the project to export spans for.
     */
    attachProjectId(projectId) {
        if (!projectId) {
            if (this.requirementsToExport === 'unknown') {
                this.requirementsToExport = 'unmet';
                this.abortDelayedItems();
            }
            return;
        }
        // Continue to send this header for passivity until the cloud is released.
        this.headers['x-project-id'] = projectId;
        this.projectId = projectId;
        this.setAuthorizationHeader();
    }
    /**
     * Adds the recordKey as a header and exports any delayed spans.
     * @param recordKey - the recordKey of the project to export spans for.
     */
    attachRecordKey(recordKey) {
        if (!recordKey) {
            if (this.requirementsToExport === 'unknown') {
                this.requirementsToExport = 'unmet';
                this.abortDelayedItems();
            }
            return;
        }
        this.recordKey = recordKey;
        this.setAuthorizationHeader();
    }
    /**
     * Sets the auth header based on the project id and record key.
     */
    setAuthorizationHeader() {
        if (this.projectId && this.recordKey) {
            this.requirementsToExport = 'met';
            this.headers.Authorization = `Basic ${Buffer.from(`${this.projectId}:${this.recordKey}`).toString('base64')}`;
            this.sendDelayedItems();
        }
    }
    /**
     * exports delayed spans if both the record key and project id are present
     */
    sendDelayedItems() {
        if (this.headers.Authorization) {
            this.delayedItemsToExport.forEach((item) => {
                this.send(item.serviceRequest, item.onSuccess, item.onError);
            });
            this.delayedItemsToExport = [];
        }
    }
    abortDelayedItems() {
        this.delayedItemsToExport.forEach((item) => {
            item.onError(new Error('Spans cannot be sent, exporter has unmet requirements, either project id or record key are undefined.'));
        });
        this.delayedItemsToExport = [];
    }
    /**
     * Overrides send if we need to encrypt the request.
     * @param objects
     * @param onSuccess
     * @param onError
     * @returns
     */
    send(objects, onSuccess, onError) {
        if (this._shutdownOnce.isCalled) {
            api_1.diag.debug('Shutdown already started. Cannot send objects');
            return;
        }
        if (this.requirementsToExport === 'unmet') {
            onError(new Error('Spans cannot be sent, exporter has unmet requirements, either project id or record key are undefined.'));
        }
        let serviceRequest;
        if (typeof objects !== 'string') {
            serviceRequest = JSON.stringify(this.convert(objects));
        }
        else {
            serviceRequest = objects;
        }
        // Delay items if we want encryption but don't have an authorization header
        if (this.enc && !this.headers.Authorization) {
            this.delayedItemsToExport.push({ serviceRequest, onSuccess, onError });
            return;
        }
        const prepareRequest = (request) => {
            if (this.enc) {
                return this.enc.encryptRequest({ url: this.url, method: 'post', body: serviceRequest }).then(({ jwe }) => JSON.stringify(jwe));
            }
            return Promise.resolve(request);
        };
        const promise = prepareRequest(serviceRequest).then((body) => {
            return new Promise((resolve, reject) => {
                this.sendWithHttp(this, body, 'application/json', resolve, reject);
            });
        }).then(onSuccess, onError);
        this._sendingPromises.push(promise);
        const popPromise = () => {
            const index = this._sendingPromises.indexOf(promise);
            this._sendingPromises.splice(index, 1);
        };
        promise.then(popPromise, popPromise);
    }
}
exports.OTLPTraceExporter = OTLPTraceExporter;
