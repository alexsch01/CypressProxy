"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeTelemetryContext = exports.decodeTelemetryContext = exports.telemetry = exports.OTLPTraceExporterCloud = exports.OTLPTraceExporterIpc = void 0;
const resources_1 = require("@opentelemetry/resources");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const circleCiDetectorSync_1 = require("./detectors/circleCiDetectorSync");
const index_1 = require("./index");
const cloud_span_exporter_1 = require("./span-exporters/cloud-span-exporter");
Object.defineProperty(exports, "OTLPTraceExporterCloud", { enumerable: true, get: function () { return cloud_span_exporter_1.OTLPTraceExporter; } });
const ipc_span_exporter_1 = require("./span-exporters/ipc-span-exporter");
Object.defineProperty(exports, "OTLPTraceExporterIpc", { enumerable: true, get: function () { return ipc_span_exporter_1.OTLPTraceExporter; } });
let telemetryInstance = new index_1.TelemetryNoop;
/**
 * Check if the env is enabled
 * @returns boolean
 */
const isEnabledEnV = () => index_1.enabledValues.includes(process.env.CYPRESS_INTERNAL_ENABLE_TELEMETRY || '');
/**
 * Provide a single place to check if telemetry should be enabled in verbose mode.
 * @returns boolean
 */
const isVerboseEnabled = () => index_1.enabledValues.includes(process.env.CYPRESS_INTERNAL_ENABLE_TELEMETRY_VERBOSE || '');
/**
 * Provide a single place to check if telemetry should be enabled.
 * @returns boolean
 */
const isEnabled = () => isEnabledEnV() || isVerboseEnabled();
/**
 * Initialize the telemetry singleton
 * @param namespace - namespace to apply to the singleton
 * @param context - context to apply if it exists
 * @param version - cypress version
 * @param exporter - the exporter to be used.
 * @returns
 */
const init = ({ namespace, context, version, exporter, }) => {
    if (!isEnabled()) {
        return;
    }
    // Telemetry only needs to be initialized once.
    if (telemetryInstance instanceof index_1.Telemetry) {
        throw ('Telemetry instance has already be initialized');
    }
    telemetryInstance = new index_1.Telemetry({
        namespace,
        Provider: sdk_trace_node_1.NodeTracerProvider,
        detectors: [
            resources_1.envDetectorSync, resources_1.processDetectorSync, resources_1.osDetectorSync, resources_1.hostDetectorSync, circleCiDetectorSync_1.circleCiDetectorSync,
        ],
        rootContextObject: context,
        version,
        exporter,
        SpanProcessor: sdk_trace_base_1.BatchSpanProcessor,
        isVerbose: isVerboseEnabled(),
    });
    return;
};
exports.telemetry = {
    init,
    isEnabled,
    startSpan: (arg) => telemetryInstance.startSpan(arg),
    getSpan: (arg) => telemetryInstance.getSpan(arg),
    findActiveSpan: (arg) => telemetryInstance.findActiveSpan(arg),
    endActiveSpanAndChildren: (arg) => telemetryInstance.endActiveSpanAndChildren(arg),
    getActiveContextObject: () => telemetryInstance.getActiveContextObject(),
    getResources: () => telemetryInstance.getResources(),
    shutdown: () => telemetryInstance.shutdown(),
    isVerbose: () => isVerboseEnabled(),
    exporter: () => telemetryInstance.getExporter(),
};
const decodeTelemetryContext = (telemetryCtx) => {
    if (telemetryCtx) {
        return JSON.parse(Buffer.from(telemetryCtx, 'base64').toString('utf-8'));
    }
    return {};
};
exports.decodeTelemetryContext = decodeTelemetryContext;
const encodeTelemetryContext = ({ context, version }) => {
    return Buffer.from(JSON.stringify({
        context,
        version,
    })).toString('base64');
};
exports.encodeTelemetryContext = encodeTelemetryContext;
