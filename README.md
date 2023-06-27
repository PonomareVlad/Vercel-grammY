# grammY helpers for Vercel

Collection of useful methods to run your bot on Vercel

## Examples

### Get current hostname

```js
// Anywhere in your code
getHost() // *.vercel.app (from `process.env.VERCEL_URL`)

// At your function handler 
export default ({headers}) => {
    getHost({headers}) // domain.com (from `x-forwarded-host` header)
}
```

### Get URL for current hostname

```js
// Anywhere in your code
getURL({path: "api/index"}) // https://*.vercel.app/api/index

// At your function handler 
export default ({headers}) => {
    getURL({headers, path: "api/index"}) // https://domain.com/api/index
}
```

### Set webhook for current hostname

```js
// Anywhere in your code
bot.api.setWebhook(getURL({path: "api/index"}))

// As function handler
export default setWebhookCallback(bot, {path: "api/index"}); 
```

### Use streaming response in webhook handler

> Note that this will work only at Vercel Edge Functions

```js
export default webhookStream(bot)
```

## Guides

### Invocation timeouts

By default, Vercel limits the invocation time for your code:

- `10` seconds for Serverless Functions
  - `60` seconds at Pro plan
  - `900` seconds at Enterprise plan
- `30` seconds for Edge Functions
  - `1 000` seconds with streaming response

So, without streaming (and paying) you can get up to `30` seconds
with default grammY `webhookCallback` adapter at Edge Functions

On the other hand, we also have a time limit for responding to incoming requests from Telegram — `60` seconds,
after which, the request will be considered unsuccessful and will be retried, which you probably don't want

To get around these limitations you can proxy the request before calling the function by following scheme:

1. Telegram sends an update request
2. Proxy service passes the original request to your function
3. Answer within `60` seconds will be returned to Telegram
4. Otherwise, proxy responds with a `200` status to prevent a recurrence
5. Your function may continue to work for the next `940` seconds

> Q: What proxy server is suitable for this ?\
> A: I don't know, but I made it 🙂

#### Proxy

Source: [ProlongRequest](https://github.com/PonomareVlad/ProlongRequest)

Endpoint: `https://prolong-request.fly.dev`

Reference:

- `/domain.com`
- `/http://domain.com`
- `/https://domain.com`
- `/https://domain.com/path/to/file.txt`
- `/https://domain.com/route?with=parameters`

> Also supports any HTTP methods and transmits raw headers and body

#### How to use this for bot

Just prepend proxy endpoint to webhook URL:

`https://prolong-request.fly.dev/https://*.vercel.app/api/index`

Or do it automatically:

```js
const proxy = "https://prolong-request.fly.dev"

const url = getURL({path: "api/index"})

bot.api.setWebhook(`${proxy}/${url}`)
```

#### Limitations

- Processing updates will overlap
- States and sessions will be inconsistent
- Request may break and will not be retried

#### Benefits

- You can do anything during this time
- You can wait anything within this time
- You can solve anything using this time

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
