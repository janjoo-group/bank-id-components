import { EventEmitter } from '../../stencil-public-runtime';
export declare class JgroupBankId {
    /** Events */
    /** Fired whenever the widget returns to its idle state - the cancel button, "try again" after a failure, or an unexpected drop mid-flow. Use it to reset any "a BankID attempt is in progress" state a consuming app keeps of its own. */
    cancelled: EventEmitter;
    /** Fired once collect() resolves with a terminal 'complete' status - detail carries the raw collect response, success or business-logic error. */
    completed: EventEmitter;
    /** Fired once the initial auth/sign request has succeeded and a transaction is under way - detail carries { flowType }, so consumers can tell the same-device app hand-off (flowType: 'app', which then shows nothing of its own until the visitor returns) apart from the qr flow's own continuously-updating UI. */
    started: EventEmitter;
    /** Props */
    /** Whether this widget performs an authentication or a signing flow. */
    readonly type: 'auth' | 'sign';
    /** Endpoint that starts a signing transaction - required when type is 'sign'. */
    readonly signUrl: string;
    /** Endpoint that starts an authentication transaction - required when type is 'auth'. */
    readonly authUrl: string;
    /** Endpoint polled for the transaction's current status. */
    readonly collectUrl: string;
    /** Endpoint called to cancel an in-progress transaction. */
    readonly cancelUrl: string;
    /** Auto-starts the flow immediately on mount, skipping the start button - desktop (qr flow) only. */
    readonly autoStartSingleOption = false;
    /** Renders the widget with its dark color scheme. */
    readonly darkTheme = false;
    /** Corner style for the start button and its BankID badge: 'full' (the default) is a pill/circle, 'md' is still visibly rounded (rounded-xl/rounded-lg) but not a full pill/circle. */
    readonly rounded: 'full' | 'md';
    /** UI language for all widget copy. */
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
    isMobileOrTablet: boolean;
    isStarting: boolean;
    isStartingOnAnotherDevice: boolean;
    isInProgress: boolean;
    isCancelling: boolean;
    statusHintCode: string | null;
    status: string | null;
    qrCodeImageUrl: string | null;
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
    private get shouldRenderAppInProgressMessage();
    private get shouldRenderStatusHint();
    private get shouldRenderStartButtons();
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
