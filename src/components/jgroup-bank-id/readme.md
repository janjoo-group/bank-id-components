# jgroup-bank-id



<!-- Auto Generated Below -->


## Properties

| Property                  | Attribute                  | Description | Type               | Default     |
| ------------------------- | -------------------------- | ----------- | ------------------ | ----------- |
| `authUrl` _(required)_    | `auth-url`                 |             | `string`           | `undefined` |
| `autoStartSingleOption`   | `auto-start-single-option` |             | `boolean`          | `false`     |
| `cancelUrl` _(required)_  | `cancel-url`               |             | `string`           | `undefined` |
| `collectUrl` _(required)_ | `collect-url`              |             | `string`           | `undefined` |
| `darkTheme`               | `dark-theme`               |             | `boolean`          | `false`     |
| `language`                | `language`                 |             | `"en" \| "sv"`     | `'sv'`      |
| `signUrl` _(required)_    | `sign-url`                 |             | `string`           | `undefined` |
| `type` _(required)_       | `type`                     | Props       | `"auth" \| "sign"` | `undefined` |


## Events

| Event       | Description | Type               |
| ----------- | ----------- | ------------------ |
| `cancelled` | Events      | `CustomEvent<any>` |
| `completed` |             | `CustomEvent<any>` |
| `started`   |             | `CustomEvent<any>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
