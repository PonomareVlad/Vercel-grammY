import type {Bot} from "grammy";
import type {AbortSignal} from "abort-controller";
import type {Update} from "@grammyjs/types/update";
import type {WebhookOptions} from "grammy/out/convenience/webhook";
import {webhookCallback} from "grammy";

const {VERCEL_ENV, VERCEL_URL} = process.env as Record<string, string>;

/**
 * Options for hostname
 */
interface OptionsForHost {
    /**
     * Optional fallback hostname (`VERCEL_URL` by default)
     */
    fallback?: string,
    /**
     * Optional headers from incoming request
     */
    headers?: Headers | Record<string, string>,
    /**
     * Optional header name which contains the hostname
     */
    header?: string,
}

/**
 * This method generates a hostname from the options passed to it
 * @returns {string} Target hostname
 */
export function getHost({
                            fallback = VERCEL_URL,
                            headers = new Headers(),
                            header = "x-forwarded-host"
                        } = {} as OptionsForHost) {
    return String((
        headers instanceof Headers ?
            headers?.get?.(header) :
            headers[header]
    ) ?? fallback);
}

/**
 * Options for URL
 */
interface OptionsForURL extends OptionsForHost {
    /**
     * Optional hostname without protocol
     */
    host?: string,
    /**
     * Optional absolute path after `/`
     */
    path?: string,
}

/**
 * This method generates a URL from the options passed to it
 * @returns {string} Target URL
 */
export function getURL({
                           host,
                           path = "api/update",
                           ...other
                       } = {} as OptionsForURL) {
    return new URL(`https://${host ?? getHost(other)}/${path}`).href;
}

interface OptionsForCallback extends OptionsForURL {
    /**
     * Optional strategy for handling errors
     */
    onError?: "throw" | "return",
    /**
     * Optional list of environments where this method allowed
     */
    allowedEnvs?: string[],

    // Rest options for bot.api.setWebhook method
    signal?: AbortSignal,
    secret_token?: string,
    max_connections?: number,
    drop_pending_updates?: boolean,
    allowed_updates?: ReadonlyArray<Exclude<keyof Update, "update_id">>,
}

/**
 * Callback factory for grammY `bot.api.setWebhook` method
 * @returns {(req:Request) => Promise<Response>} Target callback method
 */
export function setWebhookCallback(bot: Bot, {
    allowedEnvs = ["development"],
    drop_pending_updates,
    onError = "throw",
    max_connections,
    allowed_updates,
    secret_token,
    signal,
    ...other
} = {} as OptionsForCallback) {
    return async ({headers} = {} as Request, {json = jsonResponse} = {}) => {
        try {
            if (!allowedEnvs.includes(VERCEL_ENV)) return json({ok: false});
            const options = {drop_pending_updates, max_connections, allowed_updates, secret_token};
            const ok = await bot.api.setWebhook(getURL({headers, ...other}), options, signal);
            return json({ok});
        } catch (e) {
            if (onError === "throw") throw e;
            console.error(e);
            return json(e);
        }
    }
}

interface OptionsForStream extends WebhookOptions {
    /**
     * Optional interval for writing chunks to stream
     */
    interval?: number,
    /**
     * Optional content for chunks
     */
    chunk?: string,
}

/**
 * Callback factory for streaming webhook response
 * @returns {() => Response} Target callback method
 */
export function webhookStream(bot: Bot, {
    timeoutMilliseconds = 55_000,
    interval = 1000,
    chunk = ".",
    ...other
} = {} as OptionsForStream) {
    const callback = webhookCallback(bot, "std/http", {timeoutMilliseconds, ...other});
    return (request: Request) => new Response(new ReadableStream({
        start: controller => {
            const encoder = new TextEncoder();
            const streamInterval = setInterval(() => {
                controller.enqueue(encoder.encode(chunk));
            }, interval);
            return callback(request).finally(() => {
                clearInterval(streamInterval);
                controller.close();
            });
        }
    }));
}

interface OptionsForJSON extends ResponseInit {
    replacer?: (this: any, key: string, value: any) => any,
    space?: string | number,
}

/**
 * This method generates Response objects for JSON
 * @returns {Response} Target JSON Response
 */
export function jsonResponse(value: any, {
    space,
    status,
    replacer,
    statusText,
    headers = {},
} = {} as OptionsForJSON) {
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
