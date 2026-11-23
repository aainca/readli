import type { Level, Set1SkillId } from './schema';

/**
 * Short decodable stories, built mostly from the practice lists of one
 * vowel group plus a few heart words. The story screen picks the ones
 * whose words the student has already read. Parents can edit or add.
 */
export interface Story {
  id: string;
  title: string;
  skillId: Set1SkillId;
  /** Rough difficulty: matches the group's level the words come from. */
  level: Level;
  text: string;
}

/** Common words a story may use freely (heart words and very early sight words). */
export const STORY_FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'and', 'to', 'of', 'in', 'on', 'at', 'is', 'was', 'are', 'were', 'be', 'it', 'its', 'he', 'she', 'they', 'i', 'you', 'we', 'me', 'him', 'her', 'his', 'my', 'our', 'your', 'them', 'this', 'that', 'there', 'here', 'then', 'with', 'for', 'had', 'has', 'have', 'said', 'do', 'did', 'not', 'can', 'will', 'up', 'down', 'out', 'into', 'went', 'got', 'get', 'put', 'ran', 'run', 'sat', 'see', 'saw', 'look', 'looked', 'like', 'one', 'two', 'all', 'come', 'came', 'some', 'what', 'who', 'when', 'but', 'so', 'no', 'yes', 'go', 'goes', 'big', 'little', 'very', 'too', 'now', 'oh', 'off', 'as', 'by', 'from', 'or', 'if', 'am', 'us', 'made', 'make', 'day', 'home', 'again', 'away', 'where', 'why', 'how', 'could', 'would', 'should', 'about', 'over', 'under', 'after', 'before', 'good', 'new', 'old', 'play', 'played', 'fun', 'mom', 'dad',
]);

