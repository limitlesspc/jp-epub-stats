import loadEpub from "./load-epub.ts";

for (const filePath of Deno.args) {
  const data = await loadEpub(filePath);
  console.log(`${filePath}\t${data.characters}`);
}
