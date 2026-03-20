export declare function getQrCodeImageUrl(qrCode: string, options?: {}): Promise<any>;
export declare const useDevice: () => {
    isMobileOrTablet: boolean;
    isChromeOnAppleDevice: boolean;
    isFirefoxOnAppleDevice: boolean;
    isOperaTouchOnAppleDevice: boolean;
    isChromeOnAndroidMobile: boolean;
};
export declare function readCookie(name: string): string;
export declare function getHashParams(hash: string): {};