export const STORIES: Story[] = [
  // 1.1 Closed
  { id: 'cat-nap', title: 'Sam the cat', skillId: '1.1', level: 1, text: 'Sam is a cat. Sam sat on a rug in the sun. A bug ran up the rug. Sam hit the bug with a tap. The bug hid in a box. Sam got mad, then Sam had a nap.' },
  { id: 'pond-frog', title: 'The frog in the pond', skillId: '1.1', level: 2, text: 'A frog sat on a log in the pond. A fish swam past. The frog did a big jump and hit the log with a splash. The fish hid in the sand. The frog sat back on the log and did not jump again.' },
  { id: 'rabbit-picnic', title: 'Rabbit and the picnic', skillId: '1.1', level: 3, text: 'A rabbit had a picnic in the sun. In the basket was a muffin, a napkin and a hotdog. An insect sat on the muffin. The rabbit was upset. It put the muffin in its pocket and ran to a cactus to finish the picnic.' },
  // 1.2 Open
  { id: 'go-robot', title: 'The robot and the tiger', skillId: '1.2', level: 3, text: 'A robot and a tiger went to see a pony. "Hi," said the pony. "I am so lazy. Do not be silly." The robot said, "We go to the hotel for a bagel." So the tiger, the robot and the pony had a bagel and a tiny donut.' },
  { id: 'baby-music', title: 'Music for the baby', skillId: '1.2', level: 3, text: 'The baby did not go to sleep. So the tutor got a tulip and began to hum. The music was so cozy that the baby, the lady and even the spider went to sleep. "Silent at last," said the hero.' },
  // 1.3 Silent e
  { id: 'cape-kite', title: 'The kite and the cape', skillId: '1.3', level: 1, text: 'Jake had a kite. The kite was wide and white. Jake put on a cape and ran to the lake. The kite rose up like a plane. "Take a bite of cake," said Jake, "and ride home with me."' },
  { id: 'snake-cake', title: 'Snake bakes a cake', skillId: '1.3', level: 2, text: 'A snake made a cake on a plate. A whale came to the gate. "I like cake," said the whale with a smile. The snake gave the whale a slice. The whale ate it in one bite and drove home on a bike.' },
  { id: 'pancake-mistake', title: 'The pancake mistake', skillId: '1.3', level: 3, text: 'At bedtime Dad made a pancake. He put the pancake inside a bathrobe by mistake. The pancake was a cupcake! Mom had to escape to the campfire to compete in a pancake race. In the sunshine she did not make that mistake again.' },
  // 1.4 Vowel teams
  { id: 'rain-boat', title: 'Rain on the boat', skillId: '1.4', level: 1, text: 'The rain fell on the boat. A goat sat in the boat with a coat and a bee. "Wait," said the goat. "I need to eat." So the goat ate a leaf and a seed, and the bee had a nap in the soap.' },
  { id: 'green-sheep', title: 'The green sheep', skillId: '1.4', level: 2, text: 'A sheep went to sleep in a green field. Three snails and a queen came down the street. "Keep the peach," said the queen. "I will float on the cream." The sheep did not dream. It just ate the wheat and the toast.' },
  { id: 'rainbow-balloon', title: 'The rainbow balloon', skillId: '1.4', level: 3, text: 'On the weekend a raccoon got a balloon. It was a rainbow balloon with a tattoo of a cartoon. The raccoon ate oatmeal and a peanut by the window. At midnight the balloon went up to the moon. The raccoon said, "Maybe I will follow it tomorrow."' },
  // 1.5 R-controlled
  { id: 'car-barn', title: 'The car in the barn', skillId: '1.5', level: 1, text: 'A car is in the barn. A bird sat on the car. The girl got a fork and some corn for the bird. The bird did not turn. It hurt its arm, so the girl put it in a jar of fern. The bird was not hurt for long.' },
  { id: 'shark-storm', title: 'Shark in the storm', skillId: '1.5', level: 2, text: 'A shark was in a storm. The storm was sharp and the shark was smart. It swam north to the porch of a church. A stork with a scarf said, "Do not burst in. Just stir the surf and the storm will turn." The shark did, and the first star came out.' },
  { id: 'garden-turtle', title: 'The garden party', skillId: '1.5', level: 3, text: 'In the garden the farmer had a party. A turtle came with a marker, a carton of butter and a burger. The artist was a hamster with a purple helmet. After dinner, the farmer, the turtle and the hamster sat under the corner tree until morning.' },
  // 1.6 Consonant-le
  { id: 'table-candle', title: 'The candle on the table', skillId: '1.6', level: 3, text: 'A candle sat on the table. A little beetle came to nibble an apple. The beetle fell in a puddle and began to giggle. "Do not wiggle," said the turtle. "Just paddle to the middle." The beetle did, and the purple candle did not even wobble.' },
  { id: 'puzzle-jungle', title: 'The jungle puzzle', skillId: '1.6', level: 4, text: 'In the jungle there was a terrible puzzle. An eagle, a poodle and a bumblebee had to untangle a bundle of cable. It was impossible! Then a simple idea came: the eagle would juggle, the poodle would scribble, and the bumblebee would sprinkle. The puzzle was done by the candlelight.' },
  // 1.7 Diphthongs
  { id: 'cow-boy', title: 'The cow and the boy', skillId: '1.7', level: 1, text: 'A boy found a cow in town. The cow had a coin in its mouth. "Wow," said the boy. "Join me. We can count the coins." The cow said, "Ouch, I am loud and proud." So the boy and the cow sat down on the couch with a toy.' },
  { id: 'clown-cloud', title: 'The clown and the cloud', skillId: '1.7', level: 2, text: 'A clown had a crown made of a cloud. The crowd gave a shout. "Do not frown," said the clown. "I will sprout like a trout and growl at the owl." The owl did not scowl. It just sat on the ground and did not make a sound.' },
  { id: 'cowboy-oyster', title: 'Cowboy and the oyster', skillId: '1.7', level: 3, text: 'A cowboy found an oyster on the playground. "I enjoy a loyal oyster," said the cowboy. The oyster said, "Avoid the tower and the shower. There is poison in the powder." So the cowboy went downtown with the oyster and a thousand coins in a flowerpot.' },
];
