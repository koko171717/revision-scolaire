const SUPABASE_URL = "https://bohstmyjornxpvjwmldk.supabase.co";
const SUPABASE_KEY = "sb_publishable_24le4__Z_AASUmxBRyoIGQ_5ccDOucQ";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const container = document.getElementById("subjects");
const title = document.querySelector("h1");
const subtitle = document.querySelector("header p");

let currentSubject = null;
let currentChapter = null;

let reviewQuestions = [];
let currentQuestionIndex = 0;

let testQuestions = [];
let currentTestIndex = 0;
let testScore = 0;

/* =========================
   ACCUEIL
========================= */

async function loadSubjects() {
  currentSubject = null;
  currentChapter = null;

  title.textContent = "Révisions scolaires";
  subtitle.textContent = "Choisis une matière";

  const { data, error } = await supabaseClient
    .from("subjects")
    .select("*")
    .order("sort_order");

  if (error) {
    console.error(error);
    container.innerHTML = "<p>Impossible de charger les matières.</p>";
    return;
  }

  container.innerHTML = "";

  data.forEach(subject => {
    const card = document.createElement("div");
    card.className = "subject-card";

    card.innerHTML = `
      <div class="subject-icon">${subject.icon || "📚"}</div>
      <div class="subject-name">${subject.name}</div>
    `;

    card.addEventListener("click", () => {
      loadChapters(subject);
    });

    container.appendChild(card);
  });
}

/* =========================
   CHAPITRES
========================= */

async function loadChapters(subject) {
  currentSubject = subject;

  title.textContent = subject.name;
  subtitle.textContent = "Choisis un chapitre";

  const { data, error } = await supabaseClient
    .from("chapters")
    .select("*")
    .eq("subject_id", subject.id)
    .order("sort_order");

  if (error) {
    console.error(error);
    container.innerHTML = "<p>Impossible de charger les chapitres.</p>";
    return;
  }

  container.innerHTML = "";

  addBackButton(() => loadSubjects());

  if (data.length === 0) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "subject-card";

    emptyCard.innerHTML = `
      <div class="subject-icon">📭</div>
      <div class="subject-name">Aucun chapitre</div>
    `;

    container.appendChild(emptyCard);
    return;
  }

  data.forEach(chapter => {
    const card = document.createElement("div");
    card.className = "subject-card";

    card.innerHTML = `
      <div class="subject-icon">📘</div>
      <div class="subject-name">${chapter.name}</div>
    `;

    card.addEventListener("click", () => {
      showModes(chapter);
    });

    container.appendChild(card);
  });
}

/* =========================
   CHOIX DU MODE
========================= */

function showModes(chapter) {
  currentChapter = chapter;

  title.textContent = chapter.name;
  subtitle.textContent = "Choisis ton mode";

  container.innerHTML = "";

  addBackButton(() => loadChapters(currentSubject));

  const revisionCard = document.createElement("div");
  revisionCard.className = "subject-card";

  revisionCard.innerHTML = `
    <div class="subject-icon">📚</div>
    <div class="subject-name">Révision</div>
    <div class="mode-description">
      Apprends à ton rythme et affiche la réponse.
    </div>
  `;

  revisionCard.addEventListener("click", () => {
    showReviewDirection();
  });

  container.appendChild(revisionCard);

  const testCard = document.createElement("div");
  testCard.className = "subject-card";

  testCard.innerHTML = `
    <div class="subject-icon">🎯</div>
    <div class="subject-name">Test</div>
    <div class="mode-description">
      Écris ta réponse et obtiens ton score.
    </div>
  `;

  testCard.addEventListener("click", () => {
    showTestDirection();
  });

  container.appendChild(testCard);
}

/* =========================
   CHOIX DU SENS - RÉVISION
========================= */

function showReviewDirection() {
  title.textContent = currentChapter.name;
  subtitle.textContent = "Choisis le sens de révision";

  container.innerHTML = "";

  addBackButton(() => showModes(currentChapter));

  addDirectionCards((direction) => {
    startReview(currentChapter, direction);
  });
}

/* =========================
   CHOIX DU SENS - TEST
========================= */

function showTestDirection() {
  title.textContent = currentChapter.name;
  subtitle.textContent = "Choisis le sens du test";

  container.innerHTML = "";

  addBackButton(() => showModes(currentChapter));

  addDirectionCards((direction) => {
    startTest(currentChapter, direction);
  });
}

/* =========================
   CARTES DE DIRECTION
========================= */

function addDirectionCards(callback) {
  const countryToCapital = document.createElement("div");
  countryToCapital.className = "subject-card";

  countryToCapital.innerHTML = `
    <div class="subject-icon">🌍</div>
    <div class="subject-name">Pays → Capitale</div>
    <div class="mode-description">
      Exemple : Suisse → Berne
    </div>
  `;

  countryToCapital.addEventListener("click", () => {
    callback("forward");
  });

  container.appendChild(countryToCapital);

  const capitalToCountry = document.createElement("div");
  capitalToCountry.className = "subject-card";

  capitalToCountry.innerHTML = `
    <div class="subject-icon">🏙️</div>
    <div class="subject-name">Capitale → Pays</div>
    <div class="mode-description">
      Exemple : Berne → Suisse
    </div>
  `;

  capitalToCountry.addEventListener("click", () => {
    callback("reverse");
  });

  container.appendChild(capitalToCountry);

  const bothDirections = document.createElement("div");
  bothDirections.className = "subject-card";

  bothDirections.innerHTML = `
    <div class="subject-icon">🔀</div>
    <div class="subject-name">Les deux</div>
    <div class="mode-description">
      Mélange les deux sens
    </div>
  `;

  bothDirections.addEventListener("click", () => {
    callback("both");
  });

  container.appendChild(bothDirections);
}

/* =========================
   MODE RÉVISION
========================= */

async function startReview(chapter, direction) {
  title.textContent = chapter.name;
  subtitle.textContent = "Mode Révision";

  container.innerHTML = "<p>Chargement des questions...</p>";

  const data = await loadCards(chapter);

  if (!data) return;

  reviewQuestions = buildQuestions(data, direction);

  shuffleArray(reviewQuestions);

  currentQuestionIndex = 0;

  showReviewQuestion();
}

function showReviewQuestion() {
  if (currentQuestionIndex >= reviewQuestions.length) {
    showReviewFinished();
    return;
  }

  const current = reviewQuestions[currentQuestionIndex];

  title.textContent = currentChapter.name;
  subtitle.textContent =
    `Question ${currentQuestionIndex + 1} sur ${reviewQuestions.length}`;

  container.innerHTML = "";

  const reviewBox = document.createElement("div");
  reviewBox.className = "review-box";

  reviewBox.innerHTML = `
    <div class="review-question">
      ${current.question}
    </div>

    <button id="show-answer" class="main-button">
      Voir la réponse
    </button>

    <div id="answer-area" class="answer-area hidden">

      <div class="review-answer">
        ${current.answer}
      </div>

      <div class="review-actions">
        <button id="wrong-button" class="review-button">
          ❌ À revoir
        </button>

        <button id="correct-button" class="review-button">
          ✅ Je savais
        </button>
      </div>

    </div>

    <button id="quit-review" class="secondary-button review-back-button">
      ← Retour
    </button>
  `;

  container.appendChild(reviewBox);

  document
    .getElementById("quit-review")
    .addEventListener("click", () => {
      showReviewDirection();
    });

  document
    .getElementById("show-answer")
    .addEventListener("click", showAnswer);

  document
    .getElementById("wrong-button")
    .addEventListener("click", answerWrong);

  document
    .getElementById("correct-button")
    .addEventListener("click", answerCorrect);
}

function showAnswer() {
  document.getElementById("answer-area").classList.remove("hidden");
  document.getElementById("show-answer").classList.add("hidden");
}

function answerCorrect() {
  currentQuestionIndex++;
  showReviewQuestion();
}

function answerWrong() {
  const missedQuestion = reviewQuestions[currentQuestionIndex];

  reviewQuestions.push(missedQuestion);

  currentQuestionIndex++;

  showReviewQuestion();
}

/* =========================
   FIN RÉVISION
========================= */

function showReviewFinished() {
  title.textContent = "Bravo !";
  subtitle.textContent = "Révision terminée";

  container.innerHTML = "";

  const box = document.createElement("div");
  box.className = "review-box";

  box.innerHTML = `
    <div class="finish-icon">🎉</div>

    <h2>Révision terminée</h2>

    <button id="restart-review" class="main-button">
      Nouvelle révision
    </button>

    <button id="back-chapter" class="secondary-button">
      Retour au chapitre
    </button>
  `;

  container.appendChild(box);

  document
    .getElementById("restart-review")
    .addEventListener("click", () => {
      showReviewDirection();
    });

  document
    .getElementById("back-chapter")
    .addEventListener("click", () => {
      showModes(currentChapter);
    });
}

/* =========================
   MODE TEST
========================= */

async function startTest(chapter, direction) {
  title.textContent = chapter.name;
  subtitle.textContent = "Mode Test";

  container.innerHTML = "<p>Chargement du test...</p>";

  const data = await loadCards(chapter);

  if (!data) return;

  testQuestions = buildQuestions(data, direction);

  shuffleArray(testQuestions);

  currentTestIndex = 0;
  testScore = 0;

  showTestQuestion();
}

function showTestQuestion() {
  if (currentTestIndex >= testQuestions.length) {
    showTestFinished();
    return;
  }

  const current = testQuestions[currentTestIndex];

  title.textContent = currentChapter.name;
  subtitle.textContent =
    `Question ${currentTestIndex + 1} sur ${testQuestions.length} • Score ${testScore}`;

  container.innerHTML = "";

  const box = document.createElement("div");
  box.className = "review-box";

  box.innerHTML = `
    <div class="review-question">
      ${current.question}
    </div>

    <input
      id="test-answer"
      class="test-input"
      type="text"
      placeholder="Écris ta réponse"
      autocomplete="off"
    />

    <button id="validate-test" class="main-button">
      Valider
    </button>

    <div id="test-feedback" class="test-feedback hidden"></div>

    <button id="quit-test" class="secondary-button review-back-button">
      ← Retour
    </button>
  `;

  container.appendChild(box);

  const input = document.getElementById("test-answer");
  input.focus();

  document
    .getElementById("validate-test")
    .addEventListener("click", validateTestAnswer);

  document
    .getElementById("quit-test")
    .addEventListener("click", () => {
      showTestDirection();
    });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      validateTestAnswer();
    }
  });
}

function validateTestAnswer() {
  const input = document.getElementById("test-answer");
  const button = document.getElementById("validate-test");
  const feedback = document.getElementById("test-feedback");

  const userAnswer = input.value.trim();

  if (!userAnswer) {
    return;
  }

  const current = testQuestions[currentTestIndex];

  const isCorrect =
    normalizeAnswer(userAnswer) === normalizeAnswer(current.answer);

  input.disabled = true;
  button.disabled = true;

  feedback.classList.remove("hidden");

  if (isCorrect) {
    testScore++;

    feedback.innerHTML = `
      <div class="test-correct">
        ✅ Bonne réponse !
      </div>
    `;
  } else {
    feedback.innerHTML = `
      <div class="test-wrong">
        ❌ Mauvaise réponse
      </div>

      <div class="test-correction">
        Réponse : <strong>${current.answer}</strong>
      </div>
    `;
  }

  const nextButton = document.createElement("button");
  nextButton.className = "main-button test-next-button";
  nextButton.textContent = "Question suivante";

  nextButton.addEventListener("click", () => {
    currentTestIndex++;
    showTestQuestion();
  });

  feedback.appendChild(nextButton);
}

/* =========================
   FIN TEST
========================= */

function showTestFinished() {
  const total = testQuestions.length;
  const percent =
    total > 0 ? Math.round((testScore / total) * 100) : 0;

  title.textContent = "Test terminé";
  subtitle.textContent = `${testScore} bonne(s) réponse(s) sur ${total}`;

  container.innerHTML = "";

  const box = document.createElement("div");
  box.className = "review-box";

  box.innerHTML = `
    <div class="finish-icon">🎯</div>

    <h2>${testScore} / ${total}</h2>

    <div class="test-percent">
      ${percent} %
    </div>

    <button id="restart-test" class="main-button">
      Refaire un test
    </button>

    <button id="back-test" class="secondary-button">
      Retour au chapitre
    </button>
  `;

  container.appendChild(box);

  document
    .getElementById("restart-test")
    .addEventListener("click", () => {
      showTestDirection();
    });

  document
    .getElementById("back-test")
    .addEventListener("click", () => {
      showModes(currentChapter);
    });
}

/* =========================
   CHARGEMENT DES CARTES
========================= */

async function loadCards(chapter) {
  const { data, error } = await supabaseClient
    .from("cards")
    .select("*")
    .eq("chapter_id", chapter.id)
    .eq("active", true)
    .order("sort_order");

  if (error) {
    console.error(error);
    container.innerHTML = "<p>Impossible de charger les questions.</p>";
    return null;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Aucune question dans ce chapitre.</p>";
    return null;
  }

  return data;
}

/* =========================
   CONSTRUCTION DES QUESTIONS
========================= */

function buildQuestions(data, direction) {
  const questions = [];

  data.forEach(card => {
    if (direction === "forward" || direction === "both") {
      questions.push({
        question: card.question,
        answer: card.answer
      });
    }

    if (
      (direction === "reverse" || direction === "both") &&
      card.reverse_question &&
      card.reverse_answer
    ) {
      questions.push({
        question: card.reverse_question,
        answer: card.reverse_answer
      });
    }
  });

  return questions;
}

/* =========================
   NORMALISATION DES RÉPONSES
========================= */

function normalizeAnswer(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================
   OUTILS
========================= */

function addBackButton(action) {
  const backButton = document.createElement("div");
  backButton.className = "subject-card back-card";

  backButton.innerHTML = `
    <div class="subject-icon">←</div>
    <div class="subject-name">Retour</div>
  `;

  backButton.addEventListener("click", action);

  container.appendChild(backButton);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [array[i], array[j]] = [
      array[j],
      array[i]
    ];
  }
}

loadSubjects();
