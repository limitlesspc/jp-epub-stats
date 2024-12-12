/**
 * @license BSD-3-Clause
 * Copyright (c) 2024, ッツ Reader Authors
 * All rights reserved.
 */

import extractEpub from "./extract-epub.ts";
import generateEpubHtml from "./generate-epub-html.ts";
import generateEpubStyleSheet from "./generate-epub-style-sheet.ts";
import { isOPFType, type LoadData } from "./types.ts";
import reduceObjToBlobs from "./reduce-obj-to-blobs.ts";
import * as path from "@std/path";

export default async function loadEpub(filePath: string): Promise<LoadData> {
  const stream = await Deno.readFile(filePath);
  const blob = new Blob([stream]);
  const { contents, result: data } = await extractEpub(blob);
  const result = generateEpubHtml(data, contents);

  const displayData = {
    title: path.parse(filePath).name,
    hasThumb: true,
    styleSheet: generateEpubStyleSheet(data, contents),
  };

  const metadata = isOPFType(contents)
    ? contents["opf:package"]["opf:metadata"]
    : contents.package.metadata;

  if (metadata) {
    const dcTitle = metadata["dc:title"];
    if (typeof dcTitle === "string") {
      displayData.title = dcTitle;
    } else if (dcTitle && dcTitle["#text"]) {
      displayData.title = dcTitle["#text"];
    }
  }
  const blobData = reduceObjToBlobs(data);

  return {
    ...displayData,
    elementHtml: result.element.innerHTML,
    blobs: blobData,
    characters: result.characters,
    sections: result.sections,
  };
}
