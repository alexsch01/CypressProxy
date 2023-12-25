"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fullCrossOrigin = exports.full = exports.partial = void 0;
const common_tags_1 = require("common-tags");
const resolve_dist_1 = require(process.argv[1]+"/../packages/resolve-dist");
function injectCspNonce(options) {
    const { cspNonce } = options;
    return cspNonce ? ` nonce="${cspNonce}"` : '';
}
function partial(domain, options) {
    let documentDomainInjection = `document.domain = '${domain}';`;
    if (!options.shouldInjectDocumentDomain) {
        documentDomainInjection = '';
    }
    // With useDefaultDocumentDomain=true we continue to inject an empty script tag in order to be consistent with our other forms of injection.
    // This is also diagnostic in nature is it will allow us to debug easily to make sure injection is still occurring.
    return (0, common_tags_1.oneLine) `
    <script type='text/javascript'${injectCspNonce(options)}>
      ${documentDomainInjection}
    </script>
  `;
}
exports.partial = partial;
function full(domain, options) {
    return (0, resolve_dist_1.getRunnerInjectionContents)().then((contents) => {
        let documentDomainInjection = `document.domain = '${domain}';`;
        if (!options.shouldInjectDocumentDomain) {
            documentDomainInjection = '';
        }
        return (0, common_tags_1.oneLine) `
      <script type='text/javascript'${injectCspNonce(options)}>
        ${documentDomainInjection}

        ${contents}
      </script>
    `;
    });
}
exports.full = full;
async function fullCrossOrigin(domain, options) {
    const contents = await (0, resolve_dist_1.getRunnerCrossOriginInjectionContents)();
    const { cspNonce, ...crossOriginOptions } = options;
    let documentDomainInjection = `document.domain = '${domain}';`;
    if (!options.shouldInjectDocumentDomain) {
        documentDomainInjection = '';
    }
    return (0, common_tags_1.oneLine) `
    <script type='text/javascript'${injectCspNonce(options)}>
      ${documentDomainInjection}

      (function (cypressConfig) {
        ${contents}
      }(${JSON.stringify(crossOriginOptions)}));
    </script>
  `;
}
exports.fullCrossOrigin = fullCrossOrigin;
