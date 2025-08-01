// @deno-types="@types/jsdom"
import { JSDOM } from "jsdom";

const jsdom = new JSDOM();

export const { window } = jsdom;
export const { document } = window;
