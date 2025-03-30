/// Implemented from https://github.com/Sirush/Jiten/blob/master/Jiten.Parser/Parser.cs
/// Original code is licenced under Apache 2.0 https://www.apache.org/licenses/LICENSE-2.0

import { AmountCombinations } from "./amount_combinations.ts";
import { PartOfSpeech, PartOfSpeechSection } from "./pos.ts";
import { ToFullWidthDigits } from "./string.ts";
import { WordInfo } from "./word_info.ts";

const SpecialCases3: Array<[string, string, string, PartOfSpeech]> = [
  ["な", "の", "で", PartOfSpeech.Expression],
  ["で", "は", "ない", PartOfSpeech.Expression],
  ["それ", "で", "も", PartOfSpeech.Conjunction],
  ["なく", "なっ", "た", PartOfSpeech.Verb],
];

const SpecialCases2: Array<[string, string, PartOfSpeech]> = [
  ["じゃ", "ない", PartOfSpeech.Expression],
  ["に", "しろ", PartOfSpeech.Expression],
  ["だ", "けど", PartOfSpeech.Conjunction],
  ["だ", "が", PartOfSpeech.Conjunction],
  ["で", "さえ", PartOfSpeech.Expression],
  ["で", "すら", PartOfSpeech.Expression],
  ["と", "いう", PartOfSpeech.Expression],
  ["と", "か", PartOfSpeech.Conjunction],
  ["だ", "から", PartOfSpeech.Conjunction],
  ["これ", "まで", PartOfSpeech.Expression],
  ["それ", "も", PartOfSpeech.Conjunction],
  ["それ", "だけ", PartOfSpeech.Noun],
  ["くせ", "に", PartOfSpeech.Conjunction],
  ["の", "で", PartOfSpeech.Particle],
  ["誰", "も", PartOfSpeech.Expression],
  ["誰", "か", PartOfSpeech.Expression],
  ["すぐ", "に", PartOfSpeech.Adverb],
  ["なん", "か", PartOfSpeech.Particle],
  ["だっ", "た", PartOfSpeech.Expression],
  ["だっ", "たら", PartOfSpeech.Conjunction],
  ["よう", "に", PartOfSpeech.Expression],
  ["ん", "です", PartOfSpeech.Expression],
  ["ん", "だ", PartOfSpeech.Expression],
  ["です", "か", PartOfSpeech.Expression],
];

const HonorificsSuffixes = ["さん", "ちゃん", "くん"];

export function Parse(output: string) {
  let wordInfos: WordInfo[] = [];

  for (const line of output.split("\n")) {
    if (line === "EOS") continue;

    const wi = new WordInfo(line);
    if (!wi.IsInvalid) {
      wordInfos.push(wi);
    }
  }

  wordInfos = ProcessSpecialCases(wordInfos);
  wordInfos = CombineConjunctiveParticle(wordInfos);
  wordInfos = CombinePrefixes(wordInfos);

  wordInfos = CombineAmounts(wordInfos);
  wordInfos = CombineTte(wordInfos);
  wordInfos = CombineAuxiliaryVerbStem(wordInfos);
  wordInfos = CombineAuxiliary(wordInfos);
  wordInfos = CombineVerbDependant(wordInfos);
  wordInfos = CombineAdverbialParticle(wordInfos);
  wordInfos = CombineSuffix(wordInfos);
  wordInfos = CombineParticles(wordInfos);

  wordInfos = CombineFinal(wordInfos);

  wordInfos = SeparateSuffixHonorifics(wordInfos);

  return wordInfos;
}

/// <summary>
/// Handle special cases that could not be covered by the other rules
/// </summary>
/// <param name="wordInfos"></param>
/// <returns></returns>
function ProcessSpecialCases(wordInfos: WordInfo[]) {
  for (let i = 0; i < wordInfos.length - 2; i++) {
    // surukudasai
    if (
      wordInfos[i].DictionaryForm === "する" &&
      wordInfos[i + 1].Text === "て" &&
      wordInfos[i + 2].DictionaryForm === "くださる"
    ) {
      wordInfos[i].Text =
        wordInfos[i].Text + wordInfos[i + 1].Text + wordInfos[i + 2].Text;
      wordInfos.splice(i + 1, 2);
    }

    for (const sc of SpecialCases3) {
      if (
        wordInfos[i].Text === sc[0] &&
        wordInfos[i + 1].Text === sc[1] &&
        wordInfos[i + 2].Text === sc[2]
      ) {
        wordInfos[i].Text =
          wordInfos[i].Text + wordInfos[i + 1].Text + wordInfos[i + 2].Text;
        wordInfos.splice(i + 1, 2);

        wordInfos[i].PartOfSpeech = sc[3];
      }
    }
  }

  for (let i = 0; i < wordInfos.length - 1; i++) {
    for (const sc of SpecialCases2) {
      if (wordInfos[i].Text === sc[0] && wordInfos[i + 1].Text === sc[1]) {
        wordInfos[i].Text += wordInfos[i + 1].Text;
        wordInfos.splice(i + 1, 1);

        wordInfos[i].PartOfSpeech = sc[2];
      }
    }
  }

  for (let i = 0; i < wordInfos.length; i++) {
    // This word is (sometimes?) parsed as auxiliary for some reason
    if (wordInfos[i].Text === "でしょう") {
      wordInfos[i].PartOfSpeech = PartOfSpeech.Expression;
    }
  }

  // I'm not sure why this happens, but sudachi thinks those words are proper nouns
  for (let i = 0; i < wordInfos.length; i++) {
    if (wordInfos[i].Text === "俺の") {
      wordInfos[i].Text = "俺";
      wordInfos[i].DictionaryForm = "俺";
      wordInfos[i].PartOfSpeech = PartOfSpeech.Pronoun;
      wordInfos[i].PartOfSpeechSection1 = PartOfSpeechSection.None;
      const no = new WordInfo("");
      no.Text = "の";
      no.PartOfSpeech = PartOfSpeech.Particle;
      no.PartOfSpeechSection1 = PartOfSpeechSection.CaseMarkingParticle;
      no.Reading = "の";
      no.DictionaryForm = "の";
      wordInfos.splice(i + 1, 0, no);
    }

    if (wordInfos[i].Text === "泣きながら") {
      wordInfos[i].Text = "泣き";
      wordInfos[i].DictionaryForm = "泣き";
      wordInfos[i].PartOfSpeech = PartOfSpeech.Noun;
      wordInfos[i].PartOfSpeechSection1 = PartOfSpeechSection.None;
      const no = new WordInfo("");
      no.Text = "ながら";
      no.PartOfSpeech = PartOfSpeech.Particle;
      no.PartOfSpeechSection1 = PartOfSpeechSection.CaseMarkingParticle;
      no.Reading = "ながら";
      no.DictionaryForm = "ながら";
      wordInfos.splice(i + 1, 0, no);
    }
  }

  return wordInfos;
}

function CombinePrefixes(wordInfos: WordInfo[]) {
  for (let i = 0; i < wordInfos.length - 1; i++) {
    if (wordInfos[i].PartOfSpeech === PartOfSpeech.Prefix) {
      wordInfos[i + 1].Text = wordInfos[i].Text + wordInfos[i + 1].Text;
      wordInfos.splice(i, 1);
      i--;
    }
  }

  return wordInfos;
}

function CombineAmounts(wordInfos: WordInfo[]) {
  for (let i = 0; i < wordInfos.length - 1; i++) {
    if (
      wordInfos[i].HasPartOfSpeechSection(PartOfSpeechSection.Amount) ||
      wordInfos[i].HasPartOfSpeechSection(PartOfSpeechSection.Numeral)
    ) {
      const fullWidthDigits = ToFullWidthDigits(wordInfos[i].Text);

      if (
        !AmountCombinations.includes(
          fullWidthDigits + "+" + wordInfos[i + 1].Text,
        )
      )
        continue;

      wordInfos[i + 1].Text = fullWidthDigits + wordInfos[i + 1].Text;
      wordInfos[i + 1].PartOfSpeech = PartOfSpeech.Noun;
      wordInfos.splice(i, 1);
      i--;
    }
  }

  return wordInfos;
}

function CombineTte(wordInfos: WordInfo[]) {
  for (let i = 0; i < wordInfos.length - 1; i++) {
    if (
      wordInfos[i].Text.endsWith("っ") &&
      wordInfos[i + 1].Text.startsWith("て")
    ) {
      wordInfos[i].Text += wordInfos[i + 1].Text;
      wordInfos.splice(i + 1, 1);
      i--;
    }
  }

  return wordInfos;
}

function CombineVerbDependant(wordInfos: WordInfo[]) {
  // Dependants
  for (let i = 1; i < wordInfos.length; i++) {
    if (
      wordInfos[i].HasPartOfSpeechSection(PartOfSpeechSection.Dependant) &&
      wordInfos[i - 1].PartOfSpeech === PartOfSpeech.Verb
    ) {
      wordInfos[i - 1].Text += wordInfos[i].Text;
      wordInfos.splice(i, 1);
      i--;
    }
  }

  // Possible dependants, might need special rules?
  // Switch this out for a whitelist instead?
  for (let i = 1; i < wordInfos.length; i++) {
    if (
      wordInfos[i].HasPartOfSpeechSection(
        PartOfSpeechSection.PossibleDependant,
      ) &&
      wordInfos[i - 1].PartOfSpeech === PartOfSpeech.Verb &&
      wordInfos[i].DictionaryForm != "ござる" &&
      wordInfos[i].DictionaryForm != "かける" &&
      wordInfos[i].DictionaryForm != "あげる" &&
      wordInfos[i].DictionaryForm != "くれる" &&
      wordInfos[i].DictionaryForm != "終わる" &&
      wordInfos[i].DictionaryForm != "欲しい" &&
      wordInfos[i].DictionaryForm != "始める" &&
      wordInfos[i].DictionaryForm != "下さる" &&
      wordInfos[i].DictionaryForm != "貰う" &&
      wordInfos[i].DictionaryForm != "貰える" &&
      wordInfos[i].DictionaryForm != "まくる" &&
      wordInfos[i].DictionaryForm != "なる" &&
      wordInfos[i].DictionaryForm != "行く" &&
      wordInfos[i].DictionaryForm != "やる" &&
      wordInfos[i].DictionaryForm != "いい" &&
      wordInfos[i].DictionaryForm != "もらえる" &&
      wordInfos[i].DictionaryForm != "来る" &&
      wordInfos[i].DictionaryForm != "出す"
    ) {
      wordInfos[i - 1].Text += wordInfos[i].Text;
      wordInfos.splice(i, 1);
      i--;
    }
  }

  // 注意してください
  for (let i = 0; i < wordInfos.length - 1; i++) {
    if (
      wordInfos[i].HasPartOfSpeechSection(PartOfSpeechSection.PossibleSuru) &&
      wordInfos[i + 1].DictionaryForm === "する" &&
      wordInfos[i + 1].Text != "する" &&
      wordInfos[i + 1].Text != "しない"
    ) {
      wordInfos[i].Text += wordInfos[i + 1].Text;
      wordInfos[i].PartOfSpeech = PartOfSpeech.Verb;
      wordInfos.splice(i + 1, 1);
    }
  }

  // ている
  for (let i = 0; i < wordInfos.length - 2; i++) {
    if (
      wordInfos[i].PartOfSpeech === PartOfSpeech.Verb &&
      wordInfos[i + 1].DictionaryForm === "て" &&
      wordInfos[i + 2].DictionaryForm === "いる"
    ) {
      wordInfos[i].Text += wordInfos[i + 1].Text;
      wordInfos[i].Text += wordInfos[i + 2].Text;
      wordInfos.splice(i + 1, 2);
    }
  }

  return wordInfos;
}

function CombineAdverbialParticle(wordInfos: WordInfo[]) {
  // Dependants
  for (let i = 1; i < wordInfos.length; i++) {
    // i.e だり, たり
    if (
      wordInfos[i].HasPartOfSpeechSection(
        PartOfSpeechSection.AdverbialParticle,
      ) &&
      (wordInfos[i].DictionaryForm === "だり" ||
        wordInfos[i].DictionaryForm === "たり") &&
      wordInfos[i - 1].PartOfSpeech === PartOfSpeech.Verb
    ) {
      wordInfos[i - 1].Text += wordInfos[i].Text;
      wordInfos.splice(i, 1);
      i--;
    }
  }

  return wordInfos;
}

function CombineConjunctiveParticle(wordInfos: WordInfo[]) {
  for (let i = 1; i < wordInfos.length; i++) {
    const { Text } = wordInfos[i];
    if (
      wordInfos[i].HasPartOfSpeechSection(
        PartOfSpeechSection.ConjunctionParticle,
      ) &&
      (Text === "て" ||
        Text === "で" ||
        Text === "ながら" ||
        Text === "ちゃ" ||
        Text === "ば") &&
      wordInfos[i - 1].PartOfSpeech === PartOfSpeech.Verb
    ) {
      wordInfos[i - 1].Text += wordInfos[i].Text;
      wordInfos.splice(i, 1);
      i--;
    }
  }

  return wordInfos;
}

function CombineAuxiliary(wordInfos: WordInfo[]) {
  for (let i = 1; i < wordInfos.length; i++) {
    if (
      wordInfos[i].PartOfSpeech === PartOfSpeech.Auxiliary &&
      (wordInfos[i - 1].PartOfSpeech === PartOfSpeech.Verb ||
        wordInfos[i - 1].PartOfSpeech === PartOfSpeech.IAdjective) &&
      wordInfos[i].Text != "な" &&
      wordInfos[i].Text != "に" &&
      wordInfos[i].DictionaryForm != "です" &&
      wordInfos[i].DictionaryForm != "らしい" &&
      wordInfos[i].Text != "なら" &&
      wordInfos[i].DictionaryForm != "べし" &&
      wordInfos[i].DictionaryForm != "ようだ" &&
      wordInfos[i].Text != "だろう"
    ) {
      wordInfos[i - 1].Text += wordInfos[i].Text;
      wordInfos.splice(i, 1);
      i--;
    }

    if (
      wordInfos[i].PartOfSpeech === PartOfSpeech.Auxiliary &&
      (wordInfos[i - 1].HasPartOfSpeechSection(
        PartOfSpeechSection.PossibleNaAdjective,
      ) ||
        wordInfos[i - 1].PartOfSpeech === PartOfSpeech.NaAdjective) &&
      wordInfos[i].Text === "な"
    ) {
      wordInfos[i - 1].Text += wordInfos[i].Text;
      wordInfos[i - 1].PartOfSpeech = PartOfSpeech.NaAdjective;
      wordInfos.splice(i, 1);
      i--;
    }
  }

  return wordInfos;
}

function CombineAuxiliaryVerbStem(wordInfos: WordInfo[]) {
  for (let i = 1; i < wordInfos.length; i++) {
    if (
      wordInfos[i].HasPartOfSpeechSection(
        PartOfSpeechSection.AuxiliaryVerbStem,
      ) &&
      wordInfos[i].Text != "ように" &&
      wordInfos[i].Text != "よう" &&
      (wordInfos[i - 1].PartOfSpeech === PartOfSpeech.Verb ||
        wordInfos[i - 1].PartOfSpeech === PartOfSpeech.IAdjective)
    ) {
      wordInfos[i - 1].Text += wordInfos[i].Text;
      wordInfos.splice(i, 1);
      i--;
    }
  }

  return wordInfos;
}

function CombineSuffix(wordInfos: WordInfo[]) {
  for (let i = 1; i < wordInfos.length; i++) {
    if (
      (wordInfos[i].PartOfSpeech === PartOfSpeech.Suffix ||
        wordInfos[i].HasPartOfSpeechSection(PartOfSpeechSection.Suffix)) &&
      wordInfos[i].DictionaryForm != "っぽい" &&
      wordInfos[i].DictionaryForm != "にくい" &&
      wordInfos[i].DictionaryForm != "事" &&
      wordInfos[i].DictionaryForm != "っぷり" &&
      wordInfos[i].DictionaryForm != "ごと" &&
      (wordInfos[i].DictionaryForm != "たち" ||
        wordInfos[i - 1].PartOfSpeech === PartOfSpeech.Pronoun)
    ) {
      wordInfos[i - 1].Text += wordInfos[i].Text;
      wordInfos.splice(i, 1);
      i--;
    }
  }

  return wordInfos;
}

function CombineParticles(wordInfos: WordInfo[]) {
  for (let i = 0; i < wordInfos.length - 1; i++) {
    // には
    if (wordInfos[i].Text === "に" && wordInfos[i + 1].Text === "は") {
      wordInfos[i].Text = "には";
      wordInfos.splice(i + 1, 1);
    }

    // とは
    if (wordInfos[i].Text === "と" && wordInfos[i + 1].Text === "は") {
      wordInfos[i].Text = "とは";
      wordInfos.splice(i + 1, 1);
    }

    // では
    if (wordInfos[i].Text === "で" && wordInfos[i + 1].Text === "は") {
      wordInfos[i].Text = "では";
      wordInfos.splice(i + 1, 1);
    }

    // のに
    if (wordInfos[i].Text === "の" && wordInfos[i + 1].Text === "に") {
      wordInfos[i].Text = "のに";
      wordInfos.splice(i + 1, 1);
    }
  }

  return wordInfos;
}

/// <summary>
/// Tries to separate the honorifics from the proper names
/// This still doesn't work for all cases
/// </summary>
/// <param name="wordInfos"></param>
/// <returns></returns>
function SeparateSuffixHonorifics(wordInfos: WordInfo[]) {
  for (let i = 0; i < wordInfos.length; i++) {
    for (const honorific of HonorificsSuffixes) {
      if (
        !wordInfos[i].Text.endsWith(honorific) ||
        wordInfos[i].Text.length <= honorific.length ||
        (!wordInfos[i].HasPartOfSpeechSection(PartOfSpeechSection.PersonName) &&
          !wordInfos[i].HasPartOfSpeechSection(PartOfSpeechSection.ProperNoun))
      )
        continue;

      wordInfos[i].Text = wordInfos[i].Text.slice(
        0,
        wordInfos[i].Text.length - honorific.length,
      );
      if (wordInfos[i].DictionaryForm.endsWith(honorific)) {
        wordInfos[i].DictionaryForm = wordInfos[i].DictionaryForm.slice(
          0,
          wordInfos[i].DictionaryForm.length - honorific.length,
        );
      }

      const suffix = new WordInfo("");
      suffix.Text = honorific;
      suffix.PartOfSpeech = PartOfSpeech.Suffix;
      suffix.DictionaryForm = honorific;
      wordInfos.splice(i + 1, 0, suffix);
      i++;

      break;
    }
  }

  return wordInfos;
}

/// <summary>
/// Cleanup method / 2nd pass for some cases
/// </summary>
/// <param name="wordInfos"></param>
/// <returns></returns>
/// <exception cref="NotImplementedException"></exception>
function CombineFinal(wordInfos: WordInfo[]) {
  for (let i = 1; i < wordInfos.length; i++) {
    if (
      wordInfos[i].Text === "ば" &&
      wordInfos[i - 1].PartOfSpeech === PartOfSpeech.Verb
    ) {
      wordInfos[i - 1].Text += wordInfos[i].Text;
      wordInfos.splice(i, 1);
      i--;
    }
  }

  return wordInfos;
}
