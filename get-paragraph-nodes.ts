/**
 * @license BSD-3-Clause
 * Copyright (c) 2024, ッツ Reader Authors
 * All rights reserved.
 */
// Implemented from https://github.com/ttu-ttu/ebook-reader/blob/main/apps/web/src/lib/components/book-reader/get-paragraph-nodes.ts

import { window } from "./dom.ts";
import { isNodeGaiji } from "./is-node-gaiji.ts";

export function getParagraphNodes(node: Node) {
  return getTextNodeOrGaijiNodes(node, (n) => {
    if (n.nodeName === "rt") {
      n.parentNode?.removeChild(n);
      return false;
    }
    const isHidden =
      n instanceof window.HTMLElement &&
      (n.attributes.getNamedItem("aria-hidden") ||
        n.attributes.getNamedItem("hidden"));
    if (isHidden) {
      n.parentNode?.removeChild(n);
      return false;
    }
    return true;
  }).filter((n) => {
    if (isNodeGaiji(n)) {
      return true;
    }
    if (n.textContent?.replace(/\s/g, "").length) {
      return true;
    }
    return false;
  });
}

function getTextNodeOrGaijiNodes(
  node: Node,
  filterFn: (n: Node) => boolean,
): Node[] {
  if (!node.hasChildNodes() || !filterFn(node)) {
    return [];
  }

  return Array.from(node.childNodes)
    .flatMap((n) => {
      if (n.nodeType === window.Node.TEXT_NODE) {
        return [n];
      }
      if (isNodeGaiji(n)) {
        return [n];
      }
      return getTextNodeOrGaijiNodes(n, filterFn);
    })
    .filter(filterFn);
}
