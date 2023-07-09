# [grammY](https://github.com/grammyjs/grammY) helpers for [Vercel](https://vercel.com)

Collection of useful methods to run your bot on Vercel

## How to ...

### Install

```shell
npm i vercel-grammy
```

### Import

```js
import {/* methods */} from "vercel-grammy"
```

### Use

```js
import {Bot} from "grammy"
import {getURL} from "vercel-grammy"

const url = getURL({path: "api/index"})

const bot = new Bot(/* token */)

await bot.api.setWebhook(url)
```

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
export default setWebhookCallback(bot, {path: "api/index"})
```

### Use streaming response in webhook handler

> Note that this will work only at [Vercel Edge Functions](https://vercel.com/docs/concepts/functions/edge-functions)

```js
// As function handler
export default webhookStream(bot) // Instead of webhookCallback(bot)

export const config = {
    runtime: "edge"
}
```

## Guides

### Sets webhook URL automatically

When you deploy a project to Vercel, one of these
[environments](https://vercel.com/docs/concepts/deployments/environments) is installed for it:

- `production` — default for `main` or `master` branches
- `preview` — for all other branches in your repository
- `development` — when using the [`vercel dev`](https://vercel.com/docs/cli/dev) command

In the early stages of bot development, it is enough to install a webhook
on the main (production) domain, such as `project.vercel.app`

However, if you want to test new changes without stopping the bot,
then you can simply use a separate (test) bot (for example `@awesome_beta_bot`)
and set the webhook to the URL of the branch — `project-git-branch-username.vercel.app`

But what if you have several separate branches with different changes
and want to test them without creating a separate bot for each or manually managing webhooks ?

> Q: You didn't make a separate plugin for this, right ?\
> A: 😏\
> Q: Didn't do it, right ?

Thanks to the [Vercel build step](https://vercel.com/docs/concepts/deployments/builds),
we can run some code before a new version of the bot is published and no one will stop us from using it

Just add this code to a new JavaScript file:

```js
const {
    VERCEL_ENV,
} = process.env

// List of allowed environments
const allowedEnvs = [
    "production",
    "preview"
]

// Exit in case of unsuitable environments
if (!allowedEnvs.includes(VERCEL_ENV)) process.exit()

// Webhook URL generation
const url = getURL({path: "api/index"})

// Installing a webhook
await bot.api.setWebhook(url)
```

And specify the path to it in the [`vercel.json`](https://vercel.com/docs/concepts/projects/project-configuration) file:

```json
{
  "buildCommand": "node path/to/new/file.js"
}
```

By the way, you can manage tokens for each environment (or even branch) in the
[project settings](https://vercel.com/docs/concepts/projects/environment-variables)

### Avoiding invocation timeouts

By default, [Vercel limits](https://vercel.com/docs/concepts/limits/overview) the invocation time for your code:

- `10` seconds for [Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
    - `60` seconds at Pro plan
    - `900` seconds at Enterprise plan
- `25` seconds for [Edge Functions](https://vercel.com/docs/concepts/functions/edge-functions)
    - `1 000` seconds with [streaming response](https://vercel.com/docs/concepts/functions/edge-functions/streaming)

So, without streaming (and paying) you can get up to `25` seconds with default
[grammY](https://grammy.dev/guide/deployment-types.html#how-to-use-webhooks) `webhookCallback` adapter at
[Edge Functions](https://vercel.com/docs/concepts/functions/edge-functions)

On the other hand, we also have a time limit for responding to incoming requests from Telegram — `60` seconds,
after which, the request will be considered unsuccessful and will be retried, which you probably don't want

To get around these limitations you can proxy the request before calling the function by following scheme:

1. Telegram sends an update request
2. Proxy service passes the original request to your function
3. Answer within `60` seconds will be returned to Telegram
4. Otherwise, proxy responds with a `200` status to prevent a recurrence
5. Your function may continue to work for the next `940` seconds

> Q: What proxy server is suitable for this ?\
> A: I don't know, but I [made](#proxy) it 🙂

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

And use streaming response in webhook handler:

```js
export default webhookStream(bot, {
    timeoutMilliseconds: 999 // where you can also control timeout
})

export const config = {
    runtime: "edge"
}
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
    - `path` (`string`, optional) — Path to a function that receives updates
    - `host` (`string`, optional) — Hostname without protocol (replaces `getHost` options)
    - `...options` (`object`, optional) — Options for [`getHost`](#gethostoptions)
- returns `string` — Target URL

This method generates a URL from the options passed to it

### `setWebhookCallback(bot[, options])`

- `bot` (`Bot`, required) — grammY bot instance
- `options` (`object`, optional) — Options for webhooks
    - `url` (`string`, optional) — URL for webhooks (replaces `getURL` options)
    - `onError` (`"throw" | "return"`, optional) — Strategy for handling errors
    - `allowedEnvs` (`array`, optional) — List of environments where this method allowed
    - `...options` (`object`, optional) — Options
      for [`bot.api.setWebhook`](https://deno.land/x/grammy@v1.17.1/mod.ts?s=Api#method_setWebhook_0)
    - `...options` (`object`, optional) — Options for [`getURL`](#geturloptions)
- returns `() => Promise<Response>` — Target callback method

Callback factory for grammY [`bot.api.setWebhook`](https://deno.land/x/grammy@v1.17.1/mod.ts?s=Api#method_setWebhook_0)
method

### `webhookStream(bot[, options])`

- `bot` (`Bot`, required) — grammY bot instance
- `options` (`object`, optional) — Options for stream
    - `chunk` (`string`, optional) — Content for chunks
    - `intervalMilliseconds` (`number`, optional) — Interval for writing chunks to stream
    - `...options` (`object`, optional) — Options
      for [`webhookCallback`](https://deno.land/x/grammy@v1.17.1/mod.ts?s=webhookCallback)
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

## Templates using this package

- [For Vercel Edge Functions](https://github.com/PonomareVlad/grammYVercelEdge)
- [For Vercel Edge Functions with streaming response](https://github.com/PonomareVlad/grammYVercelEdgeStream)
- [For Vercel Serverless Functions](https://github.com/PonomareVlad/grammYVercel)

Made with 💜 by [Vladislav Ponomarev](https://GitHub.com/PonomareVlad)
