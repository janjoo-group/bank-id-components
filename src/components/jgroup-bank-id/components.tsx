import { h, Fragment } from '@stencil/core';
import resolveConfig from 'tailwindcss/resolveConfig';
import tailwindConfig from './../../../tailwind.config.js';

const fullConfig = resolveConfig(tailwindConfig);

const primaryColor = fullConfig.theme.colors.primary['900'];
const white = fullConfig.theme.colors.white;

export const StartButton = ({
  onClick,
  isLoading,
  text,
  isOutlined,
  darkTheme,
}) => {
  const classes = {
    default:
      'inline-flex items-center justify-center tracking-wider gap-x-4 w-56 h-12 rounded-md px-3.5 py-2.5 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    outlinedLight:
      'bg-transparent hover:bg-gray-50 active:bg-gray-200 active:border-primary-700 active:text-primary-700 focus-visible:outline-primary-900 text-primary-900 border border-primary-900',
    outlinedDark:
      'bg-transparent focus-visible:bg-neutral-600 focus-visible:outline-neutral-500 hover:bg-neutral-700 active:border-neutral-400 active:bg-neutral-600 text-gray-200 border border-neutral-700',
    light:
      'bg-primary-900 hover:bg-primary-800 active:bg-primary-700 focus-visible:outline-primary-900 text-white',
    dark: 'bg-neutral-800 border border-neutral-700 active:border-neutral-400 hover:bg-neutral-700 active:bg-neutral-600 focus-visible:outline-neutral-500 focus-visible:bg-neutral-700 text-white',
  };
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={onClick}
      class={{
        [classes.default]: true,
        [classes.outlinedLight]: isOutlined && !darkTheme,
        [classes.outlinedDark]: isOutlined && darkTheme,
        [classes.light]: !isOutlined && !darkTheme,
        [classes.dark]: !isOutlined && darkTheme,
      }}
    >
      {!isLoading ? (
        <Fragment>
          {!isOutlined ? <BankIdLogo color="white" /> : ''}
          {text}
        </Fragment>
      ) : (
        <Spinner
          classes=""
          color={isOutlined && !darkTheme ? primaryColor : white}
        ></Spinner>
      )}
    </button>
  );
};

export const CancelButton = ({ onClick, text, isLoading, darkTheme }) => {
  const classes = {
    default:
      'inline-flex items-center justify-center rounded-md disabled:opacity-50 disabled:cursor-not-allowed w-20 h-9 px-3.5 py-2 text-sm font-semibold shadow-sm',
    light:
      'bg-white border border-gray-300 active:border-gray-400 text-primary-900 active:text-primary-700 ring-gray-300 hover:bg-gray-50 focus-visible:outline-primary-700 outline-offset-2',
    dark: 'bg-neutral-800 border border-neutral-700 active:border-neutral-400 hover:bg-neutral-700 active:bg-neutral-600 focus-visible:outline-neutral-500 focus-visible:bg-neutral-700 text-white',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      class={{
        [classes.default]: true,
        [classes.light]: !darkTheme,
        [classes.dark]: darkTheme,
      }}
    >
      {isLoading ? (
        <Spinner
          color={darkTheme ? white : primaryColor}
          classes="h-5 w-5"
        ></Spinner>
      ) : (
        `${text}`
      )}
    </button>
  );
};

export const Alert = ({
  message,
  type,
  onTryAgainButtonClick,
  tryAgainButtonText,
  darkTheme,
}) => {
  const alertClasses = {
    error: 'border-red-400',
    info: 'border-primary-400',
    dark: 'bg-neutral-800 text-white',
    light:
      type === 'error'
        ? 'bg-red-50 text-red-700'
        : 'bg-primary-50 text-primary-700',
  };

  const tryAgainButtonClasses = {
    default:
      'rounded-md px-3.5 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset ring-red-300',
    dark: 'bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white',
    light: 'bg-red-50 text-red-800 hover:bg-red-100',
  };

  return (
    <div
      class={{
        'border-l-4 p-4 mb-4 animate-fade': true,
        [alertClasses[type]]: true,
        [darkTheme ? alertClasses.dark : alertClasses.light]: true,
      }}
    >
      <div class="flex">
        <div class="flex-shrink-0">
          {type === 'error' ? (
            <svg
              class="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clip-rule="evenodd"
              />
            </svg>
          ) : (
            <svg
              class="h-5 w-5 text-primary-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clip-rule="evenodd"
              />
            </svg>
          )}
        </div>
        <div class="ml-3">
          <p class="text-sm">{message}</p>
          {type === 'error' ? (
            <div class="mt-4">
              <div class="-mx-2 -my-1.5 flex">
                <button
                  type="button"
                  onClick={onTryAgainButtonClick}
                  class={{
                    [tryAgainButtonClasses.default]: true,
                    [tryAgainButtonClasses.light]: !darkTheme,
                    [tryAgainButtonClasses.dark]: darkTheme,
                  }}
                >
                  {tryAgainButtonText}
                </button>
              </div>
            </div>
          ) : (
            ''
          )}
        </div>
      </div>
    </div>
  );
};

export const Spinner = ({ color, classes }) => (
  <svg
    width="32px"
    height="32px"
    class={classes}
    fill={color}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
      opacity=".25"
    />
    <path
      d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"
      class="spinner"
    />
  </svg>
);

export const BankIdLogo = ({ color }) => (
  <svg
    width="32px"
    height="32px"
    viewBox="0 0 39 39"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
      <rect fill="none" x="0" y="0" width="39" height="39"></rect>
      <g transform="translate(5, 5)" fill={color}>
        <path
          d="M8.81437126,14.9123726 L10,6.95488054 C9.53293413,6.95488054 8.73353293,6.95488054 8.73353293,6.95488054 C8.14071856,6.95488054 7.37724551,6.60100169 7.15269461,5.95062974 C7.08083832,5.730651 6.91017964,4.97507182 7.88922156,4.23862124 C8.23952096,3.98038532 8.46407186,3.69345652 8.50898204,3.47347778 C8.55389222,3.24393474 8.5,3.04308458 8.34730539,2.89005588 C8.13173653,2.67007714 7.70958084,2.54574132 7.17065868,2.54574132 C6.26347305,2.54574132 5.6257485,3.10047034 5.56287425,3.50217066 C5.51796407,3.79866375 5.73353293,4.03777108 5.92215569,4.19079977 C6.48802395,4.64032156 6.62275449,5.2906935 6.27245509,5.90280827 C5.91317365,6.53405163 5.13173653,6.94531625 4.29640719,6.95488054 C4.29640719,6.95488054 3.47005988,6.95488054 3.00299401,6.95488054 C2.89520958,7.7295883 1.13473054,19.6084406 1,20.5457413 L8.01497006,20.5457413 C8.07784431,20.1249124 8.4011976,17.8773035 8.84131737,14.9123726 L8.81437126,14.9123726 Z"
          fill={color}
        ></path>
        <path
          d="M19.0401903,0.545741325 L11.9459047,0.545741325 L11,6.80620644 L12.20469,6.80620644 C12.8650386,6.80620644 13.4896927,6.48992737 13.7574016,6.03411342 C13.8466379,5.88527621 13.8823324,5.75504365 13.8823324,5.63411342 C13.8823324,5.3736483 13.7127834,5.17829946 13.5432344,5.04806691 C13.0792057,4.68527621 12.9810458,4.30388086 12.9810458,4.03411342 C12.9810458,3.97829946 12.9810458,3.93178784 12.9899694,3.88527621 C13.0881293,3.22481109 13.9447978,2.50853202 15.0780987,2.50853202 C15.7562946,2.50853202 16.2738651,2.67597388 16.5861921,2.98295063 C16.8628247,3.25271807 16.9699082,3.63411342 16.8895956,4.03411342 C16.7914356,4.50853202 16.3363305,4.8992297 16.0775453,5.09457853 C15.3904258,5.59690412 15.4796621,6.03411342 15.5242802,6.16434598 C15.6670583,6.55504365 16.2113997,6.80620644 16.6308103,6.80620644 L18.4601544,6.80620644 C18.4601544,6.80620644 18.4601544,6.80620644 18.4601544,6.81550877 C20.9587707,6.83411342 22.2973151,8.03411342 21.8779045,10.8248111 C21.4852648,13.4201599 19.5756081,14.536439 17.3000825,14.5550437 L16.3987959,20.5457413 L17.7284167,20.5457413 C23.3413798,20.5457413 27.9281254,16.7876018 28.829412,10.8527181 C29.9448657,3.48527621 25.4652036,0.545741325 19.0401903,0.545741325 Z"
          fill={color}
        ></path>
        <path
          d="M19.0401903,0.545741325 L11.9459047,0.545741325 L11,6.80620644 L12.20469,6.80620644 C12.8650386,6.80620644 13.4896927,6.48992737 13.7574016,6.03411342 C13.8466379,5.88527621 13.8823324,5.75504365 13.8823324,5.63411342 C13.8823324,5.3736483 13.7127834,5.17829946 13.5432344,5.04806691 C13.0792057,4.68527621 12.9810458,4.30388086 12.9810458,4.03411342 C12.9810458,3.97829946 12.9810458,3.93178784 12.9899694,3.88527621 C13.0881293,3.22481109 13.9447978,2.50853202 15.0780987,2.50853202 C15.7562946,2.50853202 16.2738651,2.67597388 16.5861921,2.98295063 C16.8628247,3.25271807 16.9699082,3.63411342 16.8895956,4.03411342 C16.7914356,4.50853202 16.3363305,4.8992297 16.0775453,5.09457853 C15.3904258,5.59690412 15.4796621,6.03411342 15.5242802,6.16434598 C15.6670583,6.55504365 16.2113997,6.80620644 16.6308103,6.80620644 L18.4601544,6.80620644 C18.4601544,6.80620644 18.4601544,6.80620644 18.4601544,6.81550877 C20.9587707,6.83411342 22.2973151,8.03411342 21.8779045,10.8248111 C21.4852648,13.4201599 19.5756081,14.536439 17.3000825,14.5550437 L16.3987959,20.5457413 L17.7284167,20.5457413 C23.3413798,20.5457413 27.9281254,16.7876018 28.829412,10.8527181 C29.9448657,3.48527621 25.4652036,0.545741325 19.0401903,0.545741325 Z"
          fill={color}
        ></path>
        <g transform="translate(0, 22.545741)" fill={color}>
          <path d="M0.790909091,0.0178571429 L3.69090909,0.0178571429 C4.92727273,0.0178571429 5.22727273,0.633928571 5.13636364,1.19642857 C5.06363636,1.65178571 4.74545455,1.99107143 4.2,2.21428571 C4.89090909,2.47321429 5.16363636,2.875 5.06363636,3.50892857 C4.93636364,4.30357143 4.23636364,4.89285714 3.31818182,4.89285714 L0.0181818182,4.89285714 L0.790909091,0.0178571429 Z M2.70909091,2.03571429 C3.27272727,2.03571429 3.53636364,1.74107143 3.59090909,1.39285714 C3.64545455,1.01785714 3.47272727,0.758928571 2.90909091,0.758928571 L2.40909091,0.758928571 L2.20909091,2.03571429 L2.70909091,2.03571429 L2.70909091,2.03571429 Z M2.4,4.14285714 C2.98181818,4.14285714 3.31818182,3.91071429 3.4,3.4375 C3.46363636,3.02678571 3.22727273,2.78571429 2.66363636,2.78571429 L2.09090909,2.78571429 L1.87272727,4.15178571 L2.4,4.15178571 L2.4,4.14285714 Z"></path>
          <path d="M9.12727273,4.92857143 C8.37272727,4.98214286 8.00909091,4.90178571 7.82727273,4.58035714 C7.42727273,4.82142857 6.98181818,4.94642857 6.50909091,4.94642857 C5.65454545,4.94642857 5.35454545,4.50892857 5.43636364,4.02678571 C5.47272727,3.79464286 5.60909091,3.57142857 5.82727273,3.38392857 C6.3,2.98214286 7.46363636,2.92857143 7.91818182,2.625 C7.95454545,2.28571429 7.81818182,2.16071429 7.39090909,2.16071429 C6.89090909,2.16071429 6.47272727,2.32142857 5.75454545,2.80357143 L5.92727273,1.69642857 C6.54545455,1.25892857 7.14545455,1.05357143 7.83636364,1.05357143 C8.71818182,1.05357143 9.5,1.41071429 9.35454545,2.35714286 L9.18181818,3.42857143 C9.11818182,3.80357143 9.13636364,3.91964286 9.56363636,3.92857143 L9.12727273,4.92857143 Z M7.81818182,3.25 C7.41818182,3.5 6.67272727,3.45535714 6.59090909,3.97321429 C6.55454545,4.21428571 6.70909091,4.39285714 6.95454545,4.39285714 C7.19090909,4.39285714 7.48181818,4.29464286 7.71818182,4.13392857 C7.7,4.04464286 7.70909091,3.95535714 7.73636364,3.78571429 L7.81818182,3.25 Z"></path>
          <path d="M10.5363636,1.11607143 L12.0454545,1.11607143 L11.9636364,1.60714286 C12.4454545,1.20535714 12.8090909,1.05357143 13.2818182,1.05357143 C14.1272727,1.05357143 14.5181818,1.5625 14.3818182,2.39285714 L13.9909091,4.88392857 L12.4818182,4.88392857 L12.8090909,2.82142857 C12.8727273,2.44642857 12.7545455,2.26785714 12.4636364,2.26785714 C12.2272727,2.26785714 12.0090909,2.39285714 11.8,2.66964286 L11.4545455,4.875 L9.94545455,4.875 L10.5363636,1.11607143 Z"></path>
          <polygon points="15.5545455 0.0178571429 17.0636364 0.0178571429 16.6818182 2.41071429 18.1272727 1.11607143 19.9909091 1.11607143 18.1363636 2.72321429 19.6272727 4.88392857 17.7272727 4.88392857 16.5818182 3.14285714 16.5636364 3.14285714 16.2909091 4.88392857 14.7818182 4.88392857"></polygon>
        </g>
        <g transform="translate(20, 22.545741)" fill={color}>
          <polygon points="0.782417582 0.0181818182 2.46153846 0.0181818182 1.72307692 4.97272727 0.043956044 4.97272727"></polygon>
          <path d="M3.27912088,0.0181818182 L5.67912088,0.0181818182 C7.53406593,0.0181818182 8.07032967,1.40909091 7.89450549,2.56363636 C7.72747253,3.69090909 6.86593407,4.97272727 5.23956044,4.97272727 L2.53186813,4.97272727 L3.27912088,0.0181818182 Z M4.83516484,3.79090909 C5.65274725,3.79090909 6.1010989,3.37272727 6.23296703,2.49090909 C6.32967033,1.83636364 6.13626374,1.19090909 5.23076923,1.19090909 L4.78241758,1.19090909 L4.3956044,3.79090909 L4.83516484,3.79090909 L4.83516484,3.79090909 Z"></path>
        </g>
      </g>
    </g>
  </svg>
);
