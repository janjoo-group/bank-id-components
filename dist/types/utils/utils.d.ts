export declare function getQrCodeImageUrl(qrCode: string, options?: {}): Promise<string>;
export declare const useDevice: () => {
    isMobileOrTablet: boolean;
    isChromeOnAppleDevice: boolean;
    isFirefoxOnAppleDevice: boolean;
    isOperaTouchOnAppleDevice: boolean;
    isChromeOnAndroidMobile: boolean;
};
export declare function getHashParams(hash: string): {};
