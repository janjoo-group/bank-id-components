import { FunctionalComponent } from '../../stencil-public-runtime';
interface StartButtonProps {
    onClick: () => void;
    isLoading: boolean;
    text: string;
    isOutlined: boolean;
    darkTheme: boolean;
}
export declare const StartButton: FunctionalComponent<StartButtonProps>;
interface CancelButtonProps {
    onClick: () => void;
    text: string;
    isLoading: boolean;
    darkTheme: boolean;
}
export declare const CancelButton: FunctionalComponent<CancelButtonProps>;
interface AlertProps {
    message: string;
    type: 'error' | 'info';
    onTryAgainButtonClick: () => void;
    tryAgainButtonText: string;
    darkTheme: boolean;
}
export declare const Alert: FunctionalComponent<AlertProps>;
interface SpinnerProps {
    color: string;
    classes: string;
}
export declare const Spinner: FunctionalComponent<SpinnerProps>;
interface BankIdLogoProps {
    color: string;
}
export declare const BankIdLogo: FunctionalComponent<BankIdLogoProps>;
export {};
