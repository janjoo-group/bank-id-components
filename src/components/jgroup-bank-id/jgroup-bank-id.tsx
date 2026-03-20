import {
  Component,
  Host,
  Prop,
  State,
  h,
  Watch,
  Listen,
  Event,
  EventEmitter,
} from '@stencil/core';
import { getQrCodeImageUrl, useDevice, getHashParams } from './../../utils/utils';
import { createTranslateFunction } from './localization';
import { Alert, StartButton, CancelButton } from './components';
import axios from 'axios';

@Component({
  tag: 'jgroup-bank-id',
  styleUrl: 'jgroup-bank-id.css',
  shadow: true,
  assetsDirs: ['./../assets'],
})
export class JgroupBankId {
  /** Events */
  @Event() cancelled: EventEmitter;
  @Event() completed: EventEmitter;
  @Event() started: EventEmitter;

  /** Props */
  @Prop() readonly type: 'auth' | 'sign';
  @Prop() readonly signUrl: string;
  @Prop() readonly authUrl: string;
  @Prop() readonly collectUrl: string;
  @Prop() readonly cancelUrl: string;
  @Prop() readonly autoStartSingleOption = false;
  @Prop() readonly darkTheme = false;
  @Prop() readonly language: 'sv' | 'en' = null;

  /** Watchers for prop validation */
  @Watch('type')
  validateType(newValue: string) {
    if (!['auth', 'sign'].includes(newValue)) {
      this.throwError(`The 'type' attribute is required and must be either 'auth' or 'sign'.`);
    }
  }

  @Watch('signUrl')
  validateSignUrl(newValue: string) {
    if (this.type === 'sign' && newValue === undefined) {
      this.throwError(`The 'sign-url' attribute is required when 'type' is set to 'sign'.`);
    }
  }

  @Watch('authUrl')
  validateAuthUrl(newValue: string) {
    if (this.type === 'auth' && newValue === undefined) {
      this.throwError(`The 'auth-url' attribute is required when 'type' is set to 'auth'.`);
    }
  }

  @Watch('collectUrl')
  validateCollectUrl(newValue: string) {
    if (!newValue) this.throwError(`The 'collect-url' attribute is required.`);
  }

  @Watch('cancelUrl')
  validateCancelUrl(newValue: string) {
    if (!newValue) this.throwError(`The 'cancel-url' attribute is required.`);
  }

  /** Visibility change listener */
  @Listen('visibilitychange', { target: 'document' })
  handleVisibilityChange() {
    if (document.visibilityState === 'hidden') return;

    const hashParams: { initiated?: string } = getHashParams(location.hash);
    if (hashParams.initiated !== undefined || window.history.state?.triggeredByUser === true) {
      this.flowType = 'app';
      this.isInProgress = true;
      this.pollCollect();
    }
  }

  /** State */
  @State() flowType: 'app' | 'qr';
  @State() isMobileOrTablet = null;
  @State() isStarting = false;
  @State() isStartingOnAnotherDevice = false;
  @State() isInProgress = null;
  @State() isCancelling = null;
  @State() statusHintCode: string = null;
  @State() status: string = null;
  @State() qrCodeImageUrl: string = null;

  /** Internal */
  private axios = axios.create({ withCredentials: true, withXSRFToken: true });
  private TAG = '[jgroup-bank-id]';
  private propsValid = true;
  private propsValidationErrorMessage = null;
  private translate = createTranslateFunction(this.language);
  private isPolling = false;

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
    if (!this.propsValid) return <p>{this.propsValidationErrorMessage}</p>;

