'use strict';

const readings = [
  ['a','i','u','e','o'], ['ka','ki','ku','ke','ko'], ['sa','shi','su','se','so'],
  ['ta','chi','tsu','te','to'], ['na','ni','nu','ne','no'], ['ha','hi','fu','he','ho'],
  ['ma','mi','mu','me','mo'], ['ya','yu','yo'], ['ra','ri','ru','re','ro'], ['wa','wo'], ['n']
];
const scripts = {
  hiragana: { name: 'Хирагана', rows: ['あいうえお','かきくけこ','さしすせそ','たちつてと','なにぬねの','はひふへほ','まみむめも','やゆよ','らりるれろ','わを','ん'] },
  katakana: { name: 'Катакана', rows: ['アイウエオ','カキクケコ','サシスセソ','タチツテト','ナニヌネノ','ハヒフヘホ','マミムメモ','ヤユヨ','ラリルレロ','ワヲ','ン'] }
};
const storageKey = 'kana-study-progress-v1';
const freshProgress = () => ({ hiragana: [], katakana: [] });
let storageAvailable = true;
function loadProgress() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return freshProgress();
    const saved = JSON.parse(raw);
    const result = freshProgress();
    for (const key of Object.keys(scripts)) {
      // Only retain a continuous sequence: later lessons cannot be unlocked by malformed data.
      if (Array.isArray(saved?.[key])) {
        for (let i = 0; i < readings.length && saved[key].includes(i); i++) result[key].push(i);
      }
    }
    return result;
  } catch (error) {
    if (!(error instanceof SyntaxError)) storageAvailable = false;
    return freshProgress();
  }
}
let progress = loadProgress();
let script = 'hiragana';
let selected = 0;
let quiz = null;
const content = document.querySelector('#content');
const lessonList = document.querySelector('#lesson-list');
function saveProgress() {
  try { localStorage.setItem(storageKey, JSON.stringify(progress)); storageAvailable = true; }
  catch { storageAvailable = false; }
  document.querySelector('#storage-note').hidden = storageAvailable;
}
function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function renderNavigation() {
  document.querySelectorAll('[data-script]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.script === script)));
  const completed = progress[script];
  lessonList.innerHTML = scripts[script].rows.map((row, index) => {
    const locked = index > completed.length;
    const done = completed.includes(index);
    const label = index === 10 ? 'Знак n' : `Строка ${readings[index][0]}`;
    const status = done ? 'Изучено' : locked ? 'Закрыто' : 'Доступно';
    return `<button class="lesson-item ${index === selected ? 'current' : ''}" data-row="${index}" ${locked ? 'disabled title="Сначала пройдите предыдущую строку"' : ''} ${index === selected ? 'aria-current="step"' : ''}><span class="lesson-symbol" lang="ja">${[...row][0]}</span><span class="lesson-name">${label}<small>${status}</small></span><span class="lesson-status" aria-hidden="true">${done ? '✓' : locked ? '·' : '○'}</span></button>`;
  }).join('');
  document.querySelector('#progress-text').textContent = `${completed.length} / ${readings.length}`;
  document.querySelector('#progress').value = completed.length;
  document.querySelector('#progress').setAttribute('aria-label', `Освоено строк: ${completed.length} из ${readings.length}`);
  document.querySelector('#storage-note').hidden = storageAvailable;
}
function rowTitle() { return selected === 10 ? 'Знак n' : `Строка ${readings[selected][0]}`; }
function renderStudy() {
  quiz = null;
  const symbols = [...scripts[script].rows[selected]];
  content.innerHTML = `<div class="content-top"><div><p class="eyebrow">${scripts[script].name} · урок ${selected + 1}</p><h2>${rowTitle()}</h2><p>Познакомьтесь со знаками, прежде чем проверить себя.</p></div><span class="badge">${symbols.length} ${symbols.length === 1 ? 'знак' : symbols.length < 5 ? 'знака' : 'знаков'}</span></div><div class="study-area"><div class="writing-box" aria-hidden="true"><span lang="ja">${symbols[0]}</span></div><div class="study-copy"><h3>Начнём знакомство</h3><p>Посмотрите на каждый знак и его чтение. Произнесите их вслух несколько раз — так запомнить будет легче.</p></div></div><div class="kana-grid">${symbols.map((symbol, i) => `<div class="kana-cell"><strong lang="ja">${symbol}</strong><span>${readings[selected][i]}</span></div>`).join('')}</div><button class="primary" id="start-quiz">Начать проверку</button><span class="hint">Все ответы верны — следующая строка открыта</span>`;
  document.querySelector('#start-quiz').addEventListener('click', startQuiz);
}
function startQuiz() {
  const symbols = [...scripts[script].rows[selected]];
  quiz = { questions: shuffle(symbols.map((symbol, i) => ({ symbol, answer: readings[selected][i] }))), index: 0, correct: 0, answered: false };
  renderQuestion();
}
function renderQuestion() {
  const question = quiz.questions[quiz.index];
  quiz.answered = false;
  const distractors = shuffle([...new Set(readings.flat())].filter(value => value !== question.answer)).slice(0, 3);
  const options = shuffle([question.answer, ...distractors]);
  content.innerHTML = `<div class="content-top"><div><p class="eyebrow">${scripts[script].name} · ${rowTitle()}</p><h2>Проверим знания</h2><p>Выберите правильное чтение знака.</p></div><span class="badge">${quiz.index + 1} из ${quiz.questions.length}</span></div><div class="quiz-layout"><div class="writing-box"><span lang="ja">${question.symbol}</span></div><div class="quiz-question"><h3>Как читается этот знак?</h3><p>Выберите один из вариантов ниже.</p><div class="options">${options.map(option => `<button class="option" data-answer="${option}">${option}</button>`).join('')}</div><p class="feedback" role="status"></p><button class="primary" id="next-question" hidden>${quiz.index === quiz.questions.length - 1 ? 'Посмотреть результат' : 'Следующий знак'}</button></div></div>`;
  content.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => answerQuestion(button)));
  document.querySelector('#next-question').addEventListener('click', () => {
    quiz.index++;
    if (quiz.index === quiz.questions.length) finishQuiz(); else renderQuestion();
    content.querySelector('h2').setAttribute('tabindex', '-1');
    content.querySelector('h2').focus();
  });
}
function answerQuestion(button) {
  if (quiz.answered) return;
  quiz.answered = true;
  const answer = quiz.questions[quiz.index].answer;
  const correct = button.dataset.answer === answer;
  if (correct) quiz.correct++;
  content.querySelectorAll('[data-answer]').forEach(option => {
    option.disabled = true;
    if (option.dataset.answer === answer) option.classList.add('correct');
  });
  if (!correct) button.classList.add('wrong');
  content.querySelector('.feedback').textContent = correct ? 'Верно! Отличная работа.' : `Не совсем. Правильное чтение: ${answer}.`;
  document.querySelector('#next-question').hidden = false;
}
function finishQuiz() {
  const score = quiz.correct;
  const total = quiz.questions.length;
  const success = score === total;
  if (success && !progress[script].includes(selected)) {
    progress[script].push(selected);
    saveProgress();
  }
  renderNavigation();
  const last = selected === readings.length - 1;
  content.innerHTML = `<div class="content-top"><div><p class="eyebrow">${scripts[script].name} · ${rowTitle()}</p><h2>Проверка завершена</h2><p>Правильных ответов: ${score} из ${total}.</p></div></div><div class="result"><div class="result-icon" aria-hidden="true">${success ? '✓' : '↺'}</div><h3>${success ? (last ? 'Азбука пройдена!' : 'Строка изучена!') : 'Попробуем ещё раз?'}</h3><p>${success ? (last ? 'Вы прошли все строки этой азбуки. Возвращайтесь к ним, чтобы повторить знаки.' : 'Вы правильно ответили на все вопросы. Следующая строка уже открыта.') : 'Чтобы открыть следующую строку, нужно правильно ответить на все вопросы. Повторите знаки и попробуйте снова.'}</p><div class="result-actions">${success && !last ? '<button class="primary" id="next-lesson">Следующая строка</button>' : ''}<button class="${success && !last ? 'secondary' : 'primary'}" id="review">Повторить строку</button></div></div>`;
  document.querySelector('#review').addEventListener('click', renderStudy);
  document.querySelector('#next-lesson')?.addEventListener('click', () => { selected++; renderNavigation(); renderStudy(); });
}
document.querySelectorAll('[data-script]').forEach(button => button.addEventListener('click', () => {
  script = button.dataset.script;
  selected = Math.min(progress[script].length, readings.length - 1);
  renderNavigation(); renderStudy();
}));
lessonList.addEventListener('click', event => {
  const button = event.target.closest('[data-row]');
  if (!button || button.disabled) return;
  selected = Number(button.dataset.row);
  renderNavigation(); renderStudy();
});
document.querySelector('#reset').addEventListener('click', () => {
  if (!confirm('Сбросить весь прогресс хираганы и катаканы? Это действие нельзя отменить.')) return;
  progress = freshProgress(); selected = 0; saveProgress(); renderNavigation(); renderStudy();
});
selected = Math.min(progress[script].length, readings.length - 1);
renderNavigation(); renderStudy();
