"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doesTopNeedToBeSimulated = void 0;
const doesTopNeedToBeSimulated = (ctx) => {
    const currentAUTUrl = ctx.getAUTUrl();
    // if the AUT url is undefined for whatever reason, return false as we do not want to complicate top simulation
    if (!currentAUTUrl) {
        return false;
    }
    // only simulate top if the AUT is NOT the primary super domain origin, meaning that we should treat the AUT as top
    // or the request is the AUT frame, which is common for redirects and navigations.
    return !ctx.remoteStates.isPrimarySuperDomainOrigin(currentAUTUrl) || ctx.req.isAUTFrame;
};
exports.doesTopNeedToBeSimulated = doesTopNeedToBeSimulated;
