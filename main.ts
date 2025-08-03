import { parseArgs } from "@std/cli/parse-args";
import * as path from "@std/path";
import { bold } from "@std/fmt/colors";
import { z } from "zod";
import loadEpub from "./ttsu/load-epub.ts";
import { Process } from "./sudachi/mod.ts";

const args = parseArgs(Deno.args, {
  boolean: ["help", "extract", "save", "verbose"],
  string: ["csv"],
  collect: ["ignore"],
  alias: {
    help: "h",
    extract: "e",
    save: "s",
    ignore: "i",
  },
});
const paths = args._.map(String);

if (args.help || !paths.length) {
  console.log(`Japanese epub stats

Usage: deno run -A main.ts [FILES] [OPTIONS]

Arguments:
  [FILES]
        Input epub files or directories to calculate stats
        EPUB files in a sub-directory will be considered part of the same series

Options:
  --csv <STATS_FILE>
        Output stats table to a file
  --extract
        Outputs the text extracted from each epub
        If an epub's file name is title.epub, it will output title.txt
  -s, --save
        Saves a 'stats.json' file in each directory so that when new books are added in the future
        existing books don't need to be processed again
  -i, --ignore <SERIES_TITLE>
        Prevent a directory from being included as a series
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
const savedSeriesDataSchema = z.object({
  name: z.string(),
  characters: z.number(),
  words: z.number().optional(),
  uniqueWords: z.number().optional(),
  wordsUsedOnce: z.number().optional(),
  uniqueKanji: z.number(),
  kanjiUsedOnce: z.number(),
  books: z.array(savedBookDataSchema),
});
const VERSION = "2025-08-02";
const savedDataSchema = z.object({
  version: z.literal(VERSION),
  books: z.array(savedBookDataSchema),
  series: z.array(savedSeriesDataSchema),
});
type SavedData = z.infer<typeof savedDataSchema>;

async function processFile({
  name,
  series,
  filePath,
  savedData,
  preTitle,
}: {
  name?: string;
  series?: {
    name: string;
    uniqueWords: Map<string, number>;
    uniqueKanji: Map<string, number>;
  };
  filePath: string;
  savedData?: SavedBookData;
  preTitle?: string;
}): Promise<SavedBookData> {
  if (hasSudachi && !savedData?.words) {
    savedData = undefined;
  }

  const parsedPath = path.parse(filePath);
  if (!name) {
    name = parsedPath.name;
  }

  console.log(
    `${preTitle ? `${preTitle} ` : ""}${bold(`======= ${series ? `${series.name} ` : ""}${name} =======`)}`,
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
      await loadEpub(filePath, series);
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
        series,
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
        const json = await Deno.readTextFile(statsPath).catch(() => "");
        savedData = savedDataSchema.parse(JSON.parse(json));
        // deno-lint-ignore no-empty
      } catch {}
    }

    const data: SavedData = {
      version: VERSION,
      books: [],
      series: [],
    };

    interface Book {
      type: "book";
      name: string;
      path: string;
    }
    interface Series {
      type: "series";
      name: string;
      books: Book[];
    }
    const books: Array<Book | Series> = [];
    let total = 0;
    const entries = [...Deno.readDirSync(filePath)];
    for (const bookEntry of entries) {
      if (bookEntry.isFile && bookEntry.name.endsWith(".epub")) {
        const name = path.parse(bookEntry.name).name;
        books.push({
          type: "book",
          name,
          path: path.join(filePath, bookEntry.name),
        });
        total++;
      }
    }
    for (const seriesEntry of entries) {
      if (
        seriesEntry.isDirectory &&
        (!args.ignore || !args.ignore.includes(seriesEntry.name))
      ) {
        const series: Series = {
          type: "series",
          name: seriesEntry.name,
          books: [],
        };
        const seriesPath = path.join(filePath, series.name);
        for (const bookEntry of Deno.readDirSync(seriesPath)) {
          if (bookEntry.isFile && bookEntry.name.endsWith(".epub")) {
            const name = path.parse(bookEntry.name).name;
            series.books.push({
              type: "book",
              name,
              path: path.join(seriesPath, bookEntry.name),
            });
            total++;
          }
        }
        series.books.sort((a, b) => a.name.localeCompare(b.name));
        books.push(series);
      }
    }
    books.sort((a, b) => a.name.localeCompare(b.name));

    const totalStr = total.toString();
    let i = 0;
    for (const entry of books) {
      if (entry.type === "book") {
        const name = entry.name;
        data.books.push(
          await processFile({
            name,
            filePath: entry.path,
            savedData: savedData?.books.find((x) => x.name === name),
            preTitle: `${(i + 1).toString().padStart(totalStr.length, " ")} / ${totalStr}`,
          }),
        );
        i++;
      }
    }
    for (const entry of books) {
      if (entry.type === "series") {
        let seriesSavedData = savedData?.series.find(
          (x) => x.name === entry.name,
        );

        if (seriesSavedData) {
          const savedBookNames = seriesSavedData.books.map((x) => x.name);
          const foundBookNames = entry.books.map((x) => x.name);
          if (
            savedBookNames.some((x) => !foundBookNames.includes(x)) ||
            foundBookNames.some((x) => !savedBookNames.includes(x))
          ) {
            seriesSavedData = undefined;
          }
        }

        const books: SavedBookData[] = [];
        const uniqueWords = new Map<string, number>();
        const uniqueKanji = new Map<string, number>();

        for (const book of entry.books) {
          const bookSavedData = seriesSavedData?.books.find(
            (x) => x.name === book.name,
          );
          books.push(
            await processFile({
              name: book.name,
              series: {
                name: entry.name,
                uniqueWords,
                uniqueKanji,
              },
              filePath: book.path,
              savedData: bookSavedData,
              preTitle: `${(i + 1).toString().padStart(totalStr.length, " ")} / ${totalStr}`,
            }),
          );
          i++;
        }

        let wordsUsedOnce = 0;
        for (const count of uniqueWords.values()) {
          if (count === 1) wordsUsedOnce++;
        }

        let kanjiUsedOnce = 0;
        for (const count of uniqueKanji.values()) {
          if (count === 1) kanjiUsedOnce++;
        }

        data.series.push({
          name: entry.name,
          characters: books.reduce((sum, book) => sum + book.characters, 0),
          words: books.reduce(
            (sum, book) =>
              typeof sum === "number" && typeof book.words === "number"
                ? sum + book.words
                : undefined,
            0 as number | undefined,
          ),
          uniqueWords: uniqueWords.size,
          wordsUsedOnce,
          uniqueKanji: uniqueKanji.size,
          kanjiUsedOnce,
          books,
        });
      }
    }

    if (args.save) {
      await Deno.writeTextFile(statsPath, JSON.stringify(data, null, 2));
    }
    if (args.csv) {
      const csvPath = path.join(filePath, args.csv);

      const rows = [`name,${headers.join(",")}`];

      rows.push(...books2Csv(data.books));
      for (const {
        name,
        characters,
        words,
        uniqueWords,
        wordsUsedOnce,
        uniqueKanji,
        kanjiUsedOnce,
        books,
      } of data.series) {
        rows.push(
          [
            name,
            characters,
            words || "",
            uniqueWords || "",
            wordsUsedOnce || "",
            uniqueKanji,
            kanjiUsedOnce,
          ].join(","),
          ...books2Csv(books),
        );
      }

      await Deno.writeTextFile(csvPath, rows.join("\n"));
    }
  } else {
    await processFile({ filePath });
  }
}

function books2Csv(books: SavedBookData[]) {
  return books.map((x) =>
    [
      x.name,
      x.characters,
      x.words || "",
      x.uniqueWords || "",
      x.wordsUsedOnce || "",
      x.uniqueKanji,
      x.kanjiUsedOnce,
    ].join(","),
  );
}

Deno.exit();
