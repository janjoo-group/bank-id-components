import { EventEmitter } from '../../stencil-public-runtime';
export declare class JgroupBankId {
    /** Events */
    cancelled: EventEmitter;
    completed: EventEmitter;
    started: EventEmitter;
    /** Props */
    readonly type: 'auth' | 'sign';
    readonly signUrl: string;
    readonly authUrl: string;
    readonly collectUrl: string;
    readonly cancelUrl: string;
    readonly autoStartSingleOption = false;
    readonly darkTheme = false;
    readonly language: 'sv' | 'en';
    /** Watchers for prop validation */
    validateType(newValue: string): void;
    validateSignUrl(newValue: string): void;
    validateAuthUrl(newValue: string): void;
    validateCollectUrl(newValue: string): void;
    validateCancelUrl(newValue: string): void;
    /** Visibility change listener */
    handleVisibilityChange(): void;
    /** State */
    flowType: 'app' | 'qr';
    isMobileOrTablet: any;
    isStarting: boolean;
    isStartingOnAnotherDevice: boolean;
    isInProgress: any;
    isCancelling: any;
    statusHintCode: string;
    status: string;
    qrCodeImageUrl: string;
    /** Internal */
    private axios;
    private TAG;
    private propsValid;
    private propsValidationErrorMessage;
    private translate;
    private isPolling;
    private currentTransactionId;
    /** Lifecycle */
    componentWillLoad(): void;
    /** UI Rendering */
    render(): any;
    /** Computed */
    private get shouldRenderCancelButton();
    private get shouldRenderQrImage();
    private get shouldRenderStatusHint();
    /** Actions */
    private startOnAnotherDevice;
    private setFlowTypeBasedOnDevice;
    private validateProps;
    private throwError;
    private init;
    private handleInitComplete;
    private pollCollect;
    private cancel;
    private reset;
    private createReturnUrl;
    private post;
    private delay;
}
