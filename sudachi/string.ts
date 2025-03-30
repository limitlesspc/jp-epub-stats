/// Implemented from https://github.com/Sirush/Jiten/blob/master/Jiten.Core/Utils/StringExtensions.cs
/// Original code is licenced under Apache 2.0 https://www.apache.org/licenses/LICENSE-2.0

const HalfWidthToFullWidth: Record<string, string> = {
  "0": "０",
  "1": "１",
  "2": "２",
  "3": "３",
  "4": "４",
  "5": "５",
  "6": "６",
  "7": "７",
  "8": "８",
  "9": "９",
};

const FullWidthToHalfWidth: Record<string, string> = {
  "０": "0",
  "１": "1",
  "２": "2",
  "３": "3",
  "４": "4",
  "５": "5",
  "６": "6",
  "７": "7",
  "８": "8",
  "９": "9",
};

export function ToFullWidthDigits(input: string) {
  let result = "";
  for (const ch of input) result += HalfWidthToFullWidth[ch] || ch;

  return result;
}

export function ToHalfWidthDigits(input: string) {
  let result = "";
  for (const ch of input) result += FullWidthToHalfWidth[ch] || ch;

  return result;
}
