function getSeeding(numPlayers) {
  let rounds = Math.log(numPlayers) / Math.log(2);
  let matches = [1, 2];
  for (let r = 1; r < rounds; r++) {
    let newMatches = [];
    let sum = Math.pow(2, r + 1) + 1;
    for (let i = 0; i < matches.length; i++) {
      let seed = matches[i];
      if (i % 2 === 0) {
        newMatches.push(seed, sum - seed);
      } else {
        newMatches.push(sum - seed, seed);
      }
    }
    matches = newMatches;
  }
  return matches;
}

const size = 8;
const order = getSeeding(size);
console.log("Order:", order);

// If players are [P0, P1, P2, P3, P4, P5, null, null] (already sorted by some seed or random)
const players = ["P1", "P2", "P3", "P4", "P5", "P6", null, null];
// But wait, the standard bracket order is 1-based index
for (let i = 0; i < order.length; i += 2) {
  let idx1 = order[i] - 1;
  let idx2 = order[i+1] - 1;
  console.log(`Match ${i/2 + 1}: ${players[idx1]} vs ${players[idx2]}`);
}
