# jgroup-bank-id



<!-- Auto Generated Below -->


## Properties

| Property                  | Attribute                  | Description                                                                                                                                                                      | Type               | Default     |
| ------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------- |
| `authUrl` _(required)_    | `auth-url`                 | Endpoint that starts an authentication transaction - required when type is 'auth'.                                                                                               | `string`           | `undefined` |
| `autoStartSingleOption`   | `auto-start-single-option` | Auto-starts the flow immediately on mount, skipping the start button - desktop (qr flow) only.                                                                                   | `boolean`          | `false`     |
| `cancelUrl` _(required)_  | `cancel-url`               | Endpoint called to cancel an in-progress transaction.                                                                                                                            | `string`           | `undefined` |
| `collectUrl` _(required)_ | `collect-url`              | Endpoint polled for the transaction's current status.                                                                                                                            | `string`           | `undefined` |
| `darkTheme`               | `dark-theme`               | Renders the widget with its dark color scheme.                                                                                                                                   | `boolean`          | `false`     |
| `language`                | `language`                 | UI language for all widget copy.                                                                                                                                                 | `"en" \| "sv"`     | `'sv'`      |
| `rounded`                 | `rounded`                  | Corner style for the start button and its BankID badge: 'full' (the default) is a pill/circle, 'md' is still visibly rounded (rounded-xl/rounded-lg) but not a full pill/circle. | `"full" \| "md"`   | `'full'`    |
| `signUrl` _(required)_    | `sign-url`                 | Endpoint that starts a signing transaction - required when type is 'sign'.                                                                                                       | `string`           | `undefined` |
| `type` _(required)_       | `type`                     | Whether this widget performs an authentication or a signing flow.                                                                                                                | `"auth" \| "sign"` | `undefined` |


## Events

| Event       | Description                                                                                                                                                                                                                                                                                                     | Type               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `cancelled` | Fired whenever the widget returns to its idle state - the cancel button, "try again" after a failure, or an unexpected drop mid-flow. Use it to reset any "a BankID attempt is in progress" state a consuming app keeps of its own.                                                                             | `CustomEvent<any>` |
| `completed` | Fired once collect() resolves with a terminal 'complete' status - detail carries the raw collect response, success or business-logic error.                                                                                                                                                                     | `CustomEvent<any>` |
| `started`   | Fired once the initial auth/sign request has succeeded and a transaction is under way - detail carries { flowType }, so consumers can tell the same-device app hand-off (flowType: 'app', which then shows nothing of its own until the visitor returns) apart from the qr flow's own continuously-updating UI. | `CustomEvent<any>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
