import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SOURCE = "public/efootball-hero.jpg";
const OUT = "mobile/icons";

const DENSITIES = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

async function main() {
  for (const [dir, size] of Object.entries(DENSITIES)) {
    for (const name of ["ic_launcher", "ic_launcher_round"]) {
      const out = `${OUT}/${dir}/${name}.png`;
      mkdirSync(`${OUT}/${dir}`, { recursive: true });
      await sharp(SOURCE).resize(size, size, { fit: "cover", position: "centre" }).png().toFile(out);
      console.log(out);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
