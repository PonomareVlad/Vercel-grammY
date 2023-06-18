export const devEnvs = ["development"];
export const {VERCEL_ENV, VERCEL_URL} = process.env;
export const isEdge = typeof EdgeRuntime === "string";

export const getURL = ({path = "api/update", prefix = "", ...other} = {}) => {
    return new URL(`${prefix}https://${getHost(other)}/${path}`).href;
}

export const getHost = ({headers = {}, header = "x-forwarded-host", fallback = VERCEL_URL} = {}) => {
    return (isEdge ? headers?.get?.(header) : headers[header]) || fallback;
}

export const setWebhook = (bot, {path, prefix, header, fallback, catchErrors, allowEnvs = devEnvs, ...other} = {}) => {
    return async ({headers}, {json = jsonResponse}) => {
        try {
            if (!allowEnvs.includes(VERCEL_ENV)) return json({ok: false});
            const url = getURL({path, headers, prefix, header, fallback});
            const ok = await bot.api.setWebhook(url, other);
            return json({ok});
        } catch (e) {
            if (!catchErrors) throw e;
            console.error(e);
            return json(e);
        }
    }
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
