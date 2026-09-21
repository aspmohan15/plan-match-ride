/**
 * Calculates a compatibility score between two trip objects based on predefined weights.
 *
 * Weights:
 * - Destination: 30%
 * - Date: 25%
 * - Start proximity: 15%
 * - Route overlap: 15%
 * - Time: 10%
 * - Style: 5%
 *
 * @param {Object} tripA
 * @param {Object} tripB
 * @returns {number} Score from 0 to 100
 */
export function calculateMatchScore(tripA, tripB) {
  let score = 0;

  if (tripA.destination === tripB.destination) score += 30;
  if (tripA.date === tripB.date) score += 25;
  if (tripA.startLocation === tripB.startLocation) score += 15;
  if (tripA.route === tripB.route) score += 15;
  if (tripA.time === tripB.time) score += 10;
  if (tripA.style === tripB.style) score += 5;

  return score;
}
