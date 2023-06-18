export * from "./index.mjs";
import {writeFileSync} from "fs";

export const saveInfo = async (bot, {path}) => {
    const info = await bot.api.getMe();
    writeFileSync(path, JSON.stringify(info));
    return info;
}
