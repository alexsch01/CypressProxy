"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTLPTraceExporter = void 0;
const api_1 = require("@opentelemetry/api");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
/**
 * Collector Trace Exporter for Node
 */
class OTLPTraceExporter extends exporter_trace_otlp_http_1.OTLPTraceExporter {
    constructor() {
        super({});
        this.delayedExport = [];
    }
    /**
     * Attaches the ipc and replays any exports called without it
     * @param ipc - the ipc used to send data
     */
    attachIPC(ipc) {
        this.ipc = ipc;
        this.delayedExport.forEach(({ items, resultCallback }) => {
            this.export(items, resultCallback);
        });
    }
    /**
     * Overrides export to delay sending spans if the ipc has not been attached
     * @param items
     * @param resultCallback
     */
    export(items, resultCallback) {
        if (!this.ipc) {
            this.delayedExport.push({ items, resultCallback });
        }
        else {
            super.export(items, resultCallback);
        }
    }
    /**
     * Overrides send to use IPC instead of http
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
        const serviceRequest = JSON.stringify(this.convert(objects));
        const promise = Promise.resolve().then(() => {
            return new Promise((resolve) => {
                this.ipc.send('export:telemetry', serviceRequest);
                resolve();
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
