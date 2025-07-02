import { parseArgs } from "@std/cli/parse-args";
import * as path from "@std/path";
import { bold } from "@std/fmt/colors";
import { z } from "zod";
import loadEpub from "./load-epub.ts";
import { Process } from "./sudachi/mod.ts";

const args = parseArgs(Deno.args, {
  boolean: ["help", "extract", "save", "verbose"],
  string: ["csv"],
  alias: {
    help: "h",
    extract: "e",
    save: "s",
  },
});
const paths = args._.map(String);

if (args.help || !paths.length) {
  console.log(`Japanese epub stats

Usage: deno run -A main.ts [FILES] [OPTIONS]

Arguments:
  [FILES]
        Input epub files or directories to calculate stats

Options:
  --csv <STATS_FILE>
        Output stats table to a file
  --extract
        Outputs the text extracted from each epub
        If an epub's file name is title.epub, it will output title.txt
  -s, --save
        Saves a 'stats.json' file in each directory so that when new books are added in the future
        existing books don't need to be processed again
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

const spacing = 4;
const headers = ["characters"];
if (hasSudachi) {
  headers.push("words", "unique words", "words used once");
}
headers.push("unique kanji", "kanji used once");

const savedBookDataSchema = z.object({
  name: z.string(),
  characters: z.number(),
  words: z.number().optional(),
  uniqueWords: z.number().optional(),
  wordsUsedOnce: z.number().optional(),
  uniqueKanji: z.number(),
  kanjiUsedOnce: z.number(),
});
type SavedBookData = z.infer<typeof savedBookDataSchema>;
const VERSION = "2025-07-02";
const savedDataSchema = z.object({
  version: z.literal(VERSION),
  books: z.array(savedBookDataSchema),
});
type SavedData = z.infer<typeof savedDataSchema>;

async function processFile(
  filePath: string,
  savedData?: SavedBookData,
  preTitle?: string,
): Promise<SavedBookData> {
  if (hasSudachi && !savedData?.words) {
    savedData = undefined;
  }

  const parsedPath = path.parse(filePath);
  const { name } = parsedPath;

  console.log(
    `${preTitle ? `${preTitle} ` : ""}${bold(`======= ${name} =======`)}`,
  );
  let header = "";
  for (const [i, label] of headers.entries()) {
    header += label;
    if (i < headers.length - 1) {
      header += " ".repeat(spacing);
    }
  }
  console.log(header);
  console.log("-".repeat(header.length));

  const rowData: number[] = [];
  if (savedData) {
    rowData.push(
      savedData.characters,
      savedData.words || 0,
      savedData.uniqueWords || 0,
      savedData.wordsUsedOnce || 0,
      savedData.uniqueKanji,
      savedData.kanjiUsedOnce,
    );
  } else {
    const { characters, uniqueKanji, uniqueKanjiUsedOnce, sections } =
      await loadEpub(filePath);
    savedData = {
      name,
      characters,
      uniqueKanji,
      kanjiUsedOnce: uniqueKanjiUsedOnce,
    };

    rowData.push(characters);

    if (hasSudachi) {
      let content = "";
      for (const { text } of sections) {
        if (text) {
          content += `${text}\n`;
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

      const { wordCount, uniqueWordCount, uniqueWordUsedOnceCount } = Process(
        content,
        output,
      );

      rowData.push(wordCount, uniqueWordCount, uniqueWordUsedOnceCount);
      savedData.words = wordCount;
      savedData.uniqueWords = uniqueWordCount;
      savedData.wordsUsedOnce = uniqueWordUsedOnceCount;
    }

    rowData.push(uniqueKanji, uniqueKanjiUsedOnce);

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
  }

  let row = "";
  for (const [i, label] of headers.entries()) {
    const data = rowData[i] || "";
    const str = data.toString();
    row += str;
    if (i < headers.length - 1) {
      row += " ".repeat(label.length - str.length + spacing);
    }
  }
  console.log(`${row}\n`);

  return savedData;
}

for (const filePath of paths) {
  const fileInfo = await Deno.stat(filePath);
  if (fileInfo.isDirectory) {
    let savedData: SavedData | undefined;
    const statsPath = path.join(filePath, "stats.json");
    if (args.save) {
      try {
        const json = await Deno.readTextFile(statsPath);
        savedData = savedDataSchema.parse(JSON.parse(json));
      } catch {}
    }

    const data: SavedData = {
      version: VERSION,
      books: [],
    };

    const entries = [...Deno.readDirSync(filePath)]
      .filter((x) => x.isFile && x.name.endsWith(".epub"))
      .sort((a, b) => a.name.localeCompare(b.name));
    const lenStr = entries.length.toString();
    for (const [i, { name }] of entries.entries()) {
      const innerFilePath = path.join(filePath, name);
      const parsedPath = path.parse(innerFilePath);
      data.books.push(
        await processFile(
          innerFilePath,
          savedData?.books.find((x) => x.name === parsedPath.name),
          `${(i + 1).toString().padStart(lenStr.length, " ")} / ${lenStr}`,
        ),
      );
    }

    if (args.save) {
      await Deno.writeTextFile(statsPath, JSON.stringify(data, null, 2));
    }
    if (args.csv) {
      const csvPath = path.join(filePath, args.csv);

      const rows = [`name,${headers.join(",")}`];
      rows.push(
        ...data.books.map((x) =>
          [
            x.name,
            x.characters,
            x.words || "",
            x.uniqueWords || "",
            x.wordsUsedOnce || "",
            x.uniqueKanji,
            x.kanjiUsedOnce,
          ].join(","),
        ),
      );

      await Deno.writeTextFile(csvPath, rows.join("\n"));
    }
  } else {
    await processFile(filePath);
  }
}

Deno.exit();
