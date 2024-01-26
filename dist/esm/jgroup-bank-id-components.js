import { p as promiseResolve, b as bootstrapLazy } from './index-4b53258b.js';
export { s as setNonce } from './index-4b53258b.js';

/*
 Stencil Client Patch Browser v4.11.0 | MIT Licensed | https://stenciljs.com
 */
const patchBrowser = () => {
    const importMeta = import.meta.url;
    const opts = {};
    if (importMeta !== '') {
        opts.resourcesUrl = new URL('.', importMeta).href;
    }
    return promiseResolve(opts);
};

patchBrowser().then(options => {
  return bootstrapLazy([["jgroup-bank-id",[[1,"jgroup-bank-id",{"type":[1],"signUrl":[1,"sign-url"],"authUrl":[1,"auth-url"],"collectUrl":[1,"collect-url"],"cancelUrl":[1,"cancel-url"],"darkTheme":[4,"dark-theme"],"language":[1],"flowType":[32],"isMobileOrTablet":[32],"isStarting":[32],"isStartingOnAnotherDevice":[32],"isInProgress":[32],"isCancelling":[32],"statusHintCode":[32],"status":[32],"qrCodeImageUrl":[32]},[[4,"visibilitychange","handleVisibilityChange"]],{"type":["validateType"],"signUrl":["validateSignUrl"],"authUrl":["validateAuthUrl"],"collectUrl":["validateCollectUrl"],"cancelUrl":["validateCancelUrl"]}]]]], options);
});

//# sourceMappingURL=jgroup-bank-id-components.js.map