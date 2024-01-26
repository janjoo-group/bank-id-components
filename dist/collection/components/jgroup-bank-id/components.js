import { h, getAssetPath, Fragment } from "@stencil/core";
export const StartButton = ({ onClick, isLoading, text, isOutlined, darkTheme, }) => {
    const classes = {
        default: 'inline-flex items-center justify-center gap-x-2 w-56 h-12 rounded-md px-3.5 py-2.5 text-sm font-bold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        outlinedLight: 'bg-white hover:bg-gray-50 focus-visible:outline-primary-900 text-primary-900 border border-primary-900',
        outlinedDark: 'bg-transparent focus-visible:outline-white text-white border border-white',
        light: 'bg-primary-900 hover:bg-primary-800 focus-visible:outline-primary-900 text-white',
        dark: 'bg-gray-50 hover:bg-gray-200 focus-visible:outline-white text-primary-900',
    };
    return (h("button", { type: "button", disabled: isLoading, onClick: onClick, class: {
            [classes.default]: true,
            [classes.outlinedLight]: isOutlined && !darkTheme,
            [classes.outlinedDark]: isOutlined && darkTheme,
            [classes.light]: !isOutlined && !darkTheme,
            [classes.dark]: !isOutlined && darkTheme,
        } }, !isLoading ? (h(Fragment, null, !isOutlined ? (h("img", { src: getAssetPath(darkTheme
            ? '/assets/bankid-logo-v2023.svg'
            : '/assets/bankid-logo-v2023-neg.svg'), class: "bankid-logo" })) : (''), text)) : (h("img", { src: getAssetPath((!isOutlined && !darkTheme) || (isOutlined && darkTheme)
            ? '/assets/spinner-white.svg'
            : '/assets/spinner-dark.svg') }))));
};
export const CancelButton = ({ onClick, text, isLoading }) => (h("button", { type: "button", onClick: onClick, disabled: isLoading, class: "inline-flex items-center justify-center rounded-md bg-white w-20 h-9 px-3.5 py-2 text-sm font-semibold text-primary-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" }, isLoading ? (h("img", { src: getAssetPath('/assets/spinner-dark.svg'), class: "h-5 w-5" })) : (`${text}`)));
export const Alert = ({ message, type, onTryAgainButtonClick, tryAgainButtonText, }) => (h("div", { class: {
        'border-l-4 p-4 mb-4 animate-fade': true,
        [type === 'error'
            ? 'border-red-400 bg-red-50'
            : 'border-primary-400 bg-primary-50']: true,
    } }, h("div", { class: "flex" }, h("div", { class: "flex-shrink-0" }, type === 'error' ? (h("svg", { class: "h-5 w-5 text-red-400", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true" }, h("path", { "fill-rule": "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z", "clip-rule": "evenodd" }))) : (h("svg", { class: "h-5 w-5 text-primary-400", viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true" }, h("path", { "fill-rule": "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z", "clip-rule": "evenodd" })))), h("div", { class: "ml-3" }, h("p", { class: {
        'text-sm': true,
        [type === 'error' ? 'text-red-700' : 'text-primary-700']: true,
    } }, message), type === 'error' ? (h("div", { class: "mt-4" }, h("div", { class: "-mx-2 -my-1.5 flex" }, h("button", { type: "button", onClick: onTryAgainButtonClick, class: "rounded-md bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-800 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-100" }, tryAgainButtonText)))) : ('')))));
//# sourceMappingURL=components.js.map
