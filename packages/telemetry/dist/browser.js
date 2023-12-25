"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetry = void 0;
const index_1 = require("./index");
const sdk_trace_web_1 = require("@opentelemetry/sdk-trace-web");
const resources_1 = require("@opentelemetry/resources");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const websocket_span_exporter_1 = require("./span-exporters/websocket-span-exporter");
let telemetryInstance = new index_1.TelemetryNoop;
/**
 * Initialize the telemetry singleton
 * @param namespace - namespace to apply to the singleton
 * @param config - object containing the version
 * @returns void
 */
const init = ({ namespace, config }) => {
    // If we don't have cypress_telemetry setup on window don't even bother making the global instance
    if (!window.__CYPRESS_TELEMETRY__) {
        return;
    }
    // Telemetry only needs to be initialized once.
    if (telemetryInstance instanceof index_1.Telemetry) {
        throw ('Telemetry instance has already be initialized');
    }
    const { context, resources, isVerbose } = window.__CYPRESS_TELEMETRY__;
    // We always use the websocket exporter for browser telemetry
    const exporter = new websocket_span_exporter_1.OTLPTraceExporter();
    telemetryInstance = new index_1.Telemetry({
        namespace,
        Provider: sdk_trace_web_1.WebTracerProvider,
        detectors: [
            resources_1.browserDetectorSync,
        ],
        rootContextObject: context,
        version: config === null || config === void 0 ? void 0 : config.version,
        exporter,
        // Because otel is lame we need to use the simple span processor instead of the batch processor
        // or we risk losing spans when the browser navigates.
        // TODO: create a browser batch span processor to account for navigation.
        // See https://github.com/open-telemetry/opentelemetry-js/issues/2613
        SpanProcessor: sdk_trace_base_1.SimpleSpanProcessor,
        resources,
        isVerbose,
    });
    window.cypressTelemetrySingleton = telemetryInstance;
    return;
};
/**
 * If telemetry has already been setup, attach this singleton to this instance
 * @returns
 */
const attach = () => {
    if (window.cypressTelemetrySingleton) {
        telemetryInstance = window.cypressTelemetrySingleton;
        return;
    }
};
exports.telemetry = {
    init,
    attach,
    startSpan: (arg) => telemetryInstance.startSpan(arg),
    getSpan: (arg) => telemetryInstance.getSpan(arg),
    findActiveSpan: (arg) => telemetryInstance.findActiveSpan(arg),
    endActiveSpanAndChildren: (arg) => telemetryInstance.endActiveSpanAndChildren(arg),
    getActiveContextObject: () => telemetryInstance.getActiveContextObject(),
    shutdown: () => telemetryInstance.shutdown(),
    attachWebSocket: (ws) => { var _a; return (_a = telemetryInstance.getExporter()) === null || _a === void 0 ? void 0 : _a.attachWebSocket(ws); },
    setRootContext: (context) => (telemetryInstance.setRootContext(context)),
};
