'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const index = require('./index-6df75335.js');

/*
 Stencil Client Patch Browser v4.11.0 | MIT Licensed | https://stenciljs.com
 */
const patchBrowser = () => {
    const importMeta = (typeof document === 'undefined' ? new (require('u' + 'rl').URL)('file:' + __filename).href : (document.currentScript && document.currentScript.src || new URL('jgroup-bank-id-components.cjs.js', document.baseURI).href));
    const opts = {};
    if (importMeta !== '') {
        opts.resourcesUrl = new URL('.', importMeta).href;
    }
    return index.promiseResolve(opts);
};

patchBrowser().then(options => {
  return index.bootstrapLazy([["jgroup-bank-id.cjs",[[1,"jgroup-bank-id",{"type":[1],"signUrl":[1,"sign-url"],"authUrl":[1,"auth-url"],"collectUrl":[1,"collect-url"],"cancelUrl":[1,"cancel-url"],"darkTheme":[4,"dark-theme"],"language":[1],"flowType":[32],"isMobileOrTablet":[32],"isStarting":[32],"isStartingOnAnotherDevice":[32],"isInProgress":[32],"isCancelling":[32],"statusHintCode":[32],"status":[32],"qrCodeImageUrl":[32]},[[4,"visibilitychange","handleVisibilityChange"]],{"type":["validateType"],"signUrl":["validateSignUrl"],"authUrl":["validateAuthUrl"],"collectUrl":["validateCollectUrl"],"cancelUrl":["validateCancelUrl"]}]]]], options);
});

exports.setNonce = index.setNonce;

//# sourceMappingURL=jgroup-bank-id-components.cjs.js.map