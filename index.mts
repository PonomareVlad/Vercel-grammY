import {webhookCallback} from "grammy";

import type {Bot, RawApi} from "grammy";
import type {Other} from "grammy/out/core/api";
import type {WebhookOptions} from "grammy/out/convenience/webhook";

const {
    VERCEL_URL = "localhost",
    VERCEL_ENV = "development",
} = process.env as Record<string, string>;

/**
 * Options for hostname
 */
export interface OptionsForHost {
    /**
     * Optional headers from incoming request
     */
    headers?: Headers | Record<string, string>,
    /**
     * Optional header name which contains the hostname
     */
    header?: string,
    /**
     * Optional fallback hostname (`process.env.VERCEL_URL` by default)
     */
    fallback?: string,
}

/**
 * This method generates a hostname from the options passed to it
 * @returns Target hostname
 */
export function getHost({
                            fallback = VERCEL_URL,
                            headers = new Headers(),
                            header = "x-forwarded-host"
                        } = {} as OptionsForHost): string {
    return String((
        headers instanceof Headers ?
            headers?.get?.(header) :
            headers[header]
    ) ?? fallback);
}

/**
 * Options for URL
 */
export interface OptionsForURL extends OptionsForHost {
    /**
     * Optional hostname without protocol
     */
    host?: string,
    /**
     * Path to a function that receives updates
     */
    path?: string,
}

/**
 * This method generates a URL from the options passed to it
 * @returns Target URL
 */
export function getURL({
                           host,
                           path = "",
                           ...other
                       } = {} as OptionsForURL): string {
    return new URL(path, `https://${host ?? getHost(other)}`).href;
}

/**
 * Options for webhooks
 */
export interface OptionsForWebhook extends OptionsForURL, Other<RawApi, "setWebhook", "url"> {
    /**
     * Optional strategy for handling errors
     */
    onError?: "throw" | "return",
    /**
     * Optional list of environments where this method allowed
     */
    allowedEnvs?: string[],
}

/**
 * Callback factory for grammY `bot.api.setWebhook` method
 * @returns Target callback method
 */
export function setWebhookCallback(bot: Bot, {
    allowedEnvs = ["development"],
    onError = "throw",
    fallback,
    header,
    host,
    path,
    ...other
} = {} as OptionsForWebhook): (req: Request) => Promise<Response> {
    return async ({headers} = {} as Request, {json = jsonResponse} = {}): Promise<Response> => {
        try {
            if (!allowedEnvs.includes(VERCEL_ENV)) return json({ok: false});
            const url = getURL({headers, fallback, host, path, header});
            const ok = await bot.api.setWebhook(url, other);
            return json({ok});
        } catch (e) {
            if (onError === "throw") throw e;
            console.error(e);
            return json(e);
        }
    }
}

/**
 * Options for stream
 */
export interface OptionsForStream extends WebhookOptions {
    /**
     * Optional content for chunks
     */
    chunk?: string,
    /**
     * Optional interval for writing chunks to stream
     */
    intervalMilliseconds?: number,
}

/**
 * Callback factory for streaming webhook response
 * @returns Target callback method
 */
export function webhookStream(bot: Bot, {
    intervalMilliseconds = 1_000,
    timeoutMilliseconds = 55_000,
    chunk = ".",
    ...other
} = {} as OptionsForStream): (req: Request) => Response {
    const callback = webhookCallback(bot, "std/http", {timeoutMilliseconds, ...other});
    return (req: Request) => new Response(new ReadableStream({
        start: controller => {
            const encoder = new TextEncoder();
            const streamInterval = setInterval(() => {
                controller.enqueue(encoder.encode(chunk));
            }, intervalMilliseconds);
            return callback(req).finally(() => {
                clearInterval(streamInterval);
                controller.close();
            });
        }
    }));
}

/**
 * Parameters from `JSON.stringify` method
 */
export type StringifyJSON = Parameters<typeof JSON.stringify>;

/**
 * Options for JSON response
 * @public
 */
export interface OptionsForJSON extends ResponseInit {
    replacer?: StringifyJSON[1]
    space?: StringifyJSON[2]
}

/**
 * This method generates Response objects for JSON
 * @returns Target JSON Response
 */
export function jsonResponse(value: any, {
    space,
    status,
    replacer,
    statusText,
    headers = {},
} = {} as OptionsForJSON): Response {
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
