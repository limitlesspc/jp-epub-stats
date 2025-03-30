/// Implemented from https://github.com/Sirush/Jiten/blob/master/Jiten.Parser/WordInfo.cs
/// Original code is licenced under Apache 2.0 https://www.apache.org/licenses/LICENSE-2.0

import {
  PartOfSpeech,
  PartOfSpeechSection,
  toPartOfSpeech,
  toPartOfSpeechSection,
} from "./pos.ts";

export class WordInfo {
  Text = "";
  PartOfSpeech = PartOfSpeech.Unknown;
  PartOfSpeechSection1 = PartOfSpeechSection.None;
  PartOfSpeechSection2 = PartOfSpeechSection.None;
  PartOfSpeechSection3 = PartOfSpeechSection.None;
  DictionaryForm = "";
  Reading = "";
  IsInvalid = false;

  constructor(sudachiLine: string) {
    const parts = sudachiLine.split("\t");
    const [surface, tags, _normalized, dictionaryForm, reading] = parts;
    if (parts.length < 6) {
      this.IsInvalid = true;
      return;
    }

    const partOfSpeechTags = tags.split(",");
    const [
      partOfSpeech,
      partOfSpeechSection1,
      partOfSpeechSection2,
      partOfSpeechSection3,
    ] = partOfSpeechTags;
    if (partOfSpeechTags.length < 4) {
      this.IsInvalid = true;
      return;
    }

    this.Text = surface;
    this.PartOfSpeech = toPartOfSpeech(partOfSpeech);
    this.PartOfSpeechSection1 = toPartOfSpeechSection(partOfSpeechSection1);
    this.PartOfSpeechSection2 = toPartOfSpeechSection(partOfSpeechSection2);
    this.PartOfSpeechSection3 = toPartOfSpeechSection(partOfSpeechSection3);
    this.DictionaryForm = dictionaryForm;
    this.Reading = reading;
  }

  HasPartOfSpeechSection(section: PartOfSpeechSection) {
    return (
      this.PartOfSpeechSection1 === section ||
      this.PartOfSpeechSection2 === section ||
      this.PartOfSpeechSection3 === section
    );
  }
}
