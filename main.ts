import { parseArgs } from "@std/cli/parse-args";
import * as path from "@std/path";
import stringWidth from "string-width";
import loadEpub from "./load-epub.ts";
import { Section } from "./types.ts";

const args = parseArgs(Deno.args, {
  boolean: ["csv", "output-text"],
});

const filePaths = args._.map(String);
const files = filePaths.map((filePath) => {
  const { dir, name } = path.parse(filePath);
  return {
    path: filePath,
    title: dir ? `${dir}/${name}` : name,
  };
});

if (args.csv) {
  console.log(
    "title,characters,unique kanji,kanji used once,kanji used once (%)",
  );

  for (const { path: filePath, title } of files) {
    const { characters, uniqueKanji, uniqueKanjiUsedOnce, sections } =
      await loadEpub(filePath);

    const rowData = [
      title,
      characters,
      uniqueKanji,
      uniqueKanjiUsedOnce,
      `${Math.round((uniqueKanjiUsedOnce / uniqueKanji) * 100)}%`,
    ];
    console.log(rowData.join(","));

    if (args["output-text"]) {
      const parsedPath = path.parse(filePath);
      const textPath = path.format({
        dir: parsedPath.dir,
        name: parsedPath.name,
        ext: ".txt",
      });
      await Deno.writeTextFile(textPath, sections2Txt(sections));
    }
  }
} else {
  const longestFileNameWidth = Math.max(
    ...files.map(({ title }) => stringWidth(title)),
  );

  const spacing = 4;
  const headers = [
    { label: "title", width: longestFileNameWidth },
    { label: "characters" },
    { label: "unique kanji" },
    { label: "kanji used once" },
    { label: "kanji used once (%)" },
  ];

  let header = "";
  for (const [i, { label, width = label.length }] of headers.entries()) {
    header += label;
    if (i < headers.length - 1) {
      header += " ".repeat(width - label.length + spacing);
    }
  }
  console.log(header);
  console.log("-".repeat(header.length));
  for (const { path: filePath, title } of files) {
    const { characters, uniqueKanji, uniqueKanjiUsedOnce, sections } =
      await loadEpub(filePath);

    const rowData = [
      title,
      characters,
      uniqueKanji,
      uniqueKanjiUsedOnce,
      `${Math.round((uniqueKanjiUsedOnce / uniqueKanji) * 100)}%`,
    ];
    let row = "";
    for (const [i, { label, width = label.length }] of headers.entries()) {
      const data = rowData[i] || "";
      const str = data.toString();
      row += str;
      if (i < headers.length - 1) {
        row += " ".repeat(width - stringWidth(str) + spacing);
      }
    }
    console.log(row);

    if (args["output-text"]) {
      const parsedPath = path.parse(filePath);
      const textPath = path.format({
        dir: parsedPath.dir,
        name: parsedPath.name,
        ext: ".txt",
      });
      await Deno.writeTextFile(textPath, sections2Txt(sections));
    }
  }
}

function sections2Txt(sections: Section[]) {
  let content = "";
  for (const { label, text, parentChapter } of sections) {
    if (label) content += `\n\n\n${label}\n\n`;
    if (text) {
      if (!parentChapter) content += "\n\n\n";
      content += `${text}\n`;
    }
  }
  return content;
}
