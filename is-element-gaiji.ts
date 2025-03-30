/**
 * @license BSD-3-Clause
 * Copyright (c) 2024, ッツ Reader Authors
 * All rights reserved.
 */
// Implemented from https://github.com/ttu-ttu/ebook-reader/blob/main/apps/web/src/lib/functions/is-element-gaiji.ts

export function isElementGaiji(el: HTMLImageElement) {
  return Array.from(el.classList).some((className) =>
    className.includes("gaiji"),
  );
}
