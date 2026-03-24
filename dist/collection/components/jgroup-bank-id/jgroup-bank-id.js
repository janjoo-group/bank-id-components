import { Host, h, } from "@stencil/core";
import { getQrCodeImageUrl, useDevice, getHashParams } from "./../../utils/utils";
import { createTranslateFunction } from "./localization";
import { Alert, StartButton, CancelButton } from "./components";
import axios from "axios";
export class JgroupBankId {
    constructor() {
        /** Internal */
        this.axios = axios.create({ withCredentials: true, withXSRFToken: true });
        this.TAG = '[jgroup-bank-id]';
        this.propsValid = true;
        this.propsValidationErrorMessage = null;
        this.translate = createTranslateFunction(this.language);
        this.isPolling = false;
        this.currentTransactionId = null;
        this.type = undefined;
        this.signUrl = undefined;
        this.authUrl = undefined;
        this.collectUrl = undefined;
        this.cancelUrl = undefined;
        this.autoStartSingleOption = false;
        this.darkTheme = false;
        this.language = null;
        this.flowType = undefined;
        this.isMobileOrTablet = null;
        this.isStarting = false;
        this.isStartingOnAnotherDevice = false;
        this.isInProgress = null;
        this.isCancelling = null;
        this.statusHintCode = null;
        this.status = null;
        this.qrCodeImageUrl = null;
    }
    /** Watchers for prop validation */
    validateType(newValue) {
        if (!['auth', 'sign'].includes(newValue)) {
            this.throwError(`The 'type' attribute is required and must be either 'auth' or 'sign'.`);
        }
    }
    validateSignUrl(newValue) {
        if (this.type === 'sign' && newValue === undefined) {
            this.throwError(`The 'sign-url' attribute is required when 'type' is set to 'sign'.`);
        }
    }
    validateAuthUrl(newValue) {
        if (this.type === 'auth' && newValue === undefined) {
            this.throwError(`The 'auth-url' attribute is required when 'type' is set to 'auth'.`);
        }
    }
    validateCollectUrl(newValue) {
        if (!newValue)
            this.throwError(`The 'collect-url' attribute is required.`);
    }
    validateCancelUrl(newValue) {
        if (!newValue)
            this.throwError(`The 'cancel-url' attribute is required.`);
    }
    /** Visibility change listener */
    handleVisibilityChange() {
        var _a;
        if (document.visibilityState === 'hidden')
            return;
        const hashParams = getHashParams(location.hash);
        const userStarted = ((_a = window.history.state) === null || _a === void 0 ? void 0 : _a.triggeredByUser) === true;
        const flowInitiated = hashParams.initiated !== undefined;
        // Only resume polling if the flow was genuinely started
        if (this.isInProgress && !this.isPolling && this.currentTransactionId && (flowInitiated || userStarted)) {
            this.pollCollect(this.currentTransactionId);
        }
    }
    /** Lifecycle */
    componentWillLoad() {
        this.validateProps();
        window.history.replaceState({}, null);
        this.init = this.init.bind(this);
        this.startOnAnotherDevice = this.startOnAnotherDevice.bind(this);
        this.pollCollect = this.pollCollect.bind(this);
        this.reset = this.reset.bind(this);
        this.cancel = this.cancel.bind(this);
        this.setFlowTypeBasedOnDevice();
        if (this.autoStartSingleOption && !this.isMobileOrTablet && this.flowType === 'qr') {
            setTimeout(() => this.init(), 0);
        }
    }
    /** UI Rendering */
    render() {
        if (!this.propsValid)
            return h("p", null, this.propsValidationErrorMessage);
        return (h(Host, null, this.isInProgress === null && (h("div", { class: "flex flex-col items-center" }, h(StartButton, { isOutlined: false, darkTheme: this.darkTheme, onClick: this.init, isLoading: this.isStarting && !this.isStartingOnAnotherDevice, text: this.flowType === 'qr' && !this.isStartingOnAnotherDevice
                ? this.translate('start-qr')
                : this.translate('start-app') }), this.isMobileOrTablet && (h("div", { class: "mt-4" }, h(StartButton, { isOutlined: true, darkTheme: this.darkTheme, onClick: this.startOnAnotherDevice, isLoading: this.isStarting && this.isStartingOnAnotherDevice, text: this.translate('start-qr-another-device') }))))), this.shouldRenderStatusHint && (h(Alert, { message: this.translate(`hintcode-${this.flowType}-${this.statusHintCode || 'unknown'}`, `hintcode-${this.statusHintCode || 'unknown'}`), type: this.status === 'failed' ? 'error' : 'info', tryAgainButtonText: this.translate('try-again'), onTryAgainButtonClick: this.reset, darkTheme: this.darkTheme })), this.shouldRenderQrImage && (h("img", { src: this.qrCodeImageUrl, class: "mx-auto mb-4 animate-fade" })), this.shouldRenderCancelButton && (h("p", { class: "text-center animate-fade" }, h(CancelButton, { onClick: this.cancel, text: this.translate('cancel'), isLoading: this.isCancelling, darkTheme: this.darkTheme })))));
    }
    /** Computed */
    get shouldRenderCancelButton() {
        return this.flowType === 'qr' && (this.isInProgress || this.isCancelling);
    }
    get shouldRenderQrImage() {
        return this.isInProgress && this.flowType === 'qr' && this.qrCodeImageUrl !== null;
    }
    get shouldRenderStatusHint() {
        return this.statusHintCode !== null && this.isInProgress !== null;
    }
    /** Actions */
    startOnAnotherDevice() {
        this.isStartingOnAnotherDevice = true;
        this.flowType = 'qr';
        this.init();
    }
    setFlowTypeBasedOnDevice() {
        const { isMobileOrTablet } = useDevice();
        this.isMobileOrTablet = isMobileOrTablet;
        this.flowType = isMobileOrTablet ? 'app' : 'qr';
    }
    validateProps() {
        try {
            this.validateType(this.type);
            this.validateSignUrl(this.signUrl);
            this.validateAuthUrl(this.authUrl);
            this.validateCollectUrl(this.collectUrl);
            this.validateCancelUrl(this.cancelUrl);
        }
        catch (error) {
            this.propsValid = false;
            this.propsValidationErrorMessage = error.message;
            console.error(error);
        }
    }
    throwError(message) {
        throw new Error(`${this.TAG} ${message}`);
    }
    async init() {
        const url = this.type === 'auth' ? this.authUrl : this.signUrl;
        this.isStarting = true;
        const transaction = await this.post(url);
        if (!transaction) {
            this.reset();
            this.throwError(`Failed starting '${this.type}' transaction`);
            return;
        }
        this.started.emit();
        window.history.pushState({ triggeredByUser: true }, null);
        await this.handleInitComplete(transaction);
    }
    async handleInitComplete({ autoStartToken, transactionId }) {
        this.currentTransactionId = transactionId;
        if (this.flowType === 'qr') {
            this.isStarting = false;
            this.isInProgress = true;
            await this.pollCollect(transactionId);
        }
        else if (this.flowType === 'app') {
            const returnUrl = this.createReturnUrl();
            window.location.href = `https://app.bankid.com/?autostarttoken=${autoStartToken}&redirect=${returnUrl}`;
        }
    }
    async pollCollect(transactionId = null) {
        if (this.isPolling || !this.isInProgress)
            return;
        this.isPolling = true;
        while (this.isPolling && !this.isCancelling) {
            const response = await this.post(this.collectUrl);
            if (!response) {
                console.warn(`${this.TAG} pollCollect returned null`);
                this.isPolling = false;
                if (this.flowType === 'app')
                    await this.reset();
                break;
            }
            if (transactionId && response.transactionId !== transactionId) {
                console.error(`${this.TAG} transactionId mismatch`);
                this.isPolling = false;
                await this.reset();
                break;
            }
            if (this.flowType === 'qr') {
                this.qrCodeImageUrl = await getQrCodeImageUrl(response.qrCode);
            }
            this.statusHintCode = response.hintCode;
            this.status = response.status;
            switch (response.status) {
                case 'pending':
                    await this.delay(1000);
                    break;
                case 'failed':
                    this.isPolling = false;
                    this.isInProgress = false;
                    break;
                case 'complete':
                    this.isPolling = false;
                    this.isInProgress = false;
                    this.statusHintCode = null;
                    window.location.hash = '';
                    this.completed.emit(response);
                    break;
                default:
                    console.warn(`${this.TAG} pollCollect returned unknown status '${response.status}'`);
                    this.isPolling = false;
                    break;
            }
        }
    }
    async cancel() {
        if (this.isCancelling || !this.isInProgress)
            return;
        this.isCancelling = true;
        this.isPolling = false;
        try {
            await this.post(this.cancelUrl);
        }
        finally {
            this.isCancelling = false;
            await this.reset(true); // skip the cancel request inside reset
        }
        this.cancelled.emit();
    }
    async reset(skipCancel = false) {
        if (this.isInProgress && !skipCancel) {
            this.isCancelling = true;
            await this.post(this.cancelUrl);
        }
        window.history.pushState({}, null);
        this.isInProgress = null;
        this.isStarting = false;
        this.isStartingOnAnotherDevice = false;
        this.isCancelling = null;
        this.statusHintCode = null;
        this.status = null;
        this.qrCodeImageUrl = null;
        this.setFlowTypeBasedOnDevice();
        this.isPolling = false;
    }
    createReturnUrl() {
        const device = useDevice();
        const location = window.location.href.replace('#', '');
        if (device.isChromeOnAppleDevice || device.isChromeOnAndroidMobile)
            return encodeURIComponent('googlechrome://');
        if (device.isFirefoxOnAppleDevice)
            return encodeURIComponent('firefox://');
        if (device.isOperaTouchOnAppleDevice)
            return encodeURIComponent(`${location.replace('http', 'touch-http')}#initiated=true`);
        return encodeURIComponent(`${location}#initiated=true`);
    }
    async post(url) {
        try {
            const response = await this.axios.post(url);
            return response.data;
        }
        catch (error) {
            console.error(`${this.TAG} request failed`, error);
            return null;
        }
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    static get is() { return "jgroup-bank-id"; }
    static get encapsulation() { return "shadow"; }
    static get originalStyleUrls() {
        return {
            "$": ["jgroup-bank-id.css"]
        };
    }
    static get styleUrls() {
        return {
            "$": ["jgroup-bank-id.css"]
        };
    }
    static get assetsDirs() { return ["./../assets"]; }
    static get properties() {
        return {
            "type": {
                "type": "string",
                "mutable": false,
                "complexType": {
                    "original": "'auth' | 'sign'",
                    "resolved": "\"auth\" | \"sign\"",
                    "references": {}
                },
                "required": false,
                "optional": false,
                "docs": {
                    "tags": [],
                    "text": "Props"
                },
                "attribute": "type",
                "reflect": false
            },
            "signUrl": {
                "type": "string",
                "mutable": false,
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "required": false,
                "optional": false,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "attribute": "sign-url",
                "reflect": false
            },
            "authUrl": {
                "type": "string",
                "mutable": false,
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "required": false,
                "optional": false,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "attribute": "auth-url",
                "reflect": false
            },
            "collectUrl": {
                "type": "string",
                "mutable": false,
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "required": false,
                "optional": false,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "attribute": "collect-url",
                "reflect": false
            },
            "cancelUrl": {
                "type": "string",
                "mutable": false,
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "required": false,
                "optional": false,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "attribute": "cancel-url",
                "reflect": false
            },
            "autoStartSingleOption": {
                "type": "boolean",
                "mutable": false,
                "complexType": {
                    "original": "false",
                    "resolved": "boolean",
                    "references": {}
                },
                "required": false,
                "optional": false,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "attribute": "auto-start-single-option",
                "reflect": false,
                "defaultValue": "false"
            },
            "darkTheme": {
                "type": "boolean",
                "mutable": false,
                "complexType": {
                    "original": "false",
                    "resolved": "boolean",
                    "references": {}
                },
                "required": false,
                "optional": false,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "attribute": "dark-theme",
                "reflect": false,
                "defaultValue": "false"
            },
            "language": {
                "type": "string",
                "mutable": false,
                "complexType": {
                    "original": "'sv' | 'en'",
                    "resolved": "\"en\" | \"sv\"",
                    "references": {}
                },
                "required": false,
                "optional": false,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "attribute": "language",
                "reflect": false,
                "defaultValue": "null"
            }
        };
    }
    static get states() {
        return {
            "flowType": {},
            "isMobileOrTablet": {},
            "isStarting": {},
            "isStartingOnAnotherDevice": {},
            "isInProgress": {},
            "isCancelling": {},
            "statusHintCode": {},
            "status": {},
            "qrCodeImageUrl": {}
        };
    }
    static get events() {
        return [{
                "method": "cancelled",
                "name": "cancelled",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Events"
                },
                "complexType": {
                    "original": "any",
                    "resolved": "any",
                    "references": {}
                }
            }, {
                "method": "completed",
                "name": "completed",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "any",
                    "resolved": "any",
                    "references": {}
                }
            }, {
                "method": "started",
                "name": "started",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "any",
                    "resolved": "any",
                    "references": {}
                }
            }];
    }
    static get watchers() {
        return [{
                "propName": "type",
                "methodName": "validateType"
            }, {
                "propName": "signUrl",
                "methodName": "validateSignUrl"
            }, {
                "propName": "authUrl",
                "methodName": "validateAuthUrl"
            }, {
                "propName": "collectUrl",
                "methodName": "validateCollectUrl"
            }, {
                "propName": "cancelUrl",
                "methodName": "validateCancelUrl"
            }];
    }
    static get listeners() {
        return [{
                "name": "visibilitychange",
                "method": "handleVisibilityChange",
                "target": "document",
                "capture": false,
                "passive": false
            }];
    }
}
//# sourceMappingURL=jgroup-bank-id.js.map
