import type { Level, Set1SkillId } from './schema';

/**
 * Short decodable stories, built mostly from the practice lists of one
 * vowel group plus a few heart words. The story screen picks the ones
 * whose words the student has already read. Parents can edit or add.
 */
export interface StoryQuestion {
  /** Shown and spoken. */
  q: string;
  /** Short answers the child can read; one is right. */
  options: string[];
  answer: number;
}

export interface Story {
  id: string;
  title: string;
  skillId: Set1SkillId;
  /** Rough difficulty: matches the group's level the words come from. */
  level: Level;
  text: string;
  /** Comprehension questions asked after the story. */
  questions: StoryQuestion[];
}

/** Common words a story may use freely (heart words and very early sight words). */
export const STORY_FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'and', 'to', 'of', 'in', 'on', 'at', 'is', 'was', 'are', 'were', 'be', 'it', 'its', 'he', 'she', 'they', 'i', 'you', 'we', 'me', 'him', 'her', 'his', 'my', 'our', 'your', 'them', 'this', 'that', 'there', 'here', 'then', 'with', 'for', 'had', 'has', 'have', 'said', 'do', 'did', 'not', 'can', 'will', 'up', 'down', 'out', 'into', 'went', 'got', 'get', 'put', 'ran', 'run', 'sat', 'see', 'saw', 'look', 'looked', 'like', 'one', 'two', 'all', 'come', 'came', 'some', 'what', 'who', 'when', 'but', 'so', 'no', 'yes', 'go', 'goes', 'big', 'little', 'very', 'too', 'now', 'oh', 'off', 'as', 'by', 'from', 'or', 'if', 'am', 'us', 'made', 'make', 'day', 'home', 'again', 'away', 'where', 'why', 'how', 'could', 'would', 'should', 'about', 'over', 'under', 'after', 'before', 'good', 'new', 'old', 'play', 'played', 'fun', 'mom', 'dad',
]);

