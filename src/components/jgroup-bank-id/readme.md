# jgroup-bank-id



<!-- Auto Generated Below -->


## Properties

| Property     | Attribute     | Description                                                  | Type               | Default     |
| ------------ | ------------- | ------------------------------------------------------------ | ------------------ | ----------- |
| `authUrl`    | `auth-url`    | The URL responsible for initiating an auth process           | `string`           | `undefined` |
| `cancelUrl`  | `cancel-url`  | The URL responsible for cancelling a started process         | `string`           | `undefined` |
| `collectUrl` | `collect-url` | The URL responsible for collecting the status of the process | `string`           | `undefined` |
| `darkTheme`  | `dark-theme`  | Whether to use the dark theme                                | `boolean`          | `false`     |
| `language`   | `language`    | The language to use for localization                         | `"en" \| "sv"`     | `null`      |
| `signUrl`    | `sign-url`    | The URL responsible for initiating a sign process            | `string`           | `undefined` |
| `type`       | `type`        | The type of BankID action to perform                         | `"auth" \| "sign"` | `undefined` |


## Events

| Event       | Description                                  | Type               |
| ----------- | -------------------------------------------- | ------------------ |
| `completed` | Emitted when the BankID process is completed | `CustomEvent<any>` |
| `started`   | Emitted when a BankID process is startd      | `CustomEvent<any>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
