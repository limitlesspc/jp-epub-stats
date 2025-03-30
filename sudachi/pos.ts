/// Implemented from https://github.com/Sirush/Jiten/blob/master/Jiten.Core/Data/PartOfSpeech.cs
/// Original code is licenced under Apache 2.0 https://www.apache.org/licenses/LICENSE-2.0

export enum PartOfSpeech {
  Unknown,
  Noun,
  Verb,
  IAdjective,
  Adverb,
  Particle,
  Conjunction,
  Auxiliary,
  Adnominal,
  Interjection,
  Symbol,
  Prefix,
  Filler,
  Name,
  Pronoun,
  NaAdjective,
  Suffix,
  CommonNoun,
  SupplementarySymbol,
  BlankSpace,
  Expression,
  NominalAdjective,
  Numeral,
}

export enum PartOfSpeechSection {
  None,
  Amount,
  Alphabet,
  FullStop,
  BlankSpace,
  Suffix,
  Pronoun,
  Independant,
  Dependant,
  Filler,
  Common,
  SentenceEndingParticle,
  Counter,
  ParallelMarker,
  BindingParticle,
  PotentialAdverb,
  CaseMarkingParticle,
  IrregularConjunction,
  ConjunctionParticle,
  AuxiliaryVerbStem,
  AdjectivalStem,
  CompoundWord,
  Quotation,
  NounConjunction,
  AdverbialParticle,
  ConjunctiveParticleClass,
  Adverbialization,
  AdverbialParticleOrParallelMarkerOrSentenceEndingParticle,
  AdnominalAdjective,
  ProperNoun,
  Special,
  VerbConjunction,
  PersonName,
  FamilyName,
  Organization,
  NotAdjectiveStem,
  Comma,
  OpeningBracket,
  ClosingBracket,
  Region,
  Country,
  Numeral,
  PossibleDependant,
  CommonNoun,
  SubstantiveAdjective,
  PossibleCounterWord,
  PossibleSuru,
  Juntaijoushi,
  PossibleNaAdjective,
  VerbLike,
  PossibleVerbSuruNoun,
  Adjectival,
  NaAdjectiveLike,
  Name,
  Letter,
  PlaceName,
  TaruAdjective,
}

export function toPartOfSpeech(pos: string): PartOfSpeech {
  if (pos === "名詞" || pos === "n") return PartOfSpeech.Noun;
  if (pos === "動詞") return PartOfSpeech.Verb;
  if (pos.startsWith("v")) return PartOfSpeech.Verb;
  if (pos === "形容詞" || pos === "adj-i") return PartOfSpeech.IAdjective;
  if (pos === "形状詞" || pos === "adj-na") return PartOfSpeech.NaAdjective;
  if (pos === "副詞" || pos === "adv") return PartOfSpeech.Adverb;
  if (pos === "助詞" || pos === "prt") return PartOfSpeech.Particle;
  if (pos === "接続詞" || pos === "conj") return PartOfSpeech.Conjunction;
  if (pos === "助動詞" || pos === "aux" || pos === "aux-v")
    return PartOfSpeech.Auxiliary;
  if (pos === "連体詞") return PartOfSpeech.Adnominal;
  if (pos === "感動詞" || pos === "int") return PartOfSpeech.Interjection;
  if (pos === "記号") return PartOfSpeech.Symbol;
  if (pos === "接頭詞" || pos === "接頭辞" || pos === "pref")
    return PartOfSpeech.Prefix;
  if (pos === "フィラー") return PartOfSpeech.Filler;
  if (
    pos === "名" ||
    pos === "company" ||
    pos === "given" ||
    pos === "place" ||
    pos === "person" ||
    pos === "product" ||
    pos === "ship" ||
    pos === "surname"
  )
    return PartOfSpeech.Name;
  if (pos === "代名詞" || pos === "pn") return PartOfSpeech.Pronoun;
  if (pos === "接尾辞" || pos === "suf") return PartOfSpeech.Suffix;
  if (pos === "普通名詞") return PartOfSpeech.CommonNoun;
  if (pos === "補助記号") return PartOfSpeech.SupplementarySymbol;
  if (pos === "空白") return PartOfSpeech.BlankSpace;
  if (pos === "表現" || pos === "exp") return PartOfSpeech.Expression;
  if (
    pos === "形動" ||
    pos === "adj-no" ||
    pos === "adj-t" ||
    pos === "adj-f" ||
    pos === "adj-pn"
  )
    return PartOfSpeech.NominalAdjective;
  if (pos === "数詞" || pos === "num") return PartOfSpeech.Numeral;
  return PartOfSpeech.Unknown;
}

export function toPartOfSpeechSection(pos: string): PartOfSpeechSection {
  if (pos === "*") return PartOfSpeechSection.None;
  if (pos === "数") return PartOfSpeechSection.Amount;
  if (pos === "アルファベット") return PartOfSpeechSection.Alphabet;
  if (pos === "句点") return PartOfSpeechSection.FullStop;
  if (pos === "空白") return PartOfSpeechSection.BlankSpace;
  if (pos === "接尾") return PartOfSpeechSection.Suffix;
  if (pos === "代名詞") return PartOfSpeechSection.Pronoun;
  if (pos === "自立") return PartOfSpeechSection.Independant;
  if (pos === "フィラー") return PartOfSpeechSection.Filler;
  if (pos === "一般") return PartOfSpeechSection.Common;
  if (pos === "非自立") return PartOfSpeechSection.Dependant;
  if (pos === "終助詞") return PartOfSpeechSection.SentenceEndingParticle;
  if (pos === "助数詞") return PartOfSpeechSection.Counter;
  if (pos === "並立助詞") return PartOfSpeechSection.ParallelMarker;
  if (pos === "係助詞") return PartOfSpeechSection.BindingParticle;
  if (pos === "副詞可能") return PartOfSpeechSection.PotentialAdverb;
  if (pos === "格助詞") return PartOfSpeechSection.CaseMarkingParticle;
  if (pos === "サ変接続") return PartOfSpeechSection.IrregularConjunction;
  if (pos === "接続助詞") return PartOfSpeechSection.ConjunctionParticle;
  if (pos === "助動詞語幹") return PartOfSpeechSection.AuxiliaryVerbStem;
  if (pos === "形容動詞語幹") return PartOfSpeechSection.AdjectivalStem;
  if (pos === "連語") return PartOfSpeechSection.CompoundWord;
  if (pos === "引用") return PartOfSpeechSection.Quotation;
  if (pos === "名詞接続") return PartOfSpeechSection.NounConjunction;
  if (pos === "副助詞") return PartOfSpeechSection.AdverbialParticle;
  if (pos === "助詞類接続") return PartOfSpeechSection.ConjunctiveParticleClass;
  if (pos === "副詞化") return PartOfSpeechSection.Adverbialization;
  if (pos === "副助詞／並立助詞／終助詞")
    return PartOfSpeechSection.AdverbialParticleOrParallelMarkerOrSentenceEndingParticle;
  if (pos === "連体化") return PartOfSpeechSection.AdnominalAdjective;
  if (pos === "固有名詞") return PartOfSpeechSection.ProperNoun;
  if (pos === "特殊") return PartOfSpeechSection.Special;
  if (pos === "動詞接続") return PartOfSpeechSection.VerbConjunction;
  if (pos === "人名") return PartOfSpeechSection.PersonName;
  if (pos === "姓") return PartOfSpeechSection.FamilyName;
  if (pos === "組織") return PartOfSpeechSection.Organization;
  if (pos === "ナイ形容詞語幹") return PartOfSpeechSection.NotAdjectiveStem;
  if (pos === "読点") return PartOfSpeechSection.Comma;
  if (pos === "括弧開") return PartOfSpeechSection.OpeningBracket;
  if (pos === "括弧閉") return PartOfSpeechSection.ClosingBracket;
  if (pos === "地域") return PartOfSpeechSection.Region;
  if (pos === "国") return PartOfSpeechSection.Country;
  if (pos === "数詞") return PartOfSpeechSection.Numeral;
  if (pos === "非自立可能") return PartOfSpeechSection.PossibleDependant;
  if (pos === "普通名詞") return PartOfSpeechSection.CommonNoun;
  if (pos === "名詞的") return PartOfSpeechSection.SubstantiveAdjective;
  if (pos === "助数詞可能") return PartOfSpeechSection.PossibleCounterWord;
  if (pos === "サ変可能") return PartOfSpeechSection.PossibleSuru;
  if (pos === "準体助詞") return PartOfSpeechSection.Juntaijoushi;
  if (pos === "形状詞可能") return PartOfSpeechSection.PossibleNaAdjective;
  if (pos === "動詞的") return PartOfSpeechSection.VerbLike;
  if (pos === "サ変形状詞可能") return PartOfSpeechSection.PossibleVerbSuruNoun;
  if (pos === "形容詞的") return PartOfSpeechSection.Adjectival;
  if (pos === "名") return PartOfSpeechSection.Name;
  if (pos === "文字") return PartOfSpeechSection.Letter;
  if (pos === "形状詞的") return PartOfSpeechSection.NaAdjectiveLike;
  if (pos === "地名") return PartOfSpeechSection.PlaceName;
  if (pos === "タリ") return PartOfSpeechSection.TaruAdjective;
  return PartOfSpeechSection.None;
}
