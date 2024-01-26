import QRLib from "qrcode";
import isMobileLib from "is-mobile";
export async function getQrCodeImageUrl(qrCode, options = {}) {
    try {
        return await QRLib.toDataURL(qrCode, Object.assign({ width: 200, margin: 2, errorCorrectionLevel: 'L' }, options));
    }
    catch (error) {
        return null;
    }
}
export const useDevice = () => {
    const isMobileOrTablet = isMobileLib({ tablet: true, featureDetect: true });
    const isChromeOnAppleDevice = Boolean(navigator.userAgent.match(/CriOS/));
    const isFirefoxOnAppleDevice = Boolean(navigator.userAgent.match(/FxiOS/));
    const isOperaTouchOnAppleDevice = Boolean(navigator.userAgent.match(/OPT/));
    return {
        isMobileOrTablet,
        isChromeOnAppleDevice,
        isFirefoxOnAppleDevice,
        isOperaTouchOnAppleDevice,
    };
};
export function readCookie(name) {
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match !== null ? decodeURIComponent(match[3]) : null;
}
export function getHashParams(hash) {
    if (hash === undefined) {
        return {};
    }
    const params = new URLSearchParams(hash.substring(1));
    return [...params.entries()].reduce((acc, curr) => (Object.assign(Object.assign({}, acc), { [curr[0]]: curr[1] })), {});
}
//# sourceMappingURL=utils.js.map
