import sharp from "sharp";

const SOURCE = "public/efootball-hero.jpg";
const SIZES = [192, 512];

async function makeIcon(size, out) {
  await sharp(SOURCE)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png()
    .toFile(out);
  console.log(out);
}

async function main() {
  for (const size of SIZES) {
    await makeIcon(size, `public/icons/icon-${size}.png`);
  }
  await makeIcon(512, "public/icons/maskable-512.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
