/**
 * @license BSD-3-Clause
 * Copyright (c) 2024, ッツ Reader Authors
 * All rights reserved.
 */

import { window } from "./dom.ts";
import { isNodeGaiji } from "./is-node-gaiji.ts";

export function getParagraphNodes(node: Node) {
  return getTextNodeOrGaijiNodes(node, (n) => {
    if (n.nodeName === "RT") {
      return false;
    }
    const isHidden =
      n instanceof window.HTMLElement &&
      (n.attributes.getNamedItem("aria-hidden") ||
        n.attributes.getNamedItem("hidden"));
    if (isHidden) {
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
