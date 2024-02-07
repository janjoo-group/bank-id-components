import { Host, h, } from "@stencil/core";
import { getQrCodeImageUrl, useDevice, readCookie, getHashParams, } from "./../../utils/utils";
import { createTranslateFunction } from "./localization";
import { Alert, StartButton, CancelButton } from "./components";
export class JgroupBankId {
    constructor() {
        this.timeout = null;
        this.TAG = '[jgroup-bank-id]';
        this.propsValid = true;
        this.propsValidationErrorMessage = null;
        this.translate = createTranslateFunction(this.language);
        this.type = undefined;
        this.signUrl = undefined;
        this.authUrl = undefined;
        this.collectUrl = undefined;
        this.cancelUrl = undefined;
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
        if (newValue === undefined) {
            this.throwError(`The 'collect-url' attribute is required.`);
        }
    }
    validateCancelUrl(newValue) {
        if (newValue === undefined) {
            this.throwError(`The 'cancel-url' attribute is required.`);
        }
    }
    handleVisibilityChange() {
        const hashParams = getHashParams(location.hash);
        if (hashParams.initiated !== undefined ||
            window.history.state.triggeredByUser === true) {
            this.flowType = 'app';
            this.isInProgress = true;
            this.pollCollect();
        }
    }
    componentWillLoad() {
        this.validateProps();
        this.init = this.init.bind(this);
        this.startOnAnotherDevice = this.startOnAnotherDevice.bind(this);
        this.pollCollect = this.pollCollect.bind(this);
        this.reset = this.reset.bind(this);
        this.setFlowTypeBasedOnDevice();
    }
    render() {
        if (!this.propsValid) {
            return h("p", null, this.propsValidationErrorMessage);
        }
        return (h(Host, null, this.isInProgress === null ? (h("div", { class: "flex flex-col items-center" }, h(StartButton, { isOutlined: false, darkTheme: this.darkTheme, onClick: this.init, isLoading: this.isStarting && !this.isStartingOnAnotherDevice, text: this.flowType === 'qr' && !this.isStartingOnAnotherDevice
                ? this.translate('start-qr')
                : this.translate('start-app') }), this.isMobileOrTablet ? (h("div", { class: "mt-4" }, h(StartButton, { isOutlined: true, darkTheme: this.darkTheme, onClick: this.startOnAnotherDevice, isLoading: this.isStarting && this.isStartingOnAnotherDevice, text: this.translate('start-qr-another-device') }))) : (''))) : (''), this.shouldRenderStatusHint ? (h(Alert, { message: this.translate(`hintcode-${this.flowType}-${this.statusHintCode || 'unknown'}`, `hintcode-${this.statusHintCode || 'unknown'}`), type: this.status === 'failed' ? 'error' : 'info', tryAgainButtonText: this.translate('try-again'), onTryAgainButtonClick: this.reset })) : (''), this.shouldRenderQrImage ? (h("img", { src: this.qrCodeImageUrl, class: "mx-auto mb-4 animate-fade" })) : (''), this.shouldRenderCancelButton ? (h("p", { class: "text-center animate-fade" }, h(CancelButton, { onClick: this.reset, text: this.translate('cancel'), isLoading: this.isCancelling }))) : ('')));
    }
    get shouldRenderCancelButton() {
        return this.flowType === 'qr' && this.isInProgress && this.timeout !== null;
    }
    get shouldRenderQrImage() {
        return (this.isInProgress &&
            this.flowType === 'qr' &&
            this.qrCodeImageUrl !== null);
    }
    get shouldRenderStatusHint() {
        return (this.statusHintCode !== null &&
            this.statusHintCode !== undefined &&
            this.isInProgress !== null);
    }
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
        if (transaction === null) {
            this.reset();
            this.throwError(`Failed starting '${this.type}' transaction`);
            return;
        }
        window.history.pushState({ triggeredByUser: true }, null);
        return this.handleInitComplete(transaction);
    }
    async handleInitComplete({ autoStartToken, transactionId }) {
        if (this.flowType === 'qr') {
            await this.pollCollect(transactionId);
            this.isStarting = false;
            this.isInProgress = true;
        }
        else if (this.flowType === 'app') {
            const returnUrl = this.createReturnUrl();
            window.location.href = `https://app.bankid.com/?autostarttoken=${autoStartToken}&redirect=${returnUrl}`;
        }
    }
    pollCollect(transactionId = null) {
        const getResult = async () => {
            const response = await this.post(this.collectUrl);
            if (response === null) {
                console.warn(`${this.TAG} pollCollect returned null, clearing timeout`);
                clearTimeout(this.timeout);
                if (this.flowType === 'app') {
                    this.reset();
                }
                return;
            }
            if (transactionId && response.transactionId !== transactionId) {
                await this.reset();
                console.error(`${this.TAG} resetting: initial transactionId '${transactionId}' does not match the one returned from collect '${response.transactionId}'.`);
                return;
            }
            if (this.flowType === 'qr') {
                this.qrCodeImageUrl = await getQrCodeImageUrl(response.qrCode);
            }
            this.statusHintCode = response.hintCode;
            this.status = response.status;
            switch (response.status) {
                case 'pending':
                    this.timeout = setTimeout(() => {
                        getResult();
                    }, 1000);
                    break;
                case 'failed':
                    this.isInProgress = false;
                    break;
                case 'complete':
                    this.isInProgress = false;
                    window.location.hash = '';
                    this.completed.emit(response);
                    this.reset();
                    break;
                default:
                    console.warn(`${this.TAG} pollCollect returned unknown status '${response.status}'`);
                    break;
            }
        };
        return getResult();
    }
    async reset() {
        if (this.isInProgress) {
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
        clearTimeout(this.timeout);
    }
    createReturnUrl() {
        const device = useDevice();
        const location = window.location.href.replace('#', '');
        if (device.isChromeOnAppleDevice || device.isChromeOnAndroidMobile) {
            return encodeURIComponent('googlechrome://');
        }
        if (device.isFirefoxOnAppleDevice) {
            return encodeURIComponent('firefox://');
        }
        if (device.isOperaTouchOnAppleDevice) {
            return encodeURIComponent(`${location.replace('http', 'touch-http')}#initiated=true`);
        }
        return encodeURIComponent(`${location}#initiated=true`);
    }
    async post(url) {
        const xsrfCookieName = 'XSRF-TOKEN';
        const xsrfToken = readCookie(xsrfCookieName);
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };
        if (xsrfToken !== undefined) {
            headers['X-XSRF-TOKEN'] = xsrfToken;
        }
        try {
            const response = await window.fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers,
            });
            if (!response.ok) {
                return null;
            }
            return await response.json();
        }
        catch (error) {
            return null;
        }
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
                    "text": "The type of BankID action to perform"
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
                    "text": "The URL responsible for initiating a sign process"
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
                    "text": "The URL responsible for initiating an auth process"
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
                    "text": "The URL responsible for collecting the status of the process"
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
                    "text": "The URL responsible for cancelling a started process"
                },
                "attribute": "cancel-url",
                "reflect": false
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
                    "text": "Whether to use the dark theme"
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
                    "text": "The language to use for localization"
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
                "method": "completed",
                "name": "completed",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when the BankID process is completed"
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
