/**
 * @license BSD-3-Clause
 * Copyright (c) 2024, ッツ Reader Authors
 * All rights reserved.
 */

import { isNodeGaiji } from "./is-node-gaiji.ts";

export function getCharacterCount(
  node: Node,
  uniqueKanji: Map<string, number>,
) {
  return isNodeGaiji(node) ? 1 : getRawCharacterCount(node, uniqueKanji);
}

const isNotJapaneseRegex =
  /[^0-9A-Z○◯々-〇〻ぁ-ゖゝ-ゞァ-ヺー０-９Ａ-Ｚｦ-ﾝ\p{Radical}\p{Unified_Ideograph}]+/gimu;
const kanjiRegex = /[\u4e00-\u9faf]|[\u3400-\u4dbf]/;

function getRawCharacterCount(node: Node, uniqueKanji: Map<string, number>) {
  if (!node.textContent) return 0;
  return countUnicodeCharacters(
    node.textContent.replace(isNotJapaneseRegex, ""),
    uniqueKanji,
  );
}

/**
 * Because '𠮟る'.length = 3
 * Reference: https://dmitripavlutin.com/what-every-javascript-developer-should-know-about-unicode/#length-and-surrogate-pairs
 */
function countUnicodeCharacters(s: string, uniqueKanji: Map<string, number>) {
  const chars = Array.from(s);
  for (const char of chars) {
    if (kanjiRegex.test(char)) {
      const count = uniqueKanji.get(char) || 0;
      uniqueKanji.set(char, count + 1);
    }
  }
  return chars.length;
}
