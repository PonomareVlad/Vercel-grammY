import {webhookCallback} from "grammy";

export const {VERCEL_ENV, VERCEL_URL} = process.env;

/**
 * @typedef {Object} ParametersForHost Object with parameters for hostname
 * @property {Headers} [headers=new Headers()] Optional headers from incoming request
 * @property {string} [header="x-forwarded-host"] Optional header name which contains the hostname
 * @property {string} [fallback=VERCEL_URL] Optional fallback hostname (`VERCEL_URL` by default)
 */

/**
 * @typedef {Object} ParametersForURL Object with parameters for URL
 * @property {string} [host] Optional hostname without protocol
 * @property {string} [path="api/update"] Optional absolute path after `/`
 * @property {string} [prefix=""] Optional string to be added before the final URL
 * @implements {ParametersForHost} Other parameters for the `getHost` method
 */

/**
 * This method generates a URL from the parameters passed to it
 *
 * @param {ParametersForURL} [] Optional object with parameters for URL
 * @returns {string} Target URL
 */
export const getURL = ({host, path = "api/update", prefix = "", ...other} = {}) => {
    return new URL(`${prefix}https://${host || getHost(other)}/${path}`).href;
}

/**
 * This method generates a hostname from the parameters passed to it
 * @param {ParametersForHost} [] Optional object with parameters for hostname
 * @returns {string} Target hostname
 */
export const getHost = ({headers = new Headers(), header = "x-forwarded-host", fallback = VERCEL_URL} = {}) => {
    return (typeof headers?.get === "function" ? headers?.get?.(header) : headers[header]) || fallback;
}

/**
 * @typedef {Object} ParametersForWebhook Object with parameters for webhook
 * @property {AbortSignal} [signal] Optional AbortSignal to cancel the request
 * @property {"throw"|"return"} [onError="throw"] Optional strategy for handling errors
 * @property {Array} [allowedEnvs=["development"]] Optional list of environments where this method allowed
 * @implements {import("@grammyjs/types").ApiMethods.setWebhook} Parameters for grammY `bot.api.setWebhook` method
 * @implements {ParametersForURL} Optional parameters for `getURL` method
 */

/**
 * Callback factory for grammY `bot.api.setWebhook` method
 * @param {import("grammy").Bot} bot grammY bot instance
 * @param {ParametersForWebhook} [] Optional object with parameters for webhook
 * @returns {()=>Promise<Response>} Target callback method
 */
export const setWebhookCallback = (bot, {signal, onError = "throw", allowedEnvs = ["development"], ...other} = {}) => {
    return async ({headers} = {}, {json = jsonResponse} = {}) => {
        try {
            if (!allowedEnvs.includes(VERCEL_ENV)) return json({ok: false});
            const ok = await bot.api.setWebhook(getURL({headers, ...other}), other, signal);
            return json({ok});
        } catch (e) {
            if (onError === "throw") throw e;
            console.error(e);
            return json(e);
        }
    }
}

/**
 * @typedef {Object} ParametersForStream Object with parameters for stream
 * @property {Number} [timeoutMilliseconds=55_000] An optional number of timeout milliseconds (default: 55_000)
 * @property {Number} [interval=1000] Optional interval for writing chunks to stream
 * @property {String} [chunk="."] Optional content for chunks
 * @implements {import("grammy").WebhookOptions} Parameters for grammY `webhookCallback` method
 */

/**
 * Callback factory for streaming webhook response
 * @param {import("grammy").Bot} bot grammY bot instance
 * @param {ParametersForStream} [] Optional object with parameters for stream
 * @returns {()=>Response} Target callback method
 */
export const webhookStream = (bot, {timeoutMilliseconds = 55_000, interval = 1000, chunk = ".", ...other} = {}) => {
    const callback = webhookCallback(bot, "std/http", {timeoutMilliseconds, ...other});
    return (...args) => new Response(new ReadableStream({
        start: controller => {
            const encoder = new TextEncoder();
            const streamInterval = setInterval(() => {
                controller.enqueue(encoder.encode(chunk));
            }, interval);
            return callback(...args).finally(() => {
                clearInterval(streamInterval);
                controller.close();
            });
        }
    }));
}

/**
 * @typedef {Object} ParametersForJSON Object with parameters for JSON
 * @property {number} [status]
 * @property {string} [statusText]
 * @property {Object} [headers={}]
 * @property {string | number} [space]
 * @property {(this:any, key: string, value: any) => any} [replacer]
 */

/**
 * This method generates Response objects for JSON
 * @param {any} value Serializable value
 * @param {ParametersForJSON} [] Optional object with parameters for JSON
 * @returns {Response} Target JSON Response
 */
export const jsonResponse = (value, {space, status, replacer, statusText, headers = {}} = {}) => {
    const body = JSON.stringify(value, replacer, space);
    return new Response(body, {
        headers: {
            "Content-Type": "application/json",
            ...headers
        },
        statusText,
        status
    });
}
