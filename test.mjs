import {getHost} from "./index.mjs";
import {describe, it} from "node:test";
import assert from "node:assert";

describe("getHost", () => {

    it("Should return localhost by default", () => assert.equal(getHost(), "localhost"));

})
