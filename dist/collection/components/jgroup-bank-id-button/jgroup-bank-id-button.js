import { Host, h } from "@stencil/core";
import { registerInterFont } from "./../../utils/interFont";
import { StartButton } from "./../jgroup-bank-id/components";
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
export class JgroupBankIdButton {
    constructor() {
        this.label = undefined;
        this.loading = false;
        this.darkTheme = false;
        this.rounded = 'full';
    }
    componentWillLoad() {
        registerInterFont();
    }
    render() {
        return (h(Host, null, h(StartButton, { isOutlined: false, darkTheme: this.darkTheme, rounded: this.rounded,
            // A real click still reaches a consumer's own listener on this
            // element - click events bubble out of a shadow root by default
            // (composed: true), so there's no need for a dedicated
            // @Event() just to re-announce the same thing.
            onClick: () => { }, isLoading: this.loading, text: this.label })));
    }
    static get is() { return "jgroup-bank-id-button"; }
    static get encapsulation() { return "shadow"; }
    static get originalStyleUrls() {
        return {
            "$": ["./../jgroup-bank-id/jgroup-bank-id.css"]
        };
    }
    static get styleUrls() {
        return {
            "$": ["../jgroup-bank-id/jgroup-bank-id.css"]
        };
    }
    static get properties() {
        return {
            "label": {
                "type": "string",
                "mutable": false,
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "required": true,
                "optional": false,
                "docs": {
                    "tags": [],
                    "text": "Button label."
                },
                "attribute": "label",
                "reflect": false
            },
            "loading": {
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
                    "text": "Swaps the label out for a spinner and disables the button - the only\ndisabled state StartButton itself actually supports (no separate\n\"disabled but still showing the label\" state to extract)."
                },
                "attribute": "loading",
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
                    "text": "Renders with the dark color scheme."
                },
                "attribute": "dark-theme",
                "reflect": false,
                "defaultValue": "false"
            },
            "rounded": {
                "type": "string",
                "mutable": false,
                "complexType": {
                    "original": "'full' | 'md'",
                    "resolved": "\"full\" | \"md\"",
                    "references": {}
                },
                "required": false,
                "optional": false,
                "docs": {
                    "tags": [],
                    "text": "Corner style for the button and its BankID badge: 'full' (the default) is a pill/circle, 'md' is still visibly rounded (rounded-xl/rounded-lg) but not a full pill/circle."
                },
                "attribute": "rounded",
                "reflect": false,
                "defaultValue": "'full'"
            }
        };
    }
}
//# sourceMappingURL=jgroup-bank-id-button.js.map
