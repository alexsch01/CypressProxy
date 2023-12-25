"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnStartSpanProcessor = void 0;
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
/**
 * An implementation of the {@link SpanProcessor} that converts the {@link Span}
 * to {@link ReadableSpan} and passes it to the configured exporter.
 *
 * Only spans that are sampled are converted.
 */
class OnStartSpanProcessor extends sdk_trace_base_1.SimpleSpanProcessor {
    onStart(span, _parentContext) {
        return this.onEnd(span);
    }
}
exports.OnStartSpanProcessor = OnStartSpanProcessor;
