import QRLib from "qrcode";
import isMobileLib from "is-mobile";
export async function getQrCodeImageUrl(qrCode, options = {}) {
    try {
        return await QRLib.toDataURL(qrCode, Object.assign({ width: 200,
            // The QR spec's recommended minimum quiet zone is 4 modules - this
            // was below that at 2. Can't make the pattern itself less dense
            // (that's BankID's own token payload length + errorCorrectionLevel,
            // already at 'L', the lowest/sparsest level) without either
            // breaking the real flow or hurting scan reliability, but more
            // margin gives the actual pattern more breathing room and, as a
            // side effect, more context for a camera's own finder-pattern
            // detection - a pure improvement, not just cosmetic.
            margin: 4, errorCorrectionLevel: 'L' }, options));
    }
    catch (_a) {
        return null;
    }
}
export const useDevice = () => {
    const isMobileOrTablet = isMobileLib({ tablet: true, featureDetect: true });
    const isChromeOnAppleDevice = Boolean(navigator.userAgent.match(/CriOS/));
    const isFirefoxOnAppleDevice = Boolean(navigator.userAgent.match(/FxiOS/));
    const isOperaTouchOnAppleDevice = Boolean(navigator.userAgent.match(/OPT/));
    const isChromeOnAndroidMobile = Boolean(navigator.userAgent.match(/Android/) && navigator.userAgent.match(/Chrome/));
    return {
        isMobileOrTablet,
        isChromeOnAppleDevice,
        isFirefoxOnAppleDevice,
        isOperaTouchOnAppleDevice,
        isChromeOnAndroidMobile,
    };
};
export function getHashParams(hash) {
    if (hash === undefined) {
        return {};
    }
    const params = new URLSearchParams(hash.substring(1));
    return [...params.entries()].reduce((acc, curr) => (Object.assign(Object.assign({}, acc), { [curr[0]]: curr[1] })), {});
}
//# sourceMappingURL=utils.js.map
