// PASTE LOCATION: project root (same folder as package.json) — save as crop_logo.mjs, run once, then delete
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC = path.join(__dirname, "public", "teamflow_logo.png");
const OUT = path.join(__dirname, "public", "teamflow_icon.png");

async function main() {
  const image = sharp(SRC);
  const meta = await image.metadata();

  if (!meta.width || !meta.height) {
    throw new Error("Could not read image dimensions.");
  }

  const trimmed = await sharp(SRC).trim().toBuffer({ resolveWithObject: true });
  const { width: tw, height: th } = trimmed.info;

  let finalBuffer = trimmed.data;
  let finalWidth = tw;
  let finalHeight = th;

  if (tw > th * 1.3) {
    const left = Math.floor((tw - th) / 2);
    const square = await sharp(trimmed.data)
      .extract({ left, top: 0, width: th, height: th })
      .toBuffer({ resolveWithObject: true });
    finalBuffer = square.data;
    finalWidth = square.info.width;
    finalHeight = square.info.height;
  }

  await sharp(finalBuffer).png().toFile(OUT);
  console.log(`Saved ${OUT} at size ${finalWidth}x${finalHeight}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});