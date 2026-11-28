export const SPLITMIX64_VERSION = "splitmix64-v1";

const splitMixIncrement = BigInt("0x9e3779b97f4a7c15");
const splitMixFirstMultiplier = BigInt("0xbf58476d1ce4e5b9");
const splitMixSecondMultiplier = BigInt("0x94d049bb133111eb");
const shift30 = BigInt(30);
const shift27 = BigInt(27);
const shift31 = BigInt(31);
const shift11 = BigInt(11);

/** Use the seed's low 64 bits and map the top 53 output bits to [0, 1). */
export function createSplitMix64(seed: bigint): () => number {
  let state = BigInt.asUintN(64, seed);
  return () => {
    state = BigInt.asUintN(64, state + splitMixIncrement);
    let bits = state;
    bits = BigInt.asUintN(
      64,
      (bits ^ (bits >> shift30)) * splitMixFirstMultiplier,
    );
    bits = BigInt.asUintN(
      64,
      (bits ^ (bits >> shift27)) * splitMixSecondMultiplier,
    );
    return Number((bits ^ (bits >> shift31)) >> shift11) / 2 ** 53;
  };
}
