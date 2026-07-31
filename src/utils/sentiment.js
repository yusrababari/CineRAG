export const LEX = {
  "love":4,"loved":4,"loving":4,"amazing":4,"awesome":4,"fantastic":4,"excellent":4,"brilliant":4,
  "great":3,"good":2,"nice":2,"happy":3,"glad":2,"joy":3,"joyful":3,"delighted":4,"thrilled":4,
  "excited":3,"excitement":3,"wonderful":4,"perfect":4,"best":3,"better":2,"beautiful":3,"gorgeous":3,
  "fun":2,"funny":2,"hilarious":3,"win":2,"winning":2,"won":2,"success":3,"successful":3,"proud":3,
  "grateful":3,"thankful":3,"thanks":2,"appreciate":2,"appreciated":2,"blessed":3,"lucky":2,"impressed":3,
  "impressive":3,"recommend":2,"recommended":2,"solid":2,"smooth":2,"clean":1,"comfortable":2,"cozy":2,
  "relaxed":2,"calm":1,"peaceful":2,"hope":1,"hopeful":2,"optimistic":2,"inspired":3,"inspiring":3,
  "motivated":2,"cute":2,"adorable":3,"sweet":2,"kind":2,"generous":2,"helpful":2,"supportive":2,
  "brave":2,"strong":2,"powerful":2,"epic":3,"legendary":3,"masterpiece":4,"iconic":3,"underrated":2,
  "worth":1,"deserve":1,"deserved":1,"congrats":3,"congratulations":3,"yay":3,"woo":2,"lol":1,"lmao":1,
  "haha":1,"cool":1,"chill":1,"vibe":1,"vibes":1,"stoked":3,"pumped":3,"yes":1,"finally":1,"relief":2,
  "relieved":2,"safe":1,"healed":2,"healing":2,"progress":2,"improved":2,"improvement":2,"upgrade":1,
  "hate":-4,"hated":-4,"hating":-4,"awful":-4,"terrible":-4,"horrible":-4,"disgusting":-4,"worst":-4,
  "bad":-2,"sad":-3,"sadness":-3,"cry":-2,"crying":-2,"cried":-2,"depressed":-4,"depressing":-3,
  "angry":-3,"anger":-3,"mad":-2,"furious":-4,"annoyed":-2,"annoying":-2,"irritated":-2,"frustrated":-3,
  "frustrating":-3,"disappointed":-3,"disappointing":-3,"disappointment":-3,"upset":-2,"hurt":-2,"pain":-2,
  "painful":-3,"broken":-2,"break":-1,"broke":-1,"ruined":-3,"disaster":-3,"mess":-2,"chaos":-2,
  "fail":-3,"failed":-3,"failure":-3,"lost":-2,"losing":-2,"lose":-2,"scared":-2,"scary":-2,"fear":-2,
  "afraid":-2,"anxious":-2,"anxiety":-2,"stressed":-3,"stress":-2,"stressful":-3,"tired":-1,"exhausted":-3,
  "sick":-2,"ill":-2,"hurts":-2,"disgusted":-3,"disgust":-3,"gross":-2,"nasty":-2,
  "ugly":-2,"boring":-2,"bored":-2,"dull":-2,"lame":-2,"cringe":-2,"embarrassing":-2,"embarrassed":-2,
  "shame":-2,"ashamed":-2,"regret":-2,"regretted":-2,"sorry":-1,"apologize":-1,"unacceptable":-3,
  "outrageous":-3,"ridiculous":-2,"pathetic":-3,"useless":-3,"worthless":-3,"waste":-2,"wasted":-2,
  "toxic":-3,"cruel":-3,"rude":-2,"selfish":-2,"lazy":-2,"stupid":-3,"dumb":-2,"idiot":-3,"idiotic":-3,
  "liar":-3,"lying":-2,"lie":-2,"fraud":-3,"scam":-3,"betrayed":-3,"betrayal":-3,"unfair":-2,"injustice":-3,
  "corrupt":-3,"corruption":-3,"crisis":-2,"emergency":-2,"danger":-2,"dangerous":-2,"threat":-2,"attack":-2,
  "violence":-3,"violent":-3,"war":-2,"kill":-3,"killed":-3,"death":-2,"dead":-2,"dying":-2,
  "grief":-3,"grieving":-3,"lonely":-2,"loneliness":-2,"alone":-1,"miss":-1,"missing":-1,"struggle":-2,
  "struggling":-2,"suffer":-3,"suffering":-3,"nightmare":-3,"traumatic":-3,"trauma":-3,"panic":-3,
  "devastated":-4,"devastating":-4,"heartbroken":-4,"grim":-2,"bleak":-2,"awkward":-1,"weird":-1,
  "meh":-1,"whatever":-1,"ugh":-2,"ugh.":-2,"smh":-1,"wtf":-2,"garbage":-3,"trash":-3,"junk":-2
};

export const BOOSTERS = {
  "very":1.5, "really":1.5, "extremely":1.8, "so":1.4, "super":1.6,
  "absolutely":1.8, "incredibly":1.7, "totally":1.4, "completely":1.5,
  "utterly":1.7, "deeply":1.5, "truly":1.4
};

export const NEGATORS = new Set([
  "not", "no", "never", "n't", "cant", "can't", "cannot", "dont", "don't",
  "doesnt", "doesn't", "didnt", "didn't", "wont", "won't", "isnt", "isn't",
  "wasnt", "wasn't", "aint", "ain't", "nobody", "nothing", "neither", "without",
  "hardly", "barely"
]);

export const EMOJI = {
  "😀":3, "😃":3, "😄":3, "😁":3, "😆":2, "😂":2, "🤣":2, "😊":3, "🙂":1,
  "😍":4, "🥰":4, "❤️":3, "💕":3, "👍":2, "🎉":3, "🔥":2, "✨":2, "😢":-3,
  "😭":-3, "😞":-3, "😔":-2, "😡":-4, "🤬":-4, "😠":-3, "👎":-2, "💔":-3,
  "😩":-2, "😫":-2, "😰":-2, "😨":-2, "🙄":-1, "😒":-2
};

export function tokenize(text) {
  return text.match(/[\w'’-]+|[^\s\w]/g) || [];
}

export function scoreTweet(text) {
  const tokens = tokenize(text.toLowerCase());
  let score = 0;
  const hits = [];
  let boost = 1;
  let negate = false;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (BOOSTERS[t]) {
      boost = BOOSTERS[t];
      continue;
    }
    if (NEGATORS.has(t)) {
      negate = true;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(LEX, t)) {
      let v = LEX[t] * boost;
      if (negate) v = -v * 0.85;
      score += v;
      hits.push({ word: t, positive: v > 0 });
      boost = 1;
      negate = false;
      continue;
    }
    if (i > 2) {
      boost = 1;
    }
  }

  for (const ch of Array.from(text)) {
    if (EMOJI[ch] !== undefined) {
      score += EMOJI[ch];
      hits.push({ word: ch, positive: EMOJI[ch] > 0 });
    }
  }

  return { score, hits };
}

export function classify(score) {
  if (score >= 1.5) return 'pos';
  if (score <= -1.5) return 'neg';
  return 'neu';
}
