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
  testCard.className = "subject-card disabled-card";

  testCard.innerHTML = `
    <div class="subject-icon">🎯</div>
    <div class="subject-name">Test</div>
    <div class="mode-description">
      Bientôt disponible
    </div>
  `;

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
    startReview(currentChapter, "forward");
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
    startReview(currentChapter, "reverse");
  });

  container.appendChild(capitalToCountry);

  const bothDirections = document.createElement("div");
  bothDirections.className = "subject-card";

  bothDirections.innerHTML = `
    <div class="subject-icon">🔀</div>
    <div class="subject-name">Les deux</div>
    <div class="mode-description">
      Mélange pays → capitale et capitale → pays
    </div>
  `;

  bothDirections.addEventListener("click", () => {
    startReview(currentChapter, "both");
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

  const { data, error } = await supabaseClient
    .from("cards")
    .select("*")
    .eq("chapter_id", chapter.id)
    .eq("active", true)
    .order("sort_order");

  if (error) {
    console.error(error);
    container.innerHTML = "<p>Impossible de charger les questions.</p>";
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p>Aucune question dans ce chapitre.</p>";
    return;
  }

  reviewQuestions = [];

  data.forEach(card => {
    if (direction === "forward" || direction === "both") {
      reviewQuestions.push({
        question: card.question,
        answer: card.answer
      });
    }

    if (
      (direction === "reverse" || direction === "both") &&
      card.reverse_question &&
      card.reverse_answer
    ) {
      reviewQuestions.push({
        question: card.reverse_question,
        answer: card.reverse_answer
      });
    }
  });

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
    <button id="quit-review" class="secondary-button">
      ← Retour
    </button>

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
   FIN DE RÉVISION
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
