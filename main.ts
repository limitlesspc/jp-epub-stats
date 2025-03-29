import { parseArgs } from "@std/cli/parse-args";
import * as path from "@std/path";
import stringWidth from "string-width";
import loadEpub from "./load-epub.ts";

const args = parseArgs(Deno.args, {
  boolean: ["help", "h", "extract", "e"],
  string: ["csv"],
});
const filePaths = args._.map(String);

if (args.help || args.h || !filePaths.length) {
  console.log(`Japanese epub stats

Usage: deno run -A main.ts [FILES] [OPTIONS]

Arguments:
  [FILES]
        Input epub files to calculate stats

Options:
  --csv <STATS_FILE>
        Output stats table to a file
  --extract
        Outputs the text extracted from each epub
        If an epub's file name is title.epub, it will output title.txt
  -h, --help
        Show this help`);
  Deno.exit();
}

const files = filePaths.map((filePath) => {
  const { dir, name } = path.parse(filePath);
  return {
    path: filePath,
    title: dir ? `${dir}/${name}` : name,
  };
});

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

const rows = [headers.map((x) => x.label).join(",")];

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

  if (args.extract) {
    const parsedPath = path.parse(filePath);
    const textPath = path.format({
      dir: parsedPath.dir,
      name: parsedPath.name,
      ext: ".txt",
    });

    let content = "";
    for (const { label, text, parentChapter } of sections) {
      if (label && !text?.trimStart().startsWith(label))
        content += `\n\n\n\n     ${label}\n`;
      if (text) {
        if (!parentChapter) content += "\n\n";
        content += `\n${text}\n`;
      }
    }

    await Deno.writeTextFile(textPath, content);
  }

  if (args.csv) {
    const rowData = [
      title,
      characters,
      uniqueKanji,
      uniqueKanjiUsedOnce,
      `${Math.round((uniqueKanjiUsedOnce / uniqueKanji) * 100)}%`,
    ];
    rows.push(rowData.join(","));
  }
}

if (args.csv) {
  await Deno.writeTextFile(args.csv, rows.join("\n"));
}
