import { parseArgs } from "@std/cli/parse-args";
import * as path from "@std/path";
import stringWidth from "string-width";
import loadEpub from "./load-epub.ts";
import { isNotJapaneseRegex } from "./get-character-count.ts";

const args = parseArgs(Deno.args, {
  boolean: ["help", "extract", "verbose"],
  string: ["csv"],
  alias: {
    help: "h",
    extract: "e",
  },
});
const filePaths = args._.map(String);

if (args.help || !filePaths.length) {
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
        Show this help
  --verbose
        Shows more information while running`);
  Deno.exit();
}

const whichCommand = new Deno.Command("which", { args: ["sudachi"] });
const whichOutput = await whichCommand.output();
const hasSudachi = whichOutput.success;
if (args.verbose) {
  console.error(`Sudachi${hasSudachi ? "" : " not"} detected`);
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
  { label: "file", width: longestFileNameWidth },
  { label: "characters" },
];
if (hasSudachi) {
  headers.push(
    { label: "words" },
    { label: "unique words" },
    { label: "words used once" },
  );
}
headers.push({ label: "unique kanji" }, { label: "kanji used once" });

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
  const { characters, uniqueKanji, kanjiUsedOnce, sections } =
    await loadEpub(filePath);

  const rowData = [title, characters];

  const parsedPath = path.parse(filePath);

  if (hasSudachi) {
    let content = "";
    for (const { text } of sections) {
      if (text) {
        content += text;
      }
    }

    const textPath = path.format({
      dir: parsedPath.dir,
      name: parsedPath.name,
      ext: ".sudachi.txt",
    });
    await Deno.writeTextFile(textPath, content);

    const sudachiCommand = new Deno.Command("sudachi", {
      args: ["--all", textPath],
    });
    const { stdout } = await sudachiCommand.output();
    await Deno.remove(textPath);

    const output = new TextDecoder().decode(stdout);

    const uniqueWords = new Map<string, number>();
    let words = 0;
    for (const line of output.split("\n")) {
      const [surface, _tags, _normalized, dictonary] = line.split("\t");
      if (surface.replace(isNotJapaneseRegex, "") && surface !== "EOS") {
        const count = uniqueWords.get(dictonary) || 0;
        uniqueWords.set(dictonary, count + 1);
        words++;
      }
    }

    let wordsUsedOnce = 0;
    for (const count of uniqueWords.values()) {
      if (count === 1) wordsUsedOnce++;
    }

    rowData.push(words, uniqueWords.size, wordsUsedOnce);
  }

  rowData.push(uniqueKanji, kanjiUsedOnce);

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
    rows.push(rowData.join(","));
  }
}

if (args.csv) {
  await Deno.writeTextFile(args.csv, rows.join("\n"));
}