export const STORIES: Story[] = [
  // 1.1 Closed
  { id: 'cat-nap', title: 'Sam the cat', skillId: '1.1', level: 1, text: 'Sam is a cat. Sam sat on a rug in the sun. A bug ran up the rug. Sam hit the bug with a tap. The bug hid in a box. Sam got mad, then Sam had a nap.',
    questions: [
      { q: "Who is Sam?", options: ["a cat", "a bug", "a dog"], answer: 0 },
      { q: "Where did Sam sit?", options: ["in a box", "on a bed", "on a rug"], answer: 2 },
      { q: "Where did the bug hide?", options: ["on the rug", "in a box", "in the sun"], answer: 1 },
    ] },
  { id: 'pond-frog', title: 'The frog in the pond', skillId: '1.1', level: 2, text: 'A frog sat on a log in the pond. A fish swam past. The frog did a big jump and hit the log with a splash. The fish hid in the sand. The frog sat back on the log and did not jump again.',
    questions: [
      { q: "Where did the frog sit?", options: ["on a log", "in the sand", "on a rock"], answer: 0 },
      { q: "What did the fish do?", options: ["did a jump", "ate the frog", "hid in the sand"], answer: 2 },
      { q: "Did the frog jump again?", options: ["the fish did", "no", "yes"], answer: 1 },
    ] },
  { id: 'rabbit-picnic', title: 'Rabbit and the picnic', skillId: '1.1', level: 3, text: 'A rabbit had a picnic in the sun. In the basket was a muffin, a napkin and a hotdog. An insect sat on the muffin. The rabbit was upset. It put the muffin in its pocket and ran to a cactus to finish the picnic.',
    questions: [
      { q: "What was in the basket?", options: ["a muffin", "a carrot", "a hat"], answer: 0 },
      { q: "What sat on the muffin?", options: ["a rabbit", "a cactus", "an insect"], answer: 2 },
      { q: "Where did the rabbit run?", options: ["to a hotdog", "to a cactus", "to a pond"], answer: 1 },
    ] },
  // 1.2 Open
  { id: 'go-robot', title: 'The robot and the tiger', skillId: '1.2', level: 3, text: 'A robot and a tiger went to see a pony. "Hi," said the pony. "I am so lazy. Do not be silly." The robot said, "We go to the hotel for a bagel." So the tiger, the robot and the pony had a bagel and a tiny donut.',
    questions: [
      { q: "Who went to see the pony?", options: ["a robot and a tiger", "a baby and a lady", "a hero and a spider"], answer: 0 },
      { q: "What did they eat?", options: ["a pizza", "a tulip", "a bagel"], answer: 2 },
      { q: "Where did the robot want to go?", options: ["to bed", "to the hotel", "to the zoo"], answer: 1 },
    ] },
  { id: 'baby-music', title: 'Music for the baby', skillId: '1.2', level: 3, text: 'The baby did not go to sleep. So the tutor got a tulip and began to hum. The music was so cozy that the baby, the lady and even the spider went to sleep. "Silent at last," said the hero.',
    questions: [
      { q: "Who would not go to sleep?", options: ["the baby", "the tutor", "the spider"], answer: 0 },
      { q: "What did the tutor do?", options: ["ran away", "got a donut", "began to hum"], answer: 2 },
      { q: "Who said \"Silent at last\"?", options: ["the lady", "the hero", "the baby"], answer: 1 },
    ] },
  // 1.3 Silent e
  { id: 'cape-kite', title: 'The kite and the cape', skillId: '1.3', level: 1, text: 'Jake had a kite. The kite was wide and white. Jake put on a cape and ran to the lake. The kite rose up like a plane. "Take a bite of cake," said Jake, "and ride home with me."',
    questions: [
      { q: "What did Jake have?", options: ["a kite", "a cake", "a bike"], answer: 0 },
      { q: "Where did Jake run?", options: ["to the gate", "home", "to the lake"], answer: 2 },
      { q: "The kite rose up like a what?", options: ["a whale", "a plane", "a cape"], answer: 1 },
    ] },
  { id: 'snake-cake', title: 'Snake bakes a cake', skillId: '1.3', level: 2, text: 'A snake made a cake on a plate. A whale came to the gate. "I like cake," said the whale with a smile. The snake gave the whale a slice. The whale ate it in one bite and drove home on a bike.',
    questions: [
      { q: "Who made the cake?", options: ["a snake", "a whale", "a bike"], answer: 0 },
      { q: "Who came to the gate?", options: ["a snake", "a plate", "a whale"], answer: 2 },
      { q: "How did the whale go home?", options: ["on a plane", "on a bike", "in a boat"], answer: 1 },
    ] },
  { id: 'pancake-mistake', title: 'The pancake mistake', skillId: '1.3', level: 3, text: 'At bedtime Dad made a pancake. He put the pancake inside a bathrobe by mistake. The pancake was a cupcake! Mom had to escape to the campfire to compete in a pancake race. In the sunshine she did not make that mistake again.',
    questions: [
      { q: "Who made the pancake?", options: ["Dad", "Mom", "the cupcake"], answer: 0 },
      { q: "Where did Dad put the pancake?", options: ["on a plate", "in the campfire", "inside a bathrobe"], answer: 2 },
      { q: "What did Mom compete in?", options: ["a cake sale", "a pancake race", "a bike race"], answer: 1 },
    ] },
  // 1.4 Vowel teams
  { id: 'rain-boat', title: 'Rain on the boat', skillId: '1.4', level: 1, text: 'The rain fell on the boat. A goat sat in the boat with a coat and a bee. "Wait," said the goat. "I need to eat." So the goat ate a leaf and a seed, and the bee had a nap in the soap.',
    questions: [
      { q: "What fell on the boat?", options: ["rain", "snow", "a goat"], answer: 0 },
      { q: "Who sat in the boat?", options: ["a cat and a dog", "a toad and a seal", "a goat and a bee"], answer: 2 },
      { q: "What did the goat eat?", options: ["soap", "a leaf and a seed", "a coat"], answer: 1 },
    ] },
  { id: 'green-sheep', title: 'The green sheep', skillId: '1.4', level: 2, text: 'A sheep went to sleep in a green field. Three snails and a queen came down the street. "Keep the peach," said the queen. "I will float on the cream." The sheep did not dream. It just ate the wheat and the toast.',
    questions: [
      { q: "Where did the sheep sleep?", options: ["in a green field", "on the street", "in the cream"], answer: 0 },
      { q: "Who came down the street?", options: ["a sheep", "a peach", "three snails and a queen"], answer: 2 },
      { q: "What did the sheep eat?", options: ["cream", "wheat and toast", "a peach"], answer: 1 },
    ] },
  { id: 'rainbow-balloon', title: 'The rainbow balloon', skillId: '1.4', level: 3, text: 'On the weekend a raccoon got a balloon. It was a rainbow balloon with a tattoo of a cartoon. The raccoon ate oatmeal and a peanut by the window. At midnight the balloon went up to the moon. The raccoon said, "Maybe I will follow it tomorrow."',
    questions: [
      { q: "What did the raccoon get?", options: ["a balloon", "a cartoon", "a peanut"], answer: 0 },
      { q: "What did the raccoon eat?", options: ["a balloon", "the moon", "oatmeal and a peanut"], answer: 2 },
      { q: "Where did the balloon go?", options: ["in the bedroom", "up to the moon", "out the window"], answer: 1 },
    ] },
  // 1.5 R-controlled
  { id: 'car-barn', title: 'The car in the barn', skillId: '1.5', level: 1, text: 'A car is in the barn. A bird sat on the car. The girl got a fork and some corn for the bird. The bird did not turn. It hurt its arm, so the girl put it in a jar of fern. The bird was not hurt for long.',
    questions: [
      { q: "Where is the car?", options: ["in the barn", "on the farm", "in a jar"], answer: 0 },
      { q: "What sat on the car?", options: ["a girl", "a fork", "a bird"], answer: 2 },
      { q: "What did the girl get for the bird?", options: ["a car", "a fork and some corn", "a jar"], answer: 1 },
    ] },
  { id: 'shark-storm', title: 'Shark in the storm', skillId: '1.5', level: 2, text: 'A shark was in a storm. The storm was sharp and the shark was smart. It swam north to the porch of a church. A stork with a scarf said, "Do not burst in. Just stir the surf and the storm will turn." The shark did, and the first star came out.',
    questions: [
      { q: "Where did the shark swim?", options: ["north", "south", "home"], answer: 0 },
      { q: "Who had a scarf?", options: ["the shark", "the church", "a stork"], answer: 2 },
      { q: "What came out at the end?", options: ["the surf", "the first star", "the storm"], answer: 1 },
    ] },
  { id: 'garden-turtle', title: 'The garden party', skillId: '1.5', level: 3, text: 'In the garden the farmer had a party. A turtle came with a marker, a carton of butter and a burger. The artist was a hamster with a purple helmet. After dinner, the farmer, the turtle and the hamster sat under the corner tree until morning.',
    questions: [
      { q: "Where was the party?", options: ["in the garden", "in the barn", "at the market"], answer: 0 },
      { q: "What did the turtle bring?", options: ["a helmet", "a carton of milk", "a marker, butter and a burger"], answer: 2 },
      { q: "Who wore a purple helmet?", options: ["the turtle", "the hamster", "the farmer"], answer: 1 },
    ] },
  // 1.6 Consonant-le
  { id: 'table-candle', title: 'The candle on the table', skillId: '1.6', level: 3, text: 'A candle sat on the table. A little beetle came to nibble an apple. The beetle fell in a puddle and began to giggle. "Do not wiggle," said the turtle. "Just paddle to the middle." The beetle did, and the purple candle did not even wobble.',
    questions: [
      { q: "What sat on the table?", options: ["a candle", "a beetle", "an apple"], answer: 0 },
      { q: "Where did the beetle fall?", options: ["on the table", "in the middle", "in a puddle"], answer: 2 },
      { q: "Who said \"Do not wiggle\"?", options: ["the candle", "the turtle", "the beetle"], answer: 1 },
    ] },
  { id: 'puzzle-jungle', title: 'The jungle puzzle', skillId: '1.6', level: 4, text: 'In the jungle there was a terrible puzzle. An eagle, a poodle and a bumblebee had to untangle a bundle of cable. It was impossible! Then a simple idea came: the eagle would juggle, the poodle would scribble, and the bumblebee would sprinkle. The puzzle was done by the candlelight.',
    questions: [
      { q: "Where was the puzzle?", options: ["in the jungle", "in a bundle", "on a table"], answer: 0 },
      { q: "What did the eagle do?", options: ["scribble", "sprinkle", "juggle"], answer: 2 },
      { q: "When was the puzzle done?", options: ["never", "by candlelight", "at noon"], answer: 1 },
    ] },
  // 1.7 Diphthongs
  { id: 'cow-boy', title: 'The cow and the boy', skillId: '1.7', level: 1, text: 'A boy found a cow in town. The cow had a coin in its mouth. "Wow," said the boy. "Join me. We can count the coins." The cow said, "Ouch, I am loud and proud." So the boy and the cow sat down on the couch with a toy.',
    questions: [
      { q: "What did the boy find?", options: ["a cow", "a coin", "a toy"], answer: 0 },
      { q: "What was in the cow's mouth?", options: ["a toy", "a couch", "a coin"], answer: 2 },
      { q: "Where did they sit?", options: ["on the ground", "on the couch", "in town"], answer: 1 },
    ] },
  { id: 'clown-cloud', title: 'The clown and the cloud', skillId: '1.7', level: 2, text: 'A clown had a crown made of a cloud. The crowd gave a shout. "Do not frown," said the clown. "I will sprout like a trout and growl at the owl." The owl did not scowl. It just sat on the ground and did not make a sound.',
    questions: [
      { q: "What was the crown made of?", options: ["a cloud", "a crowd", "a trout"], answer: 0 },
      { q: "Who gave a shout?", options: ["the clown", "the owl", "the crowd"], answer: 2 },
      { q: "What did the owl do?", options: ["frowned", "sat on the ground", "growled"], answer: 1 },
    ] },
  { id: 'cowboy-oyster', title: 'Cowboy and the oyster', skillId: '1.7', level: 3, text: 'A cowboy found an oyster on the playground. "I enjoy a loyal oyster," said the cowboy. The oyster said, "Avoid the tower and the shower. There is poison in the powder." So the cowboy went downtown with the oyster and a thousand coins in a flowerpot.',
    questions: [
      { q: "Where did the cowboy find the oyster?", options: ["on the playground", "in a tower", "in the shower"], answer: 0 },
      { q: "What was in the powder?", options: ["coins", "a flower", "poison"], answer: 2 },
      { q: "How many coins did the cowboy have?", options: ["none", "a thousand", "ten"], answer: 1 },
    ] },
];
