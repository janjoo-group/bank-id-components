import { B as BUILD, c as consoleDevInfo, H, d as doc, N as NAMESPACE, p as promiseResolve, b as bootstrapLazy } from './p-ca100485.js';
export { s as setNonce } from './p-ca100485.js';
import { g as globalScripts } from './p-e1255160.js';

/*
 Stencil Client Patch Browser v4.11.0 | MIT Licensed | https://stenciljs.com
 */
const patchBrowser = () => {
    // NOTE!! This fn cannot use async/await!
    if (BUILD.isDev && !BUILD.isTesting) {
        consoleDevInfo('Running in development mode.');
    }
    if (BUILD.cloneNodeFix) {
        // opted-in to polyfill cloneNode() for slot polyfilled components
        patchCloneNodeFix(H.prototype);
    }
    const scriptElm = BUILD.scriptDataOpts
        ? Array.from(doc.querySelectorAll('script')).find((s) => new RegExp(`\/${NAMESPACE}(\\.esm)?\\.js($|\\?|#)`).test(s.src) ||
            s.getAttribute('data-stencil-namespace') === NAMESPACE)
        : null;
    const importMeta = import.meta.url;
    const opts = BUILD.scriptDataOpts ? (scriptElm || {})['data-opts'] || {} : {};
    if (importMeta !== '') {
        opts.resourcesUrl = new URL('.', importMeta).href;
    }
    return promiseResolve(opts);
};
const patchCloneNodeFix = (HTMLElementPrototype) => {
    const nativeCloneNodeFn = HTMLElementPrototype.cloneNode;
    HTMLElementPrototype.cloneNode = function (deep) {
        if (this.nodeName === 'TEMPLATE') {
            return nativeCloneNodeFn.call(this, deep);
        }
        const clonedNode = nativeCloneNodeFn.call(this, false);
        const srcChildNodes = this.childNodes;
        if (deep) {
            for (let i = 0; i < srcChildNodes.length; i++) {
                // Node.ATTRIBUTE_NODE === 2, and checking because IE11
                if (srcChildNodes[i].nodeType !== 2) {
                    clonedNode.appendChild(srcChildNodes[i].cloneNode(true));
                }
            }
        }
        return clonedNode;
    };
};

patchBrowser().then(options => {
  globalScripts();
  return bootstrapLazy([["p-73ba5ff7",[[1,"jgroup-bank-id",{"type":[1],"signUrl":[1,"sign-url"],"authUrl":[1,"auth-url"],"collectUrl":[1,"collect-url"],"cancelUrl":[1,"cancel-url"],"darkTheme":[4,"dark-theme"],"language":[1],"flowType":[32],"isMobileOrTablet":[32],"isStarting":[32],"isStartingOnAnotherDevice":[32],"isInProgress":[32],"isCancelling":[32],"statusHintCode":[32],"status":[32],"qrCodeImageUrl":[32]},[[4,"visibilitychange","handleVisibilityChange"]],{"type":["validateType"],"signUrl":["validateSignUrl"],"authUrl":["validateAuthUrl"],"collectUrl":["validateCollectUrl"],"cancelUrl":["validateCancelUrl"]}]]]], options);
});

//# sourceMappingURL=jgroup-bank-id-components.esm.js.map