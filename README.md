# grammY helpers for Vercel

Collection of useful methods to run your bot on Vercel

## API

### `getHost([options])`

- `options` (`object`, optional) — Options for hostname
  - `headers` (`Headers`, optional) — Headers from incoming request
  - `header` (`string`, optional) — Header name which contains the hostname
  - `fallback` (`string`, optional) — Fallback hostname (`process.env.VERCEL_URL` by default)
- returns `string` — Target hostname

This method generates a hostname from the options passed to it

### `getURL([options])`

- `options` (`object`, optional) — Options for URL
  - `host` (`string`, optional) — Hostname without protocol
  - `path` (`string`, optional) — Path to a function that receives updates
  - `...options` (`object`, optional) — Options for `getHost`
- returns `string` — Target URL

This method generates a URL from the options passed to it

### `setWebhookCallback(bot[, options])`

- `bot` (`Bot`, required) — grammY bot instance
- `options` (`object`, optional) — Options for webhooks
  - `onError` (`"throw" | "return"`, optional) — Strategy for handling errors
  - `allowedEnvs` (`array`, optional) — List of environments where this method allowed
  - `...options` (`object`, optional) — Options for `bot.api.setWebhook`
  - `...options` (`object`, optional) — Options for `getURL`
- returns `() => Promise<Response>` — Target callback method

Callback factory for grammY `bot.api.setWebhook` method

### `webhookStream(bot[, options])`

- `bot` (`Bot`, required) — grammY bot instance
- `options` (`object`, optional) — Options for stream
  - `chunk` (`string`, optional) — Content for chunks
  - `intervalMilliseconds` (`number`, optional) — Interval for writing chunks to stream
  - `...options` (`object`, optional) — Options for `webhookCallback`
- returns `() => Response` — Target callback method

Callback factory for streaming webhook response

### `jsonResponse(value[, options])`

- `value` (`any`, required) — Serializable value
- `options` (`object`, optional) — Options for JSON response
  - `replacer` (`(string | number)[] | null | undefined`, optional)
  - `space` (`string | number | undefined`, optional)
  - `...options` (`ResponseInit`, optional)
- returns `Response` — Target JSON Response

This method generates Response objects for JSON

Made with 💜 by [Vladislav Ponomarev](https://GitHub.com/PonomareVlad)
