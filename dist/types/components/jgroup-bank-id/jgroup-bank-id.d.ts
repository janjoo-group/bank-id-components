import { EventEmitter } from '../../stencil-public-runtime';
export declare class JgroupBankId {
    /**
     * Emitted when the BankID process is completed
     */
    completed: EventEmitter;
    /**
     * The type of BankID action to perform
     */
    readonly type: 'auth' | 'sign';
    validateType(newValue: string): void;
    /**
     * The URL responsible for initiating a sign process
     */
    readonly signUrl: string;
    validateSignUrl(newValue: string): void;
    /**
     * The URL responsible for initiating an auth process
     */
    readonly authUrl: string;
    validateAuthUrl(newValue: string): void;
    /**
     * The URL responsible for collecting the status of the process
     */
    readonly collectUrl: string;
    validateCollectUrl(newValue: string): void;
    /**
     * The URL responsible for cancelling a started process
     */
    readonly cancelUrl: string;
    validateCancelUrl(newValue: string): void;
    handleVisibilityChange(): void;
    /**
     * Whether to use the dark theme
     */
    readonly darkTheme = false;
    /**
     * The language to use for localization
     */
    readonly language: 'sv' | 'en';
    flowType: 'app' | 'qr';
    isMobileOrTablet: any;
    isStarting: boolean;
    isStartingOnAnotherDevice: boolean;
    isInProgress: any;
    isCancelling: any;
    statusHintCode: string;
    status: string;
    qrCodeImageUrl: string;
    private timeout;
    private TAG;
    private propsValid;
    private propsValidationErrorMessage;
    private translate;
    componentWillLoad(): void;
    render(): any;
    private get shouldRenderCancelButton();
    private get shouldRenderQrImage();
    private get shouldRenderStatusHint();
    private startOnAnotherDevice;
    private setFlowTypeBasedOnDevice;
    private validateProps;
    private throwError;
    private init;
    private handleInitComplete;
    private pollCollect;
    private reset;
    private createReturnUrl;
    private post;
}
