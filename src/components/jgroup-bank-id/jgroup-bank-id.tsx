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
import {
  getQrCodeImageUrl,
  useDevice,
  // readCookie,
  getHashParams,
} from './../../utils/utils';
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
  /**
   * Emitted when the BankID process is completed
   */
  @Event() completed: EventEmitter;

  /**
   * Emitted when a BankID process is startd
   */
  @Event() started: EventEmitter;

  /**
   * The type of BankID action to perform
   */
  @Prop() readonly type: 'auth' | 'sign';

  @Watch('type')
  validateType(newValue: string) {
    if (!['auth', 'sign'].includes(newValue)) {
      this.throwError(
        `The 'type' attribute is required and must be either 'auth' or 'sign'.`,
      );
    }
  }

  /**
   * The URL responsible for initiating a sign process
   */
  @Prop() readonly signUrl: string;

  @Watch('signUrl')
  validateSignUrl(newValue: string) {
    if (this.type === 'sign' && newValue === undefined) {
      this.throwError(
        `The 'sign-url' attribute is required when 'type' is set to 'sign'.`,
      );
    }
  }

  /**
   * The URL responsible for initiating an auth process
   */
  @Prop() readonly authUrl: string;

  @Watch('authUrl')
  validateAuthUrl(newValue: string) {
    if (this.type === 'auth' && newValue === undefined) {
      this.throwError(
        `The 'auth-url' attribute is required when 'type' is set to 'auth'.`,
      );
    }
  }

  /**
   * The URL responsible for collecting the status of the process
   */
  @Prop() readonly collectUrl: string;

  @Watch('collectUrl')
  validateCollectUrl(newValue: string) {
    if (newValue === undefined) {
      this.throwError(`The 'collect-url' attribute is required.`);
    }
  }

  /**
   * The URL responsible for cancelling a started process
   */
  @Prop() readonly cancelUrl: string;

  @Watch('cancelUrl')
  validateCancelUrl(newValue: string) {
    if (newValue === undefined) {
      this.throwError(`The 'cancel-url' attribute is required.`);
    }
  }

  @Listen('visibilitychange', { target: 'document' })
  handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      return;
    }

    const hashParams: { initiated?: string } = getHashParams(location.hash);

    if (
      hashParams.initiated !== undefined ||
      window.history.state?.triggeredByUser === true
    ) {
      this.flowType = 'app';
      this.isInProgress = true;
      this.pollCollect();
    }
  }

  /**
   * Whether to use the dark theme
   */
  @Prop() readonly darkTheme = false;

  /**
   * The language to use for localization
   */
  @Prop() readonly language: 'sv' | 'en' = null;

  @State() flowType: 'app' | 'qr';

  @State() isMobileOrTablet = null;

  @State() isStarting = false;

  @State() isStartingOnAnotherDevice = false;

  @State() isInProgress = null;

  @State() isCancelling = null;

  @State() statusHintCode: string = null;

  @State() status: string = null;

  @State() qrCodeImageUrl: string = null;

  private axios = axios.create({
    withCredentials: true,
    withXSRFToken: true,
  });

  private timeout = null;

  private TAG = '[jgroup-bank-id]';

  private propsValid = true;

  private propsValidationErrorMessage = null;

  private translate = createTranslateFunction(this.language);

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
      return <p>{this.propsValidationErrorMessage}</p>;
    }

    return (
      <Host>
        {this.isInProgress === null ? (
          <div class="flex flex-col items-center">
            <StartButton
              isOutlined={false}
              darkTheme={this.darkTheme}
              onClick={this.init}
              isLoading={this.isStarting && !this.isStartingOnAnotherDevice}
              text={
                this.flowType === 'qr' && !this.isStartingOnAnotherDevice
                  ? this.translate('start-qr')
                  : this.translate('start-app')
              }
            />
            {this.isMobileOrTablet ? (
              <div class="mt-4">
                <StartButton
                  isOutlined={true}
                  darkTheme={this.darkTheme}
                  onClick={this.startOnAnotherDevice}
                  isLoading={this.isStarting && this.isStartingOnAnotherDevice}
                  text={this.translate('start-qr-another-device')}
                />
              </div>
            ) : (
              ''
            )}
          </div>
        ) : (
          ''
        )}

        {this.shouldRenderStatusHint ? (
          <Alert
            message={this.translate(
              `hintcode-${this.flowType}-${this.statusHintCode || 'unknown'}`,
              `hintcode-${this.statusHintCode || 'unknown'}`,
            )}
            type={this.status === 'failed' ? 'error' : 'info'}
            tryAgainButtonText={this.translate('try-again')}
            onTryAgainButtonClick={this.reset}
            darkTheme={this.darkTheme}
          />
        ) : (
          ''
        )}

        {this.shouldRenderQrImage ? (
          <img src={this.qrCodeImageUrl} class="mx-auto mb-4 animate-fade" />
        ) : (
          ''
        )}

        {this.shouldRenderCancelButton ? (
          <p class="text-center animate-fade">
            <CancelButton
              onClick={this.reset}
              text={this.translate('cancel')}
              isLoading={this.isCancelling}
              darkTheme={this.darkTheme}
            />
          </p>
        ) : (
          ''
        )}
      </Host>
    );
  }

  private get shouldRenderCancelButton() {
    return this.flowType === 'qr' && this.isInProgress && this.timeout !== null;
  }

  private get shouldRenderQrImage() {
    return (
      this.isInProgress &&
      this.flowType === 'qr' &&
      this.qrCodeImageUrl !== null
    );
  }

  private get shouldRenderStatusHint() {
    return (
      this.statusHintCode !== null &&
      this.statusHintCode !== undefined &&
      this.isInProgress !== null
    );
  }

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
    this.started.emit();

    const transaction = await this.post(url);

    if (transaction === null) {
      this.reset();
      this.throwError(`Failed starting '${this.type}' transaction`);
      return;
    }

    window.history.pushState({ triggeredByUser: true }, null);

    return this.handleInitComplete(transaction);
  }

  private async handleInitComplete({ autoStartToken, transactionId }) {
    if (this.flowType === 'qr') {
      await this.pollCollect(transactionId);
      this.isStarting = false;
      this.isInProgress = true;
    } else if (this.flowType === 'app') {
      const returnUrl = this.createReturnUrl();

      window.location.href = `https://app.bankid.com/?autostarttoken=${autoStartToken}&redirect=${returnUrl}`;
    }
  }

  private pollCollect(transactionId: string = null) {
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
        console.error(
          `${this.TAG} resetting: initial transactionId '${transactionId}' does not match the one returned from collect '${response.transactionId}'.`,
        );
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
          // this.reset();
          break;

        default:
          console.warn(
            `${this.TAG} pollCollect returned unknown status '${response.status}'`,
          );
          break;
      }
    };

    return getResult();
  }

  private async reset() {
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

  private createReturnUrl() {
    const device = useDevice();

    const location = window.location.href.replace('#', '');

    if (device.isChromeOnAppleDevice || device.isChromeOnAndroidMobile) {
      return encodeURIComponent('googlechrome://');
    }
    if (device.isFirefoxOnAppleDevice) {
      return encodeURIComponent('firefox://');
    }
    if (device.isOperaTouchOnAppleDevice) {
      return encodeURIComponent(
        `${location.replace('http', 'touch-http')}#initiated=true`,
      );
    }

    return encodeURIComponent(`${location}#initiated=true`);
  }

  private async post(url: string) {
    try {
      const response = await this.axios.post(url);

      return response.data;
    } catch (error) {
      return null;
    }
  }
}
