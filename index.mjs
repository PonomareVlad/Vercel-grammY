import {promisify} from "util";
import {webhookCallback} from "grammy";

export const devEnvs = ["development"];
export const {VERCEL_ENV, VERCEL_URL} = process.env;
export const isEdge = typeof EdgeRuntime === "string";

export const wait = promisify((a, f) => setTimeout(f, a));

export const safeStart = (bot, {events = ["SIGTERM", "SIGINT"], ...options} = {}) => {
    if (!isEdge) events.forEach(eventName => process.once(eventName, () => bot.stop()));
    return bot.start(options);
}

export const setWebhook = (bot, {host, path, headers, prefix, header, fallback, ...other} = {}) => {
    const url = getURL({host, path, headers, prefix, header, fallback});
    return bot.api.setWebhook(url, other);
}

export const setWebhookCallback = (bot, {catchErrors, allowEnvs = devEnvs, ...other} = {}) => {
    return async ({headers}, {json = jsonResponse}) => {
        try {
            if (!allowEnvs.includes(VERCEL_ENV)) return json({ok: false});
            const ok = await setWebhook(bot, {headers, ...other});
            return json({ok});
        } catch (e) {
            if (!catchErrors) throw e;
            console.error(e);
            return json(e);
        }
    }
}

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

export const getHost = ({headers = {}, header = "x-forwarded-host", fallback = VERCEL_URL} = {}) => {
    return (isEdge ? headers?.get?.(header) : headers[header]) || fallback;
}

export const getURL = ({host, path = "api/update", prefix = "", ...other} = {}) => {
    return new URL(`${prefix}https://${host || getHost(other)}/${path}`).href;
}
