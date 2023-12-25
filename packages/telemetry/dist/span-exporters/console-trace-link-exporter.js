"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleTraceLinkExporter = void 0;
const core_1 = require("@opentelemetry/core");
/**
 * Builds and returns a {@link SpanExporter} that logs Honeycomb URLs for completed traces
 *
 * @remark This is not for production use.
 * @param options The {@link HoneycombOptions} used to configure the exporter
 * @returns the configured {@link ConsoleTraceLinkExporter} instance
 */
class ConsoleTraceLinkExporter {
    constructor({ serviceName, team, environment, }) {
        this._traceUrl = '';
        this._uniqueTraces = {};
        // eslint-disable-next-line no-console
        this._log = console.log;
        this._traceUrl = buildTraceUrl(serviceName, team, environment);
    }
    export(spans, resultCallback) {
        if (this._traceUrl) {
            spans.forEach((span) => {
                const { traceId, spanId } = span.spanContext();
                if (!span.ended) {
                    if (!Object.keys(this._uniqueTraces).includes(traceId)) {
                        this._uniqueTraces[traceId] = spanId;
                        this._log(`Trace start: [${span.name}] - ${this._traceUrl}=${span.spanContext().traceId}`);
                    }
                }
                else if (this._uniqueTraces[traceId] === spanId) {
                    this._log(`Trace end: [${span.name}] - ${this._traceUrl}=${span.spanContext().traceId}`);
                }
            });
        }
        resultCallback({ code: core_1.ExportResultCode.SUCCESS });
    }
    shutdown() {
        return Promise.resolve();
    }
}
exports.ConsoleTraceLinkExporter = ConsoleTraceLinkExporter;
/**
 * Builds and returns a URL that is used to log when a trace is completed in the {@link ConsoleTraceLinkExporter}.
 *
 * @param serviceName the Honeycomb service name (or classic dataset) where data is stored
 * @param team the Honeycomb team
 * @param environment the Honeycomb environment
 * @returns
 */
function buildTraceUrl(serviceName, team, environment) {
    return `https://ui.honeycomb.io/${team}/environments/${environment}/datasets/${serviceName}/trace?trace_id`;
}
