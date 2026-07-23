export type RandomSource = () => number

export function shuffle<T>(values: readonly T[], random: RandomSource = Math.random): T[] {
  const shuffled = [...values]

  for (let currentIndex = shuffled.length - 1; currentIndex > 0; currentIndex -= 1) {
    const randomIndex = Math.floor(random() * (currentIndex + 1))
    const currentValue = shuffled[currentIndex]
    shuffled[currentIndex] = shuffled[randomIndex]
    shuffled[randomIndex] = currentValue
  }

  return shuffled
}
