/**
 * @license BSD-3-Clause
 * Copyright (c) 2024, ッツ Reader Authors
 * All rights reserved.
 */

import { window } from "./dom.ts";
import { JSDOM } from "jsdom";
import {
  isOPFType,
  type EpubContent,
  type EpubOPFContent,
  type Section,
} from "./types.ts";
import { getCharacterCount } from "./get-character-count.ts";
import { getParagraphNodes } from "./get-paragraph-nodes.ts";

export const prependValue = "ttu-";

export default function generateEpubHtml(
  data: Record<string, string | Blob>,
  contents: EpubContent | EpubOPFContent,
) {
  const fallbackData = new Map<string, string>();

  let tocData = { type: 3, content: "" };
  let navKey = "";

  const itemIdToHtmlRef = (
    isOPFType(contents)
      ? contents["opf:package"]["opf:manifest"]["opf:item"]
      : contents.package.manifest.item
  ).reduce<Record<string, string>>((acc, item) => {
    if (item["@_fallback"]) {
      fallbackData.set(item["@_id"], item["@_fallback"]);
    }

    if (
      item["@_media-type"] === "application/xhtml+xml" ||
      item["@_media-type"] === "text/html"
    ) {
      acc[item["@_id"]] = item["@_href"];

      if (item["@_properties"] === "nav") {
        navKey = item["@_href"];
      }
    }
    return acc;
  }, {});

  for (const [key, value] of Object.entries(data)) {
    const isV2Toc = key.endsWith(".ncx") && !tocData.content;

    if (isV2Toc || navKey === key) {
      tocData = {
        type: isV2Toc ? 2 : 3,
        content: value as string,
      };
    }
  }

  const parser = new window.DOMParser();
  const spineItemRef = isOPFType(contents)
    ? contents["opf:package"]["opf:spine"]["opf:itemref"]
    : contents.package.spine.itemref;
  const itemRefs = Array.isArray(spineItemRef) ? spineItemRef : [spineItemRef];
  const sectionData: Section[] = [];

  let mainChapters: Section[] = [];
  let firstChapterMatchIndex = -1;

  if (tocData.type && tocData.content) {
    let parsedToc = parser.parseFromString(tocData.content, "text/html");

    if (tocData.type === 3) {
      let navTocElement = parsedToc.querySelector(
        'nav[epub\\:type="toc"],nav#toc',
      );

      if (!navTocElement) {
        const jsdom = new JSDOM(tocData.content, { contentType: "text/xml" });
        parsedToc = jsdom.window.document;
        navTocElement = parsedToc.querySelector(
          'nav[epub\\:type="toc"],nav#toc',
        );
      }

      if (navTocElement) {
        mainChapters = [...navTocElement.querySelectorAll("a")].map((elm) => {
          const anchor = elm as HTMLAnchorElement;

          return {
            reference: anchor.href,
            charactersWeight: 1,
            label: anchor.textContent,
          };
        });
      }
    } else {
      if (parsedToc.body.children.item(0)?.tagName === "NCX") {
        const jsdom = new JSDOM(tocData.content, { contentType: "text/xml" });
        parsedToc = jsdom.window.document;
      }

      mainChapters = [...parsedToc.querySelectorAll("navPoint")].map((elm) => {
        const navLabel = elm.querySelector("navLabel text") as HTMLElement;
        const contentElm = elm.querySelector("content") as HTMLElement;

        return {
          reference: contentElm.getAttribute("src") as string,
          charactersWeight: 1,
          label: navLabel.textContent,
        };
      });
    }
  }

  if (mainChapters.length) {
    firstChapterMatchIndex = itemRefs.findIndex((ref) =>
      mainChapters[0].reference.includes(
        itemIdToHtmlRef[ref["@_idref"].split("/").pop() || ""],
      ),
    );

    if (firstChapterMatchIndex !== 0) {
      const firstRef = itemRefs[0]["@_idref"];
      const firstHTMLRef = itemIdToHtmlRef[firstRef];
      const fallbackRef = fallbackData.get(firstRef);
      const reference =
        firstHTMLRef ||
        (fallbackRef ? itemIdToHtmlRef[fallbackRef] : firstHTMLRef);

      mainChapters.unshift({
        reference,
        charactersWeight: 1,
        label: "Preface",
        startCharacter: 0,
      });
    }
  }

  let currentMainChapter = mainChapters[0];
  let currentMainChapterId = currentMainChapter
    ? `${prependValue}${itemRefs[0]["@_idref"]}`
    : "";
  let currentMainChapterIndex = 0;
  let previousCharacterCount = 0;
  let currentCharCount = 0;
  const uniqueKanji = new Map<string, number>();

  for (const item of itemRefs) {
    let itemIdRef = item["@_idref"];
    let htmlHref = itemIdToHtmlRef[itemIdRef];

    if (!htmlHref && fallbackData.has(itemIdRef)) {
      itemIdRef = fallbackData.get(itemIdRef) as string;
      htmlHref = itemIdToHtmlRef[itemIdRef];
    }

    let parsedContent = parser.parseFromString(
      data[htmlHref] as string,
      "text/html",
    );
    let body = parsedContent.body;

    if (!body?.childNodes?.length) {
      parsedContent = parser.parseFromString(
        data[htmlHref] as string,
        "text/xml",
      );
      const potentialBody = parsedContent.querySelector("body"); // XMLDocument doesn't seem to have the body property

      if (!potentialBody?.childNodes?.length) {
        throw new Error("Unable to find valid body content while parsing EPUB");
      }
      body = potentialBody;
    }

    const results = countForElement(body, uniqueKanji);
    currentCharCount += results.characterCount;

    const mainChapterIndex = mainChapters.findIndex((chapter) =>
      chapter.reference.includes(htmlHref.split("/").pop() || ""),
    );
    const mainChapter =
      mainChapterIndex > -1 ? mainChapters[mainChapterIndex] : undefined;
    const characters = currentCharCount - previousCharacterCount;

    if (mainChapter) {
      const oldMainChapterIndex = currentMainChapterIndex;

      currentMainChapter = mainChapter;
      currentMainChapterIndex = sectionData.length;
      currentMainChapterId = `${prependValue}${itemIdRef}`;

      sectionData.push({
        reference: currentMainChapterId,
        charactersWeight: characters || 1,
        label: currentMainChapter.label,
        startCharacter: currentMainChapterIndex
          ? (sectionData[oldMainChapterIndex].startCharacter as number) +
            (sectionData[oldMainChapterIndex].characters as number)
          : 0,
        characters,
        text: results.text,
      });
    } else if (currentMainChapter) {
      (sectionData[currentMainChapterIndex].characters as number) += characters;

      sectionData.push({
        reference: `${prependValue}${itemIdRef}`,
        charactersWeight: characters || 1,
        parentChapter: currentMainChapterId,
        text: results.text,
      });
    }

    previousCharacterCount = currentCharCount;
  }

  let kanjiUsedOnce = 0;
  for (const count of uniqueKanji.values()) {
    if (count === 1) kanjiUsedOnce++;
  }

  return {
    characters: currentCharCount,
    uniqueKanji: uniqueKanji.size,
    kanjiUsedOnce,
    sections: sectionData.filter((item) =>
      item.reference.startsWith(prependValue),
    ),
  };
}

function countForElement(containerEl: Node, uniqueKanji: Map<string, number>) {
  const paragraphs = getParagraphNodes(containerEl);

  let characterCount = 0;

  for (const node of paragraphs) {
    characterCount += getCharacterCount(node, uniqueKanji);
  }

  return {
    text: containerEl.textContent?.trim() || "",
    characterCount,
  };
}
