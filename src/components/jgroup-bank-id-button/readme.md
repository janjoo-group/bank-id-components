# jgroup-bank-id-button



<!-- Auto Generated Below -->


## Overview

Just the BankID button's own look - the avatar badge, the label, the
loading spinner - with none of the actual auth/collect/cancel flow
logic <jgroup-bank-id> has. For a consumer that already drives its own
identification flow some other way (e.g. opening a popup window running
the real <jgroup-bank-id> widget on a separate page, then reacting to a
postMessage/postRobot event once it completes) and just wants this
widget's own button to trigger that, instead of maintaining a separate,
hand-rolled replica of it.

Shares StartButton (and its BankIdLogo/Spinner) directly from
jgroup-bank-id's own components.tsx - one visual definition, not a
second copy that can drift from the real widget's own button over time.

## Properties

| Property             | Attribute    | Description                                                                                                                                                                                     | Type      | Default     |
| -------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------- |
| `darkTheme`          | `dark-theme` | Renders with the dark color scheme.                                                                                                                                                             | `boolean` | `false`     |
| `label` _(required)_ | `label`      | Button label.                                                                                                                                                                                   | `string`  | `undefined` |
| `loading`            | `loading`    | Swaps the label out for a spinner and disables the button - the only disabled state StartButton itself actually supports (no separate "disabled but still showing the label" state to extract). | `boolean` | `false`     |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
