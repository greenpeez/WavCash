import fs from "fs";
import path from "path";

/**
 * Copies the compiled RoyaltySplitter ABI and bytecode to the Next.js app
 * so the backend can import them for deployment via viem.
 */
async function main() {
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/RoyaltySplitter.sol/RoyaltySplitter.json"
  );

  if (!fs.existsSync(artifactPath)) {
    console.error("Artifact not found. Run `npx hardhat compile` first.");
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

  const output = {
    abi: artifact.abi,
    bytecode: artifact.bytecode,
  };

  const outputDir = path.join(
    __dirname,
    "../../wavcash-app/src/lib/contracts"
  );
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "RoyaltySplitter.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`Exported ABI + bytecode to ${outputPath}`);
  console.log(`  ABI functions: ${artifact.abi.length}`);
  console.log(`  Bytecode size: ${artifact.bytecode.length} chars`);
}

main().catch(console.error);
