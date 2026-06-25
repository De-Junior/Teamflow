// PASTE LOCATION: project root (same folder as package.json) — save as make_logo_transparent.mjs, run once, then delete
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "public", "teamflow_logo.png");
const OUT = path.join(__dirname, "public", "teamflow_logo_transparent.png");

const WHITE_THRESHOLD = 240;

async function main() {
  const { data, info } = await sharp(SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
      data[i + 3] = 0;
    }
  }

  await sharp(data, { raw: { width, height, channels } }).png().toFile(OUT);
  console.log(`Done. White background removed from ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});