import * as path from "@std/path";
import loadEpub from "./load-epub.ts";
import stringWidth from "string-width";

const filePaths = Deno.args;
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

let header = "";
for (const [i, { label, width = label.length }] of headers.entries()) {
  header += label;
  if (i < headers.length - 1) {
    header += " ".repeat(width - label.length + spacing);
  }
}
console.log(header);
console.log("-".repeat(header.length));
for (const { path, title } of files) {
  const { characters, uniqueKanji, uniqueKanjiUsedOnce } = await loadEpub(path);

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
}
