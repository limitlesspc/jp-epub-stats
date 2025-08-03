import { Parse } from "./parser.ts";

const unrelatedRegex =
  /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uFF21-\uFF3A\uFF41-\uFF5A\uFF10-\uFF19\u3005．]/g;
const japaneseRegex =
  /[\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}\p{Script_Extensions=Han}]/u;
const specialRegex =
  /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uFF21-\uFF3A\uFF41-\uFF5A\uFF10-\uFF19\u3005]/g;

export function Process(
  text: string,
  output: string,
  series?: { uniqueWords: Map<string, number> },
) {
  let wordInfos = Parse(output);

  // Only keep kanjis, kanas, digits,full width digits, latin characters, full width latin characters
  wordInfos.forEach((x) => (x.Text = x.Text.replaceAll(unrelatedRegex, "")));
  // Remove empty lines
  wordInfos = wordInfos.filter((x) => x.Text);

  // Filter bad lines that cause exceptions
  wordInfos.forEach((x) => (x.Text = x.Text.replaceAll("ッー", "")));

  const uniqueWords = new Map<string, number>();
  for (const word of wordInfos) {
    const count = uniqueWords.get(word.DictionaryForm) || 0;
    uniqueWords.set(word.DictionaryForm, count + 1);
    if (series) {
      const count = series.uniqueWords.get(word.DictionaryForm) || 0;
      series.uniqueWords.set(word.DictionaryForm, count + 1);
    }
  }

  let wordsUsedOnce = 0;
  for (const count of uniqueWords.values()) {
    if (count === 1) wordsUsedOnce++;
  }

  // Split into sentences
  let sentences = text.split(/(?<=[。！？」）])|(?<=[…—])\r\n/);
  sentences = sentences
    .map((sentence) => {
      // Find the first Japanese character
      const match = sentence.match(japaneseRegex);
      if (match?.index) {
        const startIndex = match.index;
        // Remove all special characters
        return sentence.substring(startIndex).replaceAll(specialRegex, "");
      }

      return "";
    })
    .filter((s) => !s);

  return {
    wordCount: wordInfos.length,
    uniqueWords: uniqueWords.size,
    wordsUsedOnce: [...uniqueWords.values()].reduce(
      (sum, count) => (count === 1 ? sum + 1 : sum),
      0,
    ),
    sentenceCount: sentences.length,
  };
}
