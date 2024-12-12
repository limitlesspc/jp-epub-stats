/**
 * @license BSD-3-Clause
 * Copyright (c) 2024, ッツ Reader Authors
 * All rights reserved.
 */

import { window } from "./dom.ts";
import { isElementGaiji } from "./is-element-gaiji.ts";

export function isNodeGaiji(node: Node) {
  if (!(node instanceof window.HTMLImageElement)) {
    return false;
  }
  return isElementGaiji(node);
}
