/**
 * Just the BankID button's own look - the avatar badge, the label, the
 * loading spinner - with none of the actual auth/collect/cancel flow
 * logic <jgroup-bank-id> has. For a consumer that already drives its own
 * identification flow some other way (e.g. opening a popup window running
 * the real <jgroup-bank-id> widget on a separate page, then reacting to a
 * postMessage/postRobot event once it completes) and just wants this
 * widget's own button to trigger that, instead of maintaining a separate,
 * hand-rolled replica of it.
 *
 * Shares StartButton (and its BankIdLogo/Spinner) directly from
 * jgroup-bank-id's own components.tsx - one visual definition, not a
 * second copy that can drift from the real widget's own button over time.
 */
export declare class JgroupBankIdButton {
    /** Button label. */
    readonly label: string;
    /** Swaps the label out for a spinner and disables the button - the only
     * disabled state StartButton itself actually supports (no separate
     * "disabled but still showing the label" state to extract). */
    readonly loading = false;
    /** Renders with the dark color scheme. */
    readonly darkTheme = false;
    componentWillLoad(): void;
    render(): any;
}
