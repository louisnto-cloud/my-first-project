/* LearnQuest — English question template generators (BC ELA K-7 aligned) */
'use strict';

const EG = {

  /* ---------- KINDERGARTEN ---------- */

  'letter-match': () => {
    // Sometimes a matching-pairs board: pair each big letter with its small twin
    if (Math.random() < 0.35) {
      const picks = U.pickN(EN.letters, 3);
      return {
        format: 'match',
        prompt: 'Match the letter partners',
        say: `Match each big letter with its small letter partner: ${picks.join(', ')}.`,
        pairs: picks.map(l2 => [l2.toUpperCase(), l2]),
        explain: 'Every big letter has a small letter twin — they make the same sound.'
      };
    }
    const l = U.pick(EN.letters);
    const others = U.pickN(EN.letters.filter(x => x !== l), 3);
    const upperToLower = Math.random() < 0.5;
    return {
      format: 'tap',
      prompt: upperToLower ? `Find the small ${l.toUpperCase()}` : `Find the big ${l}`,
      say: upperToLower ? `This is the big letter ${l}. Tap its small letter partner.` : `This is the small letter ${l}. Tap its big letter partner.`,
      visual: `<div class="big-letter">${upperToLower ? l.toUpperCase() : l}</div>`,
      choices: U.shuffle([{ label: upperToLower ? l : l.toUpperCase(), correct: true }]
        .concat(others.map(o => ({ label: upperToLower ? o : o.toUpperCase(), correct: false })))),
      big: true,
      explain: `Big ${l.toUpperCase()} and small ${l} are the same letter.`
    };
  },

  'letter-find': () => {
    const l = U.pick(EN.letters);
    const others = U.pickN(EN.letters.filter(x => x !== l), 3);
    const upper = Math.random() < 0.5;
    const show = x => upper ? x.toUpperCase() : x;
    return {
      format: 'tap',
      prompt: 'Tap the letter you hear',
      say: `Tap the letter ${l}.`,
      audioOnly: true,
      choices: U.shuffle([{ label: show(l), correct: true }].concat(others.map(o => ({ label: show(o), correct: false })))),
      big: true,
      explain: `This is the letter ${l}. ${l} says ${EN.letterSounds[l]}.`
    };
  },

  'letter-sound': () => {
    const l = U.pick(EN.letters);
    const others = U.pickN(EN.letters.filter(x => x !== l), 3);
    return {
      format: 'tap',
      prompt: 'Which letter makes this sound?',
      say: `Listen. Which letter says ${EN.letterSounds[l]}? Tap it.`,
      audioOnly: true,
      visual: `<div class="hint-emoji">${EN.letterEmoji[l]}</div>`,
      choices: U.shuffle([{ label: l.toUpperCase() + l, correct: true }].concat(others.map(o => ({ label: o.toUpperCase() + o, correct: false })))),
      big: true,
      explain: `The letter ${l} says ${EN.letterSounds[l]}.`
    };
  },

  'rhyme-match': () => {
    const fam = U.pick(EN.rhymes);
    const [a, b] = U.pickN(fam, 2);
    const wrongs = U.pickN(EN.nonRhymes, 2);
    return {
      format: 'tap',
      prompt: `Which word rhymes with "${a}"?`,
      say: `Which word rhymes with ${a}? Listen to the endings: ${b}... ${wrongs[0]}... ${wrongs[1]}.`,
      choices: U.shuffle([{ label: b, correct: true }].concat(wrongs.map(w => ({ label: w, correct: false })))),
      speakChoices: true,
      explain: `${a.toUpperCase()} and ${b.toUpperCase()} end with the same sound — they rhyme!`
    };
  },

  'trace-letter': (p) => {
    const l = U.pick(EN.letters);
    const ch = p && p.lower ? l : l.toUpperCase();
    return {
      format: 'trace',
      prompt: 'Trace the letter ' + ch,
      say: `Trace the letter ${l} with your finger. ${l} says ${EN.letterSounds[l]}.`,
      traceChar: ch,
      explain: `Nice tracing! This is the letter ${l}.`
    };
  },

  'listen-story': () => {
    const s = U.pick(EN.listenStories);
    return {
      format: 'tap',
      prompt: s.q,
      say: `Listen to the story. ${s.text} ... Here is the question: ${s.q}`,
      audioOnly: true,
      visual: `<div class="story-icon">🎧</div>`,
      choices: U.shuffle(s.choices.map(c => ({ label: c.label, emoji: c.e, correct: c.correct }))),
      explain: `Listen again: ${s.text}`
    };
  },

  /* ---------- GRADE 1 ---------- */

  'cvc-read': () => {
    const w = U.pick(EN.cvc);
    const others = U.pickN(EN.cvc.filter(x => x !== w), 3);
    const pickPicture = Math.random() < 0.5;
    if (pickPicture) {
      return {
        format: 'tap',
        prompt: `Read the word: ${w.w}`,
        say: `Sound it out: ${w.w.split('').join('... ')}. ${w.w}! Tap the picture of the word.`,
        visual: `<div class="big-word">${w.w}</div>`,
        choices: U.shuffle([{ emoji: w.e, label: '', correct: true }].concat(others.map(o => ({ emoji: o.e, label: '', correct: false })))),
        big: true,
        explain: `${w.w.split('').join(', ')} spells ${w.w} ${w.e}.`
      };
    }
    return {
      format: 'tap',
      prompt: 'Which word matches the picture?',
      say: `Look at the picture. Which word is it? Sound out each word.`,
      visual: `<div class="hint-emoji">${w.e}</div>`,
      choices: U.shuffle([{ label: w.w, correct: true }].concat(others.map(o => ({ label: o.w, correct: false })))),
      explain: `The picture shows a ${w.w}: ${w.w.split('').join(', ')}.`
    };
  },

  'cvc-build': () => {
    const w = U.pick(EN.cvc.filter(x => x.w.length === 3));
    return {
      format: 'sequence',
      prompt: `Build the word for ${w.e}`,
      say: `Build the word ${w.w}. Tap the letters in order: ${w.w.split('').join('... ')}.`,
      visual: `<div class="hint-emoji">${w.e}</div>`,
      sequence: w.w.split(''),
      distract: U.pickN('aeioubcdfgmnpst'.split('').filter(c => !w.w.includes(c)), 2),
      explain: `${w.w} is spelled ${w.w.split('').join(', ')}.`
    };
  },

  'sight-word': (p) => {
    const bank = p.set === 2 ? EN.sight2 : EN.sight1;
    const w = U.pick(bank);
    const others = U.pickN(bank.filter(x => x !== w), 3);
    return {
      format: 'tap',
      prompt: 'Tap the word you hear',
      say: `Tap the word: ${w}.`,
      audioOnly: true,
      choices: U.shuffle([{ label: w, correct: true }].concat(others.map(o => ({ label: o, correct: false })))),
      big: true,
      explain: `This word is "${w}". You will see it everywhere when you read!`
    };
  },

  'sentence-picture': () => {
    const s = U.pick(EN.simpleSentences);
    return {
      format: 'tap',
      prompt: s.s,
      say: `Read with me: ${s.s} ... Now the question: ${s.q}`,
      visual: `<div class="hint-emoji">${s.e}</div>`,
      choices: U.shuffle([{ label: s.a, correct: true }].concat(s.wrong.map(w => ({ label: w, correct: false })))),
      explain: `The sentence says: ${s.s}`
    };
  },

  'fix-sentence': () => {
    const f = U.pick(EN.fixSentences);
    const wrongs = [f.broken + '.', f.broken.charAt(0).toUpperCase() + f.broken.slice(1)];
    return {
      format: 'tap',
      prompt: `Which sentence is written correctly?`,
      say: `One of these sentences is written correctly, with a capital letter and a period. Tap it.`,
      choices: U.shuffle([{ label: f.fixed, correct: true }].concat(wrongs.map(w => ({ label: w, correct: false })))),
      explain: f.issue
    };
  },

  /* ---------- GRADE 2 ---------- */

  'digraph-id': () => {
    const useBlend = Math.random() < 0.4;
    const bank = useBlend ? EN.blendWords : EN.digraphWords;
    const w = U.pick(bank);
    const key = useBlend ? w.b : w.d;
    const others = U.pickN([...new Set(bank.map(x => useBlend ? x.b : x.d))].filter(x => x !== key), 3);
    return {
      format: 'tap',
      prompt: `Which sound starts... ${w.e}`,
      say: `Listen: ${w.w}. Which two letters make the ${useBlend ? 'beginning blend' : 'special sound'} in ${w.w}?`,
      visual: `<div class="hint-emoji">${w.e}</div><div class="big-word">${w.w.replace(key, '_'.repeat(key.length))}</div>`,
      choices: U.shuffle([{ label: key, correct: true }].concat(others.map(o => ({ label: o, correct: false })))),
      big: true,
      explain: `${w.w} ${useBlend ? 'starts with the blend' : 'uses the sound'} "${key}".`
    };
  },

  'passage-comp': (p) => {
    const bank = { 2: EN.passages2, 3: EN.passages3, 4: EN.passages4 }[p.grade || 2];
    const pas = U.pick(bank);
    const q = U.pick(pas.qs);
    return {
      format: 'tap',
      prompt: q.q,
      passage: { title: pas.title, emoji: pas.emoji, text: pas.text },
      say: p.readAloud === false ? q.q : `${pas.title}. ${pas.text} ... ${q.q}`,
      choices: U.shuffle([{ label: q.a, correct: true }].concat(q.wrong.map(w => ({ label: w, correct: false })))),
      explain: `Look back at the story — it says the answer there.`
    };
  },

  'build-sentence': () => {
    const words = U.pick(EN.scrambleSentences);
    return {
      format: 'sequence',
      prompt: 'Put the words in order to make a sentence',
      say: `Make this sentence: ${words.join(' ')}. Tap the words in order.`,
      sequence: words,
      explain: `The sentence is: ${words.join(' ')}.`
    };
  },

  'end-punctuation': () => {
    const s = U.pick(EN.endPunctuation);
    return {
      format: 'tap',
      prompt: `${s.s}⬜`,
      say: `${s.s}. Which mark goes at the end? ${s.why}`,
      choices: U.shuffle([
        { label: '.', correct: s.mark === '.' },
        { label: '?', correct: s.mark === '?' },
        { label: '!', correct: s.mark === '!' }
      ]),
      big: true,
      explain: `${s.why} It ends with "${s.mark}".`
    };
  },

  /* ---------- GRADE 3 ---------- */

  'syllables': () => {
    const w = U.pick(EN.syllableWords);
    return {
      format: 'tap',
      prompt: `How many syllables in "${w.w}"?`,
      say: `Clap it out: ${w.w}. How many syllables, how many beats, does it have?`,
      choices: U.choicesFrom(w.n, U.distractors(w.n, 3, 1, 6)),
      explain: `Clap each beat of ${w.w} — there are ${w.n} syllables.`
    };
  },

  'vocab': () => {
    const v = U.pick(EN.vocab3);
    const style = Math.random() < 0.5;
    if (style) {
      return {
        format: 'tap',
        prompt: `What does "${v.w}" mean?`,
        say: `What does the word ${v.w} mean?`,
        choices: U.shuffle([{ label: v.d, correct: true }].concat(v.wrong.map(w => ({ label: w, correct: false })))),
        explain: `${v.w} means ${v.d}.`
      };
    }
    const others = U.pickN(EN.vocab3.filter(x => x !== v), 3);
    return {
      format: 'tap',
      prompt: `Which word means "${v.d}"?`,
      say: `Which word means ${v.d}?`,
      choices: U.shuffle([{ label: v.w, correct: true }].concat(others.map(o => ({ label: o.w, correct: false })))),
      explain: `${v.w} means ${v.d}.`
    };
  },

  'parts-of-speech': () => {
    const types = ['noun', 'verb', 'adjective'];
    const items = [];
    types.forEach(t => {
      const words = U.pickN(EN.partsOfSpeech.filter(w => w.t === t), Math.random() < 0.5 ? 1 : 2);
      words.forEach(w => items.push({ label: w.w, bin: t }));
    });
    return {
      format: 'sort',
      prompt: 'Sort the words',
      say: 'Sort each word. A noun is a person, place, or thing. A verb is an action. An adjective describes.',
      bins: [
        { id: 'noun', label: 'Noun', emoji: '🏔️' },
        { id: 'verb', label: 'Verb', emoji: '🏃' },
        { id: 'adjective', label: 'Adjective', emoji: '✨' }
      ],
      items: U.shuffle(items).slice(0, 5),
      explain: 'Nouns name things, verbs show action, adjectives describe.'
    };
  },

  'story-order': () => {
    const s = U.pick(EN.storyOrder);
    return {
      format: 'sequence',
      prompt: `Put "${s.title}" in order`,
      say: `Put the steps of ${s.title} in the right order. What happens first?`,
      sequence: s.steps,
      explain: `First: ${s.steps[0]}. Last: ${s.steps[s.steps.length - 1]}.`
    };
  },

  /* ---------- GRADE 4 ---------- */

  'main-idea': () => {
    const pas = U.pick(EN.passages4);
    const q = pas.qs[0];
    return {
      format: 'tap',
      prompt: q.q,
      passage: { title: pas.title, emoji: pas.emoji, text: pas.text },
      say: q.q,
      choices: U.shuffle([{ label: q.a, correct: true }].concat(q.wrong.map(w => ({ label: w, correct: false })))),
      explain: 'The main idea is what the WHOLE passage is about, not one small detail.'
    };
  },

  'passage-detail': () => {
    const pas = U.pick(EN.passages4);
    const q = U.pick(pas.qs.slice(1));
    return {
      format: 'tap',
      prompt: q.q,
      passage: { title: pas.title, emoji: pas.emoji, text: pas.text },
      say: q.q,
      choices: U.shuffle([{ label: q.a, correct: true }].concat(q.wrong.map(w => ({ label: w, correct: false })))),
      explain: 'Look back at the passage — the answer is right there in the words.'
    };
  },

  'dialogue-punct': () => {
    const d = U.pick(EN.dialoguePunct);
    return {
      format: 'tap',
      prompt: 'Which sentence punctuates the talking correctly?',
      say: 'When someone speaks, their words get quotation marks around them. Which sentence is correct?',
      choices: U.shuffle([{ label: d.correct, correct: true }].concat(d.wrong.map(w => ({ label: w, correct: false })))),
      explain: 'The spoken words sit inside quotation marks, with a comma or end mark before the closing quote.'
    };
  },

  'affixes': () => {
    const a = U.pick(EN.prefixes);
    return {
      format: 'tap',
      prompt: `What does "${a.word}" mean?`,
      say: `The word ${a.word} uses the part "${a.affix.replace('-', '')}". What does ${a.word} mean?`,
      visual: `<div class="big-word">${a.word}</div>`,
      choices: U.shuffle([{ label: a.meaning, correct: true }].concat(a.wrong.map(w => ({ label: w, correct: false })))),
      explain: `The part "${a.affix}" changes the meaning: ${a.word} means ${a.meaning}.`
    };
  },

  'narrative-order': () => {
    const s = U.pick(EN.storyOrder);
    return {
      format: 'sequence',
      prompt: 'Order the story events',
      say: 'A good story flows in order: beginning, middle, end. Arrange these events.',
      sequence: s.steps,
      explain: 'Think: what must happen first for the rest to make sense?'
    };
  },

  /* ---------- GRADE 5 ---------- */

  'inference': () => {
    const it = U.pick(EN.inference5);
    return {
      format: 'tap',
      prompt: it.q,
      passage: { title: 'Read the clues', emoji: '🔎', text: it.s },
      say: `${it.s} ... ${it.q}`,
      choices: U.shuffle([{ label: it.a, correct: true }].concat(it.wrong.map(w => ({ label: w, correct: false })))),
      explain: 'An inference is a smart guess using clues in the text plus what you already know.'
    };
  },

  'compare-texts': () => {
    const pas = U.pick(EN.passages5);
    const q = U.pick(pas.qs);
    return {
      format: 'tap',
      prompt: q.q,
      passage: { title: pas.title, emoji: pas.emoji, text: pas.text },
      say: q.q,
      choices: U.shuffle([{ label: q.a, correct: true }].concat(q.wrong.map(w => ({ label: w, correct: false })))),
      explain: 'Re-read both parts and compare what each is trying to do.'
    };
  },

  'persuade-inform': () => {
    const it = U.pick(EN.persuadeVsInform);
    return {
      format: 'tap',
      prompt: 'Is this sentence persuading or informing?',
      passage: { title: 'Read it', emoji: '🗣️', text: it.s },
      say: `${it.s} ... Is that persuading you to do something, or just informing you with a fact?`,
      choices: U.shuffle([
        { label: 'persuading', emoji: '📣', correct: it.a === 'persuading' },
        { label: 'informing', emoji: '📘', correct: it.a === 'informing' }
      ]),
      explain: it.a === 'persuading' ? 'It pushes you to act or agree — that is persuading.' : 'It simply states a fact — that is informing.'
    };
  },

  'edit-error': () => {
    const e = U.pick(EN.editErrors);
    const wrongs = [e.s, e.s.replace('.', '!')];
    return {
      format: 'tap',
      prompt: 'Tap the corrected sentence',
      passage: { title: 'Fix this sentence', emoji: '✏️', text: e.s },
      say: `This sentence has a mistake: ${e.s} ... Which version fixes it?`,
      choices: U.shuffle([{ label: e.fix, correct: true }].concat(U.pickN(wrongs, 2).map(w => ({ label: w, correct: false })))),
      explain: e.why
    };
  },

  'figurative': () => {
    const f = U.pick(EN.figurative);
    return {
      format: 'tap',
      prompt: 'Simile or metaphor?',
      passage: { title: 'Read it', emoji: '🎨', text: f.s },
      say: `${f.s} ... Is that a simile or a metaphor? A simile compares with "like" or "as". A metaphor says something IS another thing.`,
      choices: U.shuffle([
        { label: 'simile', emoji: '🔗', correct: f.type === 'simile' },
        { label: 'metaphor', emoji: '🎭', correct: f.type === 'metaphor' }
      ]),
      explain: f.why
    };
  },

  /* ---------- GRADE 6 ---------- */

  'theme': () => {
    const t = U.pick(EN.themeStories);
    return {
      format: 'tap',
      prompt: 'What is the theme — the lesson — of this story?',
      passage: { title: 'A short fable', emoji: '📜', text: t.s },
      say: `${t.s} ... What lesson does this story teach?`,
      choices: U.shuffle([{ label: t.a, correct: true }].concat(t.wrong.map(w => ({ label: w, correct: false })))),
      explain: 'A theme is the big lesson behind the events — not just what happened.'
    };
  },

  'authors-purpose': () => {
    const a = U.pick(EN.authorsPurpose);
    return {
      format: 'tap',
      prompt: 'Why did the author write this?',
      passage: { title: 'Read it', emoji: '✍️', text: a.s },
      say: `${a.s} ... Did the author write this to inform, to persuade, to instruct, or to entertain?`,
      choices: U.shuffle([{ label: a.a, correct: true }].concat(a.wrong.map(w => ({ label: w, correct: false })))),
      explain: `Ask: does it teach steps, push an opinion, share facts, or tell a fun story? This one is ${a.a}.`
    };
  },

  'nonfiction': () => {
    const n = U.pick(EN.nonfictionFacts);
    return {
      format: 'tap',
      prompt: n.q,
      passage: { title: n.topic, emoji: '🔬', text: n.text },
      say: n.q,
      choices: U.shuffle([{ label: n.a, correct: true }].concat(n.wrong.map(w => ({ label: w, correct: false })))),
      explain: 'Nonfiction answers are always anchored in the text — find the exact sentence.'
    };
  },

  'essay-structure': () => {
    const e = U.pick(EN.essayStructure);
    const style = Math.random() < 0.5;
    if (style) {
      return {
        format: 'tap',
        prompt: 'Which sentence does NOT belong in this essay?',
        passage: { title: 'Essay topic', emoji: '📝', text: e.thesis },
        say: `The essay's main idea is: ${e.thesis} ... Which sentence does NOT support it?`,
        choices: U.shuffle([{ label: e.off, correct: true }].concat(U.pickN(e.parts, 3).map(p2 => ({ label: p2, correct: false })))),
        explain: `Every paragraph must support the thesis. "${e.off}" is off-topic.`
      };
    }
    return {
      format: 'sequence',
      prompt: 'Build the essay: thesis first, then supports',
      say: `Arrange the essay. The thesis, the main idea, comes first. Then the supporting points.`,
      sequence: [e.thesis, ...e.parts.slice(0, 2)],
      explain: 'The thesis leads; each support follows it.'
    };
  },

  'complex-sentence': () => {
    const c = U.pick(EN.complexSentences);
    const wrongConj = U.pickN(['because', 'although', 'before', 'when', 'since', 'unless'].filter(x => x !== c.conj), 2);
    return {
      format: 'blank',
      prompt: 'Choose the joining word',
      say: `Join the two ideas: ${c.parts[0]}, and, ${c.parts[1]}. Which connecting word fits best?`,
      blankText: c.joined.replace(c.conj, '____'),
      bank: U.shuffle([c.conj, ...wrongConj]),
      answer: c.conj,
      explain: `"${c.conj}" links the ideas so the sentence makes sense: ${c.joined}`
    };
  },

  'commas': () => {
    const c = U.pick(EN.commaUsage);
    return {
      format: 'tap',
      prompt: 'Which sentence uses commas correctly?',
      say: 'Which sentence has the commas in the right places?',
      choices: U.shuffle([{ label: c.correct, correct: true }].concat(c.wrong.map(w => ({ label: w, correct: false })))),
      explain: c.why
    };
  },

  'clauses': () => {
    const items = [];
    ['complete', 'incomplete'].forEach(t => {
      U.pickN(EN.clauses.filter(c => c.type === t), 2).forEach(c => items.push({ label: c.s, bin: t }));
    });
    return {
      format: 'sort',
      prompt: 'Complete thought, or not-yet-complete?',
      say: 'Sort each group of words. A complete thought can stand alone as a sentence. A not-yet-complete one leaves you hanging.',
      bins: [
        { id: 'complete', label: 'Complete sentence', emoji: '✅' },
        { id: 'incomplete', label: 'Needs more', emoji: '⏳' }
      ],
      items: U.shuffle(items),
      explain: 'A complete sentence has a subject and makes sense alone. Words like "because", "when", and "although" often start a piece that needs more.'
    };
  },

  'run-ons': () => {
    const r = U.pick(EN.runOns);
    return {
      format: 'tap',
      prompt: 'Fix the run-on sentence',
      passage: { title: 'Run-on', emoji: '🏃', text: r.runon },
      say: `This is a run-on — two sentences crashed together: ${r.runon} ... Which version fixes it?`,
      choices: U.shuffle([{ label: r.fixed, correct: true }].concat(r.wrong.map(w => ({ label: w, correct: false })))),
      explain: 'Join the two ideas with a comma and a joining word (and, but, so, or), or split them into two sentences.'
    };
  },

  'homophones': () => {
    const h = U.pick(EN.homophones);
    return {
      format: 'blank',
      prompt: 'Choose the right word',
      say: `${h.s.replace('___', 'blank')} ... Which spelling fits the blank?`,
      blankText: h.s.replace('___', '____'),
      bank: U.shuffle(h.pair.slice()),
      answer: h.a,
      explain: h.why
    };
  },

  /* ---------- GRADE 7 ---------- */

  'literary-analysis': () => {
    const pas = U.pick(EN.passages7.concat(EN.passages6));
    const q = U.pick(pas.qs);
    return {
      format: 'tap',
      prompt: q.q,
      passage: { title: pas.title, emoji: pas.emoji, text: pas.text },
      say: q.q,
      choices: U.shuffle([{ label: q.a, correct: true }].concat(q.wrong.map(w => ({ label: w, correct: false })))),
      explain: 'Support your answer with evidence — which lines in the text back it up?'
    };
  },

  'point-of-view': () => {
    const p = U.pick(EN.pointOfView);
    return {
      format: 'tap',
      prompt: 'Whose point of view?',
      passage: { title: 'Read it', emoji: '👁️', text: p.s },
      say: `${p.s} ... Is that first person, second person, or third person?`,
      choices: U.shuffle([{ label: p.a, correct: true }].concat(p.wrong.map(w => ({ label: w, correct: false })))),
      explain: 'First person uses I and we. Second person uses you. Third person uses he, she, and they.'
    };
  },

  'argument-evidence': () => {
    const a = U.pick(EN.argumentEvidence);
    return {
      format: 'tap',
      prompt: 'Which evidence best supports the claim?',
      passage: { title: 'The claim', emoji: '⚖️', text: a.claim },
      say: `The claim is: ${a.claim} ... Which piece of evidence actually supports it?`,
      choices: U.shuffle([
        { label: a.good, correct: true },
        { label: a.bad, correct: false },
        { label: U.pick(EN.argumentEvidence.filter(x => x !== a)).good, correct: false }
      ]),
      explain: 'Strong evidence is specific, relevant, and actually proves the claim — not just related words.'
    };
  },

  'tone-mood': () => {
    const t = U.pick(EN.toneMood);
    return {
      format: 'tap',
      prompt: 'What is the mood of this passage?',
      passage: { title: 'Read it', emoji: '🎭', text: t.s },
      say: `${t.s} ... What mood does that create?`,
      choices: U.shuffle([{ label: t.a, correct: true }].concat(t.wrong.map(w => ({ label: w, correct: false })))),
      explain: 'Mood is the feeling the words give you — notice the word choices that create it.'
    };
  },

  'revision': () => {
    const r = U.pick(EN.revision7);
    return {
      format: 'tap',
      prompt: 'Which revision improves the draft most?',
      passage: { title: 'First draft', emoji: '📄', text: r.draft },
      say: `Here is a weak first draft: ${r.draft} ... Which revision makes it stronger?`,
      choices: U.shuffle([{ label: r.best, correct: true }].concat(r.wrong.map(w => ({ label: w, correct: false })))),
      explain: 'Strong revision adds specific details and vivid verbs — not just the word "very".'
    };
  },

  'typed-word': (p) => {
    const bank = p && p.set === 2 ? EN.sight2 : EN.sight1;
    const w = U.pick(bank);
    return {
      format: 'typed',
      prompt: 'Type the word you hear',
      say: `Type the word: ${w}. ... ${w}.`,
      answer: w.toLowerCase(),
      explain: `The word "${w}" is spelled ${w.split('').join(', ')}.`
    };
  },

  'typed-cvc': () => {
    const w = U.pick(EN.cvc.filter(x => x.w.length === 3));
    return {
      format: 'typed',
      prompt: `Spell the word for ${w.e}`,
      say: `Spell the word ${w.w}. Sound it out: ${w.w.split('').join('... ')}.`,
      visual: `<div class="hint-emoji">${w.e}</div>`,
      answer: w.w,
      explain: `${w.w} is spelled ${w.w.split('').join(', ')}.`
    };
  }
};
