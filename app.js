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

    let icon = "📘";

    if (chapter.content_type === "flags") {
      icon = "🏳️";
    }

    card.innerHTML = `
      <div class="subject-icon">${icon}</div>
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

  if (chapter.content_type === "flags") {
    revisionCard.innerHTML = `
      <div class="subject-icon">🏳️</div>
      <div class="subject-name">Révision</div>
      <div class="mode-description">
        Drapeau → Pays
      </div>
    `;
  } else {
    revisionCard.innerHTML = `
      <div class="subject-icon">📚</div>
      <div class="subject-name">Révision</div>
      <div class="mode-description">
        Apprends à ton rythme et affiche la réponse.
      </div>
    `;
  }

  revisionCard.addEventListener("click", () => {
    if (chapter.content_type === "flags") {
      startFlagReview(chapter);
    } else if (chapter.direction_mode === "single") {
      startReview(chapter, "forward");
    } else {
      showReviewDirection();
    }
  });

  container.appendChild(revisionCard);

  const testCard = document.createElement("div");

  if (chapter.test_mode === "disabled") {
    testCard.className = "subject-card disabled-card";

    testCard.innerHTML = `
      <div class="subject-icon">🎯</div>
      <div class="subject-name">Test</div>
      <div class="mode-description">
        Test bientôt disponible
      </div>
    `;
  } else {
    testCard.className = "subject-card";

    if (chapter.content_type === "flags") {
      testCard.innerHTML = `
        <div class="subject-icon">🎯</div>
        <div class="subject-name">Test QCM</div>
        <div class="mode-description">
          Pays → Drapeau
        </div>
      `;
    } else {
      let description = "Écris ta réponse et obtiens ton score.";

      if (chapter.test_mode === "qcm") {
        description = "Choisis la bonne réponse parmi 4 propositions.";
      }

      testCard.innerHTML = `
        <div class="subject-icon">🎯</div>
        <div class="subject-name">Test</div>
        <div class="mode-description">
          ${description}
        </div>
      `;
    }

    testCard.addEventListener("click", () => {
      if (chapter.content_type === "flags") {
        startFlagTest(chapter);
      } else if (chapter.direction_mode === "single") {
        startTest(chapter, "forward");
      } else {
        showTestDirection();
      }
    });
  }

  container.appendChild(testCard);
}

/* =========================
   CHOIX DU SENS
========================= */

function showReviewDirection() {
  title.textContent = currentChapter.name;
  subtitle.textContent = "Choisis le sens de révision";

  container.innerHTML = "";

  addBackButton(() => showModes(currentChapter));

  addDirectionCards(direction => {
    startReview(currentChapter, direction);
  });
}

function showTestDirection() {
  title.textContent = currentChapter.name;
  subtitle.textContent = "Choisis le sens du test";

  container.innerHTML = "";

  addBackButton(() => showModes(currentChapter));

  addDirectionCards(direction => {
    startTest(currentChapter, direction);
  });
}

function addDirectionCards(callback) {
  const forwardCard = document.createElement("div");
  forwardCard.className = "subject-card";

  forwardCard.innerHTML = `
    <div class="subject-icon">➡️</div>
    <div class="subject-name">Sens normal</div>
    <div class="mode-description">
      Exemple : Suisse → Berne
    </div>
  `;

  forwardCard.addEventListener("click", () => {
    callback("forward");
  });

  container.appendChild(forwardCard);

  const reverseCard = document.createElement("div");
  reverseCard.className = "subject-card";

  reverseCard.innerHTML = `
    <div class="subject-icon">⬅️</div>
    <div class="subject-name">Sens inverse</div>
    <div class="mode-description">
      Exemple : Berne → Suisse
    </div>
  `;

  reverseCard.addEventListener("click", () => {
    callback("reverse");
  });

  container.appendChild(reverseCard);

  const bothCard = document.createElement("div");
  bothCard.className = "subject-card";

  bothCard.innerHTML = `
    <div class="subject-icon">🔀</div>
    <div class="subject-name">Les deux</div>
    <div class="mode-description">
      Mélange les deux sens
    </div>
  `;

  bothCard.addEventListener("click", () => {
    callback("both");
  });

  container.appendChild(bothCard);
}

/* =========================
   RÉVISION TEXTE
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
      if (currentChapter.direction_mode === "single") {
        showModes(currentChapter);
      } else {
        showReviewDirection();
      }
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

/* =========================
   RÉVISION DRAPEAUX
========================= */

async function startFlagReview(chapter) {
  title.textContent = chapter.name;
  subtitle.textContent = "Drapeau → Pays";

  container.innerHTML = "<p>Chargement des drapeaux...</p>";

  const data = await loadCards(chapter);

  if (!data) return;

  reviewQuestions = data.map(card => ({
    question: card.question,
    answer: card.answer,
    image_url: card.image_url
  }));

  shuffleArray(reviewQuestions);

  currentQuestionIndex = 0;

  showFlagReviewQuestion();
}

function showFlagReviewQuestion() {
  if (currentQuestionIndex >= reviewQuestions.length) {
    showReviewFinished();
    return;
  }

  const current = reviewQuestions[currentQuestionIndex];

  title.textContent = currentChapter.name;

  subtitle.textContent =
    `Question ${currentQuestionIndex + 1} sur ${reviewQuestions.length}`;

  container.innerHTML = "";

  const box = document.createElement("div");
  box.className = "review-box";

  box.innerHTML = `
    <div class="flag-review-question">
      Quel pays correspond à ce drapeau ?
    </div>

    <div class="flag-display">
      <img
        src="${current.image_url}"
        alt="Drapeau à identifier"
        class="flag-main-image"
      />
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

  container.appendChild(box);

  document
    .getElementById("show-answer")
    .addEventListener("click", showAnswer);

  document
    .getElementById("wrong-button")
    .addEventListener("click", () => {
      const missed = reviewQuestions[currentQuestionIndex];
      reviewQuestions.push(missed);
      currentQuestionIndex++;
      showFlagReviewQuestion();
    });

  document
    .getElementById("correct-button")
    .addEventListener("click", () => {
      currentQuestionIndex++;
      showFlagReviewQuestion();
    });

  document
    .getElementById("quit-review")
    .addEventListener("click", () => {
      showModes(currentChapter);
    });
}

function showAnswer() {
  document
    .getElementById("answer-area")
    .classList.remove("hidden");

  document
    .getElementById("show-answer")
    .classList.add("hidden");
}

function answerCorrect() {
  currentQuestionIndex++;
  showReviewQuestion();
}

function answerWrong() {
  const missed =
    reviewQuestions[currentQuestionIndex];

  reviewQuestions.push(missed);

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
      if (currentChapter.content_type === "flags") {
        startFlagReview(currentChapter);
      } else if (currentChapter.direction_mode === "single") {
        startReview(currentChapter, "forward");
      } else {
        showReviewDirection();
      }
    });

  document
    .getElementById("back-chapter")
    .addEventListener("click", () => {
      showModes(currentChapter);
    });
}

/* =========================
   DÉMARRAGE TEST TEXTE
========================= */

async function startTest(chapter, direction) {
  title.textContent = chapter.name;
  subtitle.textContent = "Mode Test";

  container.innerHTML = "<p>Chargement du test...</p>";

  const data = await loadCards(chapter);

  if (!data) return;

  if (chapter.test_mode === "qcm") {
    testQuestions = buildQcmQuestions(data);
  } else {
    testQuestions = buildQuestions(data, direction);
  }

  shuffleArray(testQuestions);

  testQuestions = testQuestions.slice(0, 20);

  currentTestIndex = 0;
  testScore = 0;

  if (chapter.test_mode === "qcm") {
    showQcmQuestion();
  } else {
    showWrittenTestQuestion();
  }
}

/* =========================
   TEST DRAPEAUX
========================= */

async function startFlagTest(chapter) {
  title.textContent = chapter.name;
  subtitle.textContent = "Pays → Drapeau";

  container.innerHTML = "<p>Chargement du test...</p>";

  const data = await loadCards(chapter);

  if (!data) return;

  const allFlags = data.filter(card => card.image_url);

  testQuestions = [...allFlags];

  shuffleArray(testQuestions);

  testQuestions = testQuestions.slice(0, 20);

  currentTestIndex = 0;
  testScore = 0;

  showFlagTestQuestion(allFlags);
}

function showFlagTestQuestion(allFlags) {
  if (currentTestIndex >= testQuestions.length) {
    showTestFinished();
    return;
  }

  const current = testQuestions[currentTestIndex];

  title.textContent = currentChapter.name;
  subtitle.textContent = "Pays → Drapeau";

  container.innerHTML = "";

  const box = document.createElement("div");
  box.className = "qcm-card";

  const distractors = allFlags
    .filter(card => card.id !== current.id);

  shuffleArray(distractors);

  const choices = [
    current,
    ...distractors.slice(0, 3)
  ];

  shuffleArray(choices);

  const progress =
    ((currentTestIndex + 1) / testQuestions.length) * 100;

  let choicesHtml = "";

  choices.forEach(choice => {
    choicesHtml += `
      <button
        class="flag-choice-button"
        data-id="${choice.id}"
      >
        <img
          src="${choice.image_url}"
          alt="Drapeau"
          class="flag-choice-image"
        />
      </button>
    `;
  });

  box.innerHTML = `
    <div class="qcm-topbar">

      <div class="qcm-counter">
        Question ${currentTestIndex + 1}
        <span>sur ${testQuestions.length}</span>
      </div>

      <div class="qcm-score">
        ⭐ ${testScore}
      </div>

    </div>

    <div class="qcm-progress">
      <div
        class="qcm-progress-bar"
        style="width: ${progress}%"
      ></div>
    </div>

    <div class="flag-test-title">
      Quel est le drapeau de :
    </div>

    <div class="flag-country-name">
      ${current.answer}
    </div>

    <div class="flag-qcm-grid">
      ${choicesHtml}
    </div>

    <div
      id="qcm-feedback"
      class="qcm-feedback hidden"
    ></div>

    <button
      id="quit-test"
      class="qcm-back-button"
    >
      ← Quitter le test
    </button>
  `;

  container.appendChild(box);

  document
    .querySelectorAll(".flag-choice-button")
    .forEach(button => {
      button.addEventListener("click", () => {
        validateFlagAnswer(button, current, allFlags);
      });
    });

  document
    .getElementById("quit-test")
    .addEventListener("click", () => {
      showModes(currentChapter);
    });
}

function validateFlagAnswer(button, current, allFlags) {
  const selectedId = String(button.dataset.id);
  const correctId = String(current.id);

  const buttons =
    document.querySelectorAll(".flag-choice-button");

  buttons.forEach(btn => {
    btn.disabled = true;

    if (String(btn.dataset.id) === correctId) {
      btn.classList.add("flag-choice-correct");
    }
  });

  const feedback =
    document.getElementById("qcm-feedback");

  if (selectedId === correctId) {
    testScore++;

    feedback.innerHTML = `
      <div class="qcm-feedback-title correct">
        ✓ Bonne réponse
      </div>
    `;
  } else {
    button.classList.add("flag-choice-wrong");

    feedback.innerHTML = `
      <div class="qcm-feedback-title wrong">
        ✕ Mauvaise réponse
      </div>
    `;
  }

  feedback.classList.remove("hidden");

  const nextButton =
    document.createElement("button");

  nextButton.className = "qcm-next-button";

  nextButton.textContent =
    currentTestIndex + 1 === testQuestions.length
      ? "Voir mon résultat"
      : "Question suivante →";

  nextButton.addEventListener("click", () => {
    currentTestIndex++;
    showFlagTestQuestion(allFlags);
  });

  feedback.appendChild(nextButton);
}

/* =========================
   TEST ÉCRIT
========================= */

function showWrittenTestQuestion() {
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
    .addEventListener("click", validateWrittenTestAnswer);

  document
    .getElementById("quit-test")
    .addEventListener("click", () => {
      if (currentChapter.direction_mode === "single") {
        showModes(currentChapter);
      } else {
        showTestDirection();
      }
    });

  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      validateWrittenTestAnswer();
    }
  });
}

function validateWrittenTestAnswer() {
  const input = document.getElementById("test-answer");
  const button = document.getElementById("validate-test");
  const feedback = document.getElementById("test-feedback");

  const userAnswer = input.value.trim();

  if (!userAnswer) return;

  const current = testQuestions[currentTestIndex];

  const isCorrect =
    normalizeAnswer(userAnswer) ===
    normalizeAnswer(current.answer);

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
        Bonne réponse :
        <strong>${current.answer}</strong>
      </div>
    `;
  }

  addNextTestButton(
    feedback,
    showWrittenTestQuestion
  );
}

/* =========================
   QCM TEXTE
========================= */

function buildQcmQuestions(data) {
  const questions = [];

  data.forEach(card => {
    if (
      card.wrong_answer_1 &&
      card.wrong_answer_2 &&
      card.wrong_answer_3
    ) {
      questions.push({
        question: card.question,
        answer: card.answer,
        choices: [
          card.answer,
          card.wrong_answer_1,
          card.wrong_answer_2,
          card.wrong_answer_3
        ]
      });
    }
  });

  return questions;
}

function showQcmQuestion() {
  if (currentTestIndex >= testQuestions.length) {
    showTestFinished();
    return;
  }

  const current = testQuestions[currentTestIndex];

  title.textContent = currentChapter.name;
  subtitle.textContent = "Mode Test";

  container.innerHTML = "";

  const box = document.createElement("div");
  box.className = "qcm-card";

  const choices = [...current.choices];
  shuffleArray(choices);

  let choicesHtml = "";

  const letters = ["A", "B", "C", "D"];

  choices.forEach((choice, index) => {
    choicesHtml += `
      <button
        class="qcm-button"
        data-answer="${escapeHtmlAttribute(choice)}"
      >
        <span class="qcm-letter">
          ${letters[index]}
        </span>

        <span class="qcm-choice-text">
          ${choice}
        </span>
      </button>
    `;
  });

  const progress =
    ((currentTestIndex + 1) / testQuestions.length) * 100;

  box.innerHTML = `
    <div class="qcm-topbar">

      <div class="qcm-counter">
        Question ${currentTestIndex + 1}
        <span>sur ${testQuestions.length}</span>
      </div>

      <div class="qcm-score">
        ⭐ ${testScore}
      </div>

    </div>

    <div class="qcm-progress">
      <div
        class="qcm-progress-bar"
        style="width: ${progress}%"
      ></div>
    </div>

    <div class="qcm-question">
      ${current.question}
    </div>

    <div class="qcm-grid">
      ${choicesHtml}
    </div>

    <div
      id="qcm-feedback"
      class="qcm-feedback hidden"
    ></div>

    <button
      id="quit-test"
      class="qcm-back-button"
    >
      ← Quitter le test
    </button>
  `;

  container.appendChild(box);

  document
    .querySelectorAll(".qcm-button")
    .forEach(button => {
      button.addEventListener("click", () => {
        validateQcmAnswer(button);
      });
    });

  document
    .getElementById("quit-test")
    .addEventListener("click", () => {
      showModes(currentChapter);
    });
}

function validateQcmAnswer(selectedButton) {
  const current = testQuestions[currentTestIndex];

  const selectedAnswer =
    selectedButton.dataset.answer;

  const feedback =
    document.getElementById("qcm-feedback");

  const buttons =
    document.querySelectorAll(".qcm-button");

  buttons.forEach(button => {
    button.disabled = true;

    if (
      normalizeAnswer(button.dataset.answer) ===
      normalizeAnswer(current.answer)
    ) {
      button.classList.add("qcm-correct");
    }
  });

  const isCorrect =
    normalizeAnswer(selectedAnswer) ===
    normalizeAnswer(current.answer);

  if (isCorrect) {
    testScore++;

    feedback.innerHTML = `
      <div class="qcm-feedback-title correct">
        ✓ Bonne réponse
      </div>
    `;
  } else {
    selectedButton.classList.add("qcm-wrong");

    feedback.innerHTML = `
      <div class="qcm-feedback-title wrong">
        ✕ Pas tout à fait
      </div>

      <div class="qcm-feedback-answer">
        Bonne réponse :
        <strong>${current.answer}</strong>
      </div>
    `;
  }

  feedback.classList.remove("hidden");

  const nextButton =
    document.createElement("button");

  nextButton.className = "qcm-next-button";

  nextButton.textContent =
    currentTestIndex + 1 === testQuestions.length
      ? "Voir mon résultat"
      : "Question suivante →";

  nextButton.addEventListener("click", () => {
    currentTestIndex++;
    showQcmQuestion();
  });

  feedback.appendChild(nextButton);
}

/* =========================
   OUTIL QUESTION SUIVANTE
========================= */

function addNextTestButton(feedback, nextFunction) {
  const nextButton =
    document.createElement("button");

  nextButton.className =
    "main-button test-next-button";

  nextButton.textContent =
    "Question suivante";

  nextButton.addEventListener("click", () => {
    currentTestIndex++;
    nextFunction();
  });

  feedback.appendChild(nextButton);
}

/* =========================
   FIN TEST
========================= */

function showTestFinished() {
  const total = testQuestions.length;

  const percent =
    total > 0
      ? Math.round((testScore / total) * 100)
      : 0;

  title.textContent = "Test terminé";
  subtitle.textContent = currentChapter.name;

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
      if (currentChapter.content_type === "flags") {
        startFlagTest(currentChapter);
      } else if (currentChapter.direction_mode === "single") {
        startTest(currentChapter, "forward");
      } else {
        showTestDirection();
      }
    });

  document
    .getElementById("back-test")
    .addEventListener("click", () => {
      showModes(currentChapter);
    });
}

/* =========================
   DONNÉES
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

    container.innerHTML =
      "<p>Impossible de charger les questions.</p>";

    return null;
  }

  if (!data || data.length === 0) {
    container.innerHTML =
      "<p>Aucune question dans ce chapitre.</p>";

    return null;
  }

  return data;
}

function buildQuestions(data, direction) {
  const questions = [];

  data.forEach(card => {
    if (
      direction === "forward" ||
      direction === "both"
    ) {
      questions.push({
        question: card.question,
        answer: card.answer
      });
    }

    if (
      (direction === "reverse" ||
        direction === "both") &&
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
   OUTILS
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

function addBackButton(action) {
  const backButton =
    document.createElement("div");

  backButton.className =
    "subject-card back-card";

  backButton.innerHTML = `
    <div class="subject-icon">←</div>
    <div class="subject-name">Retour</div>
  `;

  backButton.addEventListener(
    "click",
    action
  );

  container.appendChild(backButton);
}

function shuffleArray(array) {
  for (
    let i = array.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [array[i], array[j]] = [
      array[j],
      array[i]
    ];
  }
}

function escapeHtmlAttribute(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

loadSubjects();
