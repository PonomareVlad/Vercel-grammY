export * from "./index.mjs";
import {promisify} from "util";
import {webhookCallback} from "grammy/web";

export const wait = promisify((a, f) => setTimeout(f, a));

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