    return (
      <Host>
        {this.isInProgress === null && (
          <div class="flex flex-col items-center">
            <StartButton
              isOutlined={false}
              darkTheme={this.darkTheme}
              onClick={this.init}
              isLoading={this.isStarting && !this.isStartingOnAnotherDevice}
              text={this.flowType === 'qr' && !this.isStartingOnAnotherDevice
                ? this.translate('start-qr')
                : this.translate('start-app')}
            />
            {this.isMobileOrTablet && (
              <div class="mt-4">
                <StartButton
                  isOutlined={true}
                  darkTheme={this.darkTheme}
                  onClick={this.startOnAnotherDevice}
                  isLoading={this.isStarting && this.isStartingOnAnotherDevice}
                  text={this.translate('start-qr-another-device')}
                />
              </div>
            )}
          </div>
        )}

        {this.shouldRenderStatusHint && (
          <Alert
            message={this.translate(
              `hintcode-${this.flowType}-${this.statusHintCode || 'unknown'}`,
              `hintcode-${this.statusHintCode || 'unknown'}`
            )}
            type={this.status === 'failed' ? 'error' : 'info'}
            tryAgainButtonText={this.translate('try-again')}
            onTryAgainButtonClick={this.reset}
            darkTheme={this.darkTheme}
          />
        )}

        {this.shouldRenderQrImage && (
          <img src={this.qrCodeImageUrl} class="mx-auto mb-4 animate-fade" />
        )}

        {this.shouldRenderCancelButton && (
          <p class="text-center animate-fade">
            <CancelButton
              onClick={this.cancel}
              text={this.translate('cancel')}
              isLoading={this.isCancelling}
              darkTheme={this.darkTheme}
            />
          </p>
        )}
      </Host>
    );
  }

  /** Computed */
  private get shouldRenderCancelButton() {
    return this.flowType === 'qr' && (this.isInProgress || this.isCancelling);
  }

  private get shouldRenderQrImage() {
    return this.isInProgress && this.flowType === 'qr' && this.qrCodeImageUrl !== null;
  }

  private get shouldRenderStatusHint() {
    return this.statusHintCode !== null && this.isInProgress !== null;
  }

  /** Actions */
  private startOnAnotherDevice() {
    this.isStartingOnAnotherDevice = true;
    this.flowType = 'qr';
    this.init();
  }

  private setFlowTypeBasedOnDevice() {
    const { isMobileOrTablet } = useDevice();
    this.isMobileOrTablet = isMobileOrTablet;
    this.flowType = isMobileOrTablet ? 'app' : 'qr';
  }

  private validateProps() {
    try {
      this.validateType(this.type);
      this.validateSignUrl(this.signUrl);
      this.validateAuthUrl(this.authUrl);
      this.validateCollectUrl(this.collectUrl);
      this.validateCancelUrl(this.cancelUrl);
    } catch (error) {
      this.propsValid = false;
      this.propsValidationErrorMessage = error.message;
      console.error(error);
    }
  }

  private throwError(message: string) {
    throw new Error(`${this.TAG} ${message}`);
  }

  private async init() {
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

  private async handleInitComplete({ autoStartToken, transactionId }) {
    if (this.flowType === 'qr') {
      this.isStarting = false;
      this.isInProgress = true;
      await this.pollCollect(transactionId);
    } else if (this.flowType === 'app') {
      const returnUrl = this.createReturnUrl();
      window.location.href = `https://app.bankid.com/?autostarttoken=${autoStartToken}&redirect=${returnUrl}`;
    }
  }

  private async pollCollect(transactionId: string = null) {
    if (this.isPolling || !this.isInProgress) return;

    this.isPolling = true;

    while (this.isPolling && !this.isCancelling) {
      const response = await this.post(this.collectUrl);

      if (!response) {
        console.warn(`${this.TAG} pollCollect returned null`);
        this.isPolling = false;
        if (this.flowType === 'app') await this.reset();
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

  private async cancel() {
    if (this.isCancelling || !this.isInProgress) return;

    this.isCancelling = true;
    this.isPolling = false;

    try {
      await this.post(this.cancelUrl);
    } finally {
      this.isCancelling = false;
      await this.reset(true); // skip the cancel request inside reset
    }

    this.cancelled.emit();
  }

  private async reset(skipCancel = false) {
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

  private createReturnUrl() {
    const device = useDevice();
    const location = window.location.href.replace('#', '');

    if (device.isChromeOnAppleDevice || device.isChromeOnAndroidMobile) return encodeURIComponent('googlechrome://');
    if (device.isFirefoxOnAppleDevice) return encodeURIComponent('firefox://');
    if (device.isOperaTouchOnAppleDevice) return encodeURIComponent(`${location.replace('http', 'touch-http')}#initiated=true`);

    return encodeURIComponent(`${location}#initiated=true`);
  }

  private async post(url: string) {
    try {
      const response = await this.axios.post(url);
      return response.data;
    } catch (error) {
      console.error(`${this.TAG} request failed`, error);
      return null;
    }
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}