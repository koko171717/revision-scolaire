// ============================================================
// CONFIGURATION SUPABASE
// ============================================================

const SUPABASE_URL =
  "https://bohstmyjornxpvjwmldk.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_24le4__Z_AASUmxBRyoIGQ_5ccDOucQ";

const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


// ============================================================
// ÉLÉMENTS PRINCIPAUX
// ============================================================

const container =
  document.getElementById("subjects");

const title =
  document.querySelector("h1");

const subtitle =
  document.querySelector("header p");


// ============================================================
// ÉTAT DE NAVIGATION
// ============================================================

let currentSubject = null;
let currentChapter = null;

let allSubjectChapters = [];

let navigationStack = [];


// ============================================================
// RÉVISION
// ============================================================

let reviewQuestions = [];
let currentQuestionIndex = 0;


// ============================================================
// TEST
// ============================================================

let testQuestions = [];
let currentTestIndex = 0;
let testScore = 0;


// ============================================================
// CARTE
// ============================================================

let currentMapCards = [];

let mapOriginalViewBox = null;
let mapCurrentViewBox = null;


// ============================================================
// DÉMARRAGE
// ============================================================

loadSubjects();


// ============================================================
// ACCUEIL
// ============================================================

async function loadSubjects() {

  currentSubject = null;
  currentChapter = null;

  allSubjectChapters = [];
  navigationStack = [];

  title.textContent =
    "Révisions scolaires";

  subtitle.textContent =
    "Choisis une matière";

  container.innerHTML =
    "<p>Chargement...</p>";

  const {
    data,
    error
  } = await supabaseClient
    .from("subjects")
    .select("*")
    .order(
      "sort_order",
      { ascending: true }
    );

  if (error) {

    console.error(error);

    container.innerHTML = `
      <p>
        Impossible de charger les matières.
      </p>
    `;

    return;
  }

  container.innerHTML = "";

  data.forEach(subject => {

    const card =
      document.createElement("div");

    card.className =
      "subject-card";

    card.innerHTML = `
      <div class="subject-icon">
        ${subject.icon || "📚"}
      </div>

      <div class="subject-name">
        ${escapeHtml(subject.name)}
      </div>
    `;

    card.addEventListener(
      "click",
      () => openSubject(subject)
    );

    container.appendChild(card);
  });
}


// ============================================================
// OUVRIR UNE MATIÈRE
// ============================================================

async function openSubject(subject) {

  currentSubject = subject;
  currentChapter = null;

  navigationStack = [];

  title.textContent =
    subject.name;

  subtitle.textContent =
    "Choisis une rubrique";

  container.innerHTML =
    "<p>Chargement...</p>";

  const {
    data,
    error
  } = await supabaseClient
    .from("chapters")
    .select("*")
    .eq(
      "subject_id",
      subject.id
    )
    .order(
      "sort_order",
      { ascending: true }
    );

  if (error) {

    console.error(error);

    container.innerHTML = `
      <p>
        Impossible de charger les chapitres.
      </p>
    `;

    return;
  }

  allSubjectChapters =
    data || [];

  renderChapterLevel(null);
}


// ============================================================
// AFFICHAGE D'UN NIVEAU DE CHAPITRES
// ============================================================

function renderChapterLevel(
  parentChapterId
) {

  container.innerHTML = "";

  const children =
    allSubjectChapters
      .filter(chapter => {

        if (
          parentChapterId === null
        ) {

          return (
            chapter.parent_chapter_id === null
          );
        }

        return (
          Number(
            chapter.parent_chapter_id
          ) ===
          Number(
            parentChapterId
          )
        );
      })
      .sort(
        (a, b) =>
          (a.sort_order || 0) -
          (b.sort_order || 0)
      );


  // ----------------------------------------------------------
  // TITRE
  // ----------------------------------------------------------

  if (
    navigationStack.length === 0
  ) {

    title.textContent =
      currentSubject.name;

    subtitle.textContent =
      "Choisis une rubrique";

  } else {

    const currentParent =
      navigationStack[
        navigationStack.length - 1
      ];

    title.textContent =
      currentParent.name;

    subtitle.textContent =
      "Choisis une partie";
  }


  // ----------------------------------------------------------
  // RETOUR
  // ----------------------------------------------------------

  addBackButton(() => {

    if (
      navigationStack.length === 0
    ) {

      loadSubjects();
      return;
    }

    navigationStack.pop();

    if (
      navigationStack.length === 0
    ) {

      renderChapterLevel(null);

    } else {

      const previousParent =
        navigationStack[
          navigationStack.length - 1
        ];

      renderChapterLevel(
        previousParent.id
      );
    }
  });


  // ----------------------------------------------------------
  // AUCUN CHAPITRE
  // ----------------------------------------------------------

  if (
    children.length === 0
  ) {

    const empty =
      document.createElement("div");

    empty.className =
      "subject-card disabled-card";

    empty.innerHTML = `
      <div class="subject-icon">
        📭
      </div>

      <div class="subject-name">
        Aucun contenu pour le moment
      </div>
    `;

    container.appendChild(empty);

    return;
  }


  // ----------------------------------------------------------
  // CARTES
  // ----------------------------------------------------------

  children.forEach(chapter => {

    const hasChildren =
      allSubjectChapters.some(
        possibleChild =>
          Number(
            possibleChild.parent_chapter_id
          ) === Number(chapter.id)
      );


    const card =
      document.createElement("div");

    card.className =
      "subject-card";


    const icon =
      getChapterIcon(
        chapter,
        hasChildren
      );


    let description = "";

    if (hasChildren) {

      description =
        "Ouvrir";

    } else if (
      chapter.content_type === "map"
    ) {

      description =
        "Carte interactive";

    } else if (
      chapter.content_type === "flags"
    ) {

      description =
        "Drapeaux";

    } else if (
      chapter.test_mode === "qcm"
    ) {

      description =
        "Révision + QCM";

    } else if (
      chapter.test_mode === "written"
    ) {

      description =
        "Cartes + test écrit";
    }


    card.innerHTML = `
      <div class="subject-icon">
        ${icon}
      </div>

      <div class="subject-name">
        ${escapeHtml(chapter.name)}
      </div>

      ${
        description
          ? `
            <div class="mode-description">
              ${description}
            </div>
          `
          : ""
      }
    `;


    card.addEventListener(
      "click",
      () => {

        if (hasChildren) {

          navigationStack.push(
            chapter
          );

          renderChapterLevel(
            chapter.id
          );

        } else {

          showModes(
            chapter
          );
        }
      }
    );


    container.appendChild(card);
  });
}


// ============================================================
// ICÔNES
// ============================================================

function getChapterIcon(
  chapter,
  hasChildren
) {

  if (
    chapter.name === "Vocabulaire"
  ) {
    return "🔤";
  }

  if (
    chapter.name === "Grammaire"
  ) {
    return "✏️";
  }

  if (
    /^TS\d+/i.test(
      chapter.name
    )
  ) {
    return "📝";
  }

  if (
    chapter.name.includes(
      "Unit"
    )
  ) {
    return "📚";
  }

  if (
    chapter.name === "Family"
  ) {
    return "👨‍👩‍👧";
  }

  if (
    chapter.name === "Housework"
  ) {
    return "🧹";
  }

  if (
    chapter.name === "Home objects"
  ) {
    return "🏠";
  }

  if (
    chapter.name ===
    "Words and phrases"
  ) {
    return "💬";
  }

  if (
    chapter.name ===
    "Everyday English"
  ) {
    return "🗣️";
  }

  if (
    chapter.name
      .toLowerCase()
      .includes("toute")
  ) {
    return "🎯";
  }

  if (
    chapter.content_type === "flags"
  ) {
    return "🏳️";
  }

  if (
    chapter.content_type === "map"
  ) {
    return "🗺️";
  }

  if (hasChildren) {
    return "📂";
  }

  return "📘";
}


// ============================================================
// CHOIX RÉVISION / TEST
// ============================================================

function showModes(chapter) {

  currentChapter = chapter;

  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Choisis ton mode";

  container.innerHTML = "";


  addBackButton(() => {

    if (
      navigationStack.length === 0
    ) {

      renderChapterLevel(null);

    } else {

      const parent =
        navigationStack[
          navigationStack.length - 1
        ];

      renderChapterLevel(
        parent.id
      );
    }
  });


  // ----------------------------------------------------------
  // RÉVISION
  // ----------------------------------------------------------

  const revisionCard =
    document.createElement("div");

  revisionCard.className =
    "subject-card";


  if (
    chapter.content_type === "flags"
  ) {

    revisionCard.innerHTML = `
      <div class="subject-icon">
        🏳️
      </div>

      <div class="subject-name">
        Révision
      </div>

      <div class="mode-description">
        Drapeau → pays
      </div>
    `;

  } else if (
    chapter.content_type === "map"
  ) {

    revisionCard.innerHTML = `
      <div class="subject-icon">
        🗺️
      </div>

      <div class="subject-name">
        Révision
      </div>

      <div class="mode-description">
        Retrouve les pays sur la carte
      </div>
    `;

  } else {

    revisionCard.innerHTML = `
      <div class="subject-icon">
        📚
      </div>

      <div class="subject-name">
        Révision
      </div>

      <div class="mode-description">
        Cartes de révision
      </div>
    `;
  }


  revisionCard.addEventListener(
    "click",
    () => {

      if (
        chapter.content_type ===
        "flags"
      ) {

        startFlagReview(
          chapter
        );

      } else if (
        chapter.content_type ===
        "map"
      ) {

        startMapReview(
          chapter
        );

      } else if (
        chapter.direction_mode ===
        "bidirectional"
      ) {

        showDirectionChoice(
          "review"
        );

      } else {

        startReview(
          chapter,
          "forward"
        );
      }
    }
  );


  container.appendChild(
    revisionCard
  );


  // ----------------------------------------------------------
  // TEST
  // ----------------------------------------------------------

  const testCard =
    document.createElement("div");


  if (
    chapter.test_mode ===
    "disabled"
  ) {

    testCard.className =
      "subject-card disabled-card";

    testCard.innerHTML = `
      <div class="subject-icon">
        🎯
      </div>

      <div class="subject-name">
        Test
      </div>

      <div class="mode-description">
        Pas de test disponible
      </div>
    `;

  } else {

    testCard.className =
      "subject-card";


    let description =
      "Teste tes connaissances";


    if (
      chapter.test_mode === "written"
    ) {

      description =
        "Écris les réponses";

    } else if (
      chapter.test_mode === "qcm"
    ) {

      description =
        "Choisis la bonne réponse";

    } else if (
      chapter.content_type ===
      "flags"
    ) {

      description =
        "Choisis le bon drapeau";

    } else if (
      chapter.content_type ===
      "map"
    ) {

      description =
        "Retrouve 20 pays";
    }


    testCard.innerHTML = `
      <div class="subject-icon">
        🎯
      </div>

      <div class="subject-name">
        Test
      </div>

      <div class="mode-description">
        ${description}
      </div>
    `;


    testCard.addEventListener(
      "click",
      () => {

        if (
          chapter.content_type ===
          "flags"
        ) {

          startFlagTest(
            chapter
          );

        } else if (
          chapter.content_type ===
          "map"
        ) {

          startMapTest(
            chapter
          );

        } else if (
          chapter.direction_mode ===
          "bidirectional"
        ) {

          showDirectionChoice(
            "test"
          );

        } else {

          startTest(
            chapter,
            "forward"
          );
        }
      }
    );
  }


  container.appendChild(
    testCard
  );
}


// ============================================================
// CHOIX DU SENS
// ============================================================

function showDirectionChoice(mode) {

  title.textContent =
    currentChapter.name;

  subtitle.textContent =
    mode === "review"
      ? "Choisis le sens de révision"
      : "Choisis le sens du test";

  container.innerHTML = "";


  addBackButton(() => {
    showModes(
      currentChapter
    );
  });


  const isLanguage =
    ["Anglais", "Allemand", "Français"]
      .includes(
        currentSubject?.name
      );


  const choices = [

    {
      direction:
        "forward",

      icon:
        "➡️",

      title:
        isLanguage
          ? getForwardLanguageLabel()
          : "Sens normal",

      description:
        isLanguage
          ? getForwardLanguageExample()
          : "Question → réponse"
    },

    {
      direction:
        "reverse",

      icon:
        "⬅️",

      title:
        isLanguage
          ? getReverseLanguageLabel()
          : "Sens inverse",

      description:
        isLanguage
          ? getReverseLanguageExample()
          : "Réponse → question"
    },

    {
      direction:
        "both",

      icon:
        "🔀",

      title:
        "Les deux",

      description:
        "Mélange les deux sens"
    }
  ];


  choices.forEach(choice => {

    const card =
      document.createElement("div");

    card.className =
      "subject-card";

    card.innerHTML = `
      <div class="subject-icon">
        ${choice.icon}
      </div>

      <div class="subject-name">
        ${choice.title}
      </div>

      <div class="mode-description">
        ${choice.description}
      </div>
    `;


    card.addEventListener(
      "click",
      () => {

        if (
          mode === "review"
        ) {

          startReview(
            currentChapter,
            choice.direction
          );

        } else {

          startTest(
            currentChapter,
            choice.direction
          );
        }
      }
    );


    container.appendChild(card);
  });
}


// ============================================================
// LIBELLÉS LANGUES
// ============================================================

function getForwardLanguageLabel() {

  if (
    currentSubject?.name ===
    "Anglais"
  ) {
    return "Anglais → Français";
  }

  if (
    currentSubject?.name ===
    "Allemand"
  ) {
    return "Allemand → Français";
  }

  return "Question → réponse";
}


function getReverseLanguageLabel() {

  if (
    currentSubject?.name ===
    "Anglais"
  ) {
    return "Français → Anglais";
  }

  if (
    currentSubject?.name ===
    "Allemand"
  ) {
    return "Français → Allemand";
  }

  return "Réponse → question";
}


function getForwardLanguageExample() {

  if (
    currentSubject?.name ===
    "Anglais"
  ) {
    return "Ex. mother → mère";
  }

  if (
    currentSubject?.name ===
    "Allemand"
  ) {
    return "Mot allemand → français";
  }

  return "Question → réponse";
}


function getReverseLanguageExample() {

  if (
    currentSubject?.name ===
    "Anglais"
  ) {
    return "Ex. mère → mother";
  }

  if (
    currentSubject?.name ===
    "Allemand"
  ) {
    return "Français → mot allemand";
  }

  return "Réponse → question";
}


// ============================================================
// CHARGEMENT DES CARTES
// ============================================================

async function loadCards(chapter) {

  const {
    data,
    error
  } = await supabaseClient
    .from("cards")
    .select("*")
    .eq(
      "chapter_id",
      chapter.id
    )
    .eq(
      "active",
      true
    )
    .order(
      "sort_order",
      { ascending: true }
    );


  if (error) {

    console.error(error);

    container.innerHTML = `
      <p>
        Impossible de charger les questions.
      </p>
    `;

    return null;
  }


  if (
    !data ||
    data.length === 0
  ) {

    container.innerHTML = `
      <div class="review-box">

        <div class="review-question">
          Aucun contenu pour le moment.
        </div>

        <button
          id="empty-back"
          class="secondary-button"
        >
          ← Retour
        </button>

      </div>
    `;

    document
      .getElementById(
        "empty-back"
      )
      .addEventListener(
        "click",
        () =>
          showModes(chapter)
      );

    return null;
  }


  return data;
}


// ============================================================
// CONSTRUCTION QUESTIONS
// ============================================================

function buildQuestions(
  cards,
  direction
) {

  const questions = [];


  cards.forEach(card => {

    if (
      direction === "forward" ||
      direction === "both"
    ) {

      questions.push({
        question:
          card.question,

        answer:
          card.answer,

        card
      });
    }


    if (
      (
        direction === "reverse" ||
        direction === "both"
      ) &&
      card.reverse_question &&
      card.reverse_answer
    ) {

      questions.push({
        question:
          card.reverse_question,

        answer:
          card.reverse_answer,

        card
      });
    }
  });


  return questions;
}


// ============================================================
// RÉVISION TEXTE
// ============================================================

async function startReview(
  chapter,
  direction
) {

  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Mode Révision";

  container.innerHTML =
    "<p>Chargement...</p>";


  const cards =
    await loadCards(chapter);

  if (!cards) return;


  reviewQuestions =
    buildQuestions(
      cards,
      direction
    );


  shuffleArray(
    reviewQuestions
  );


  currentQuestionIndex = 0;

  showReviewQuestion(
    direction
  );
}


function showReviewQuestion(
  direction
) {

  if (
    currentQuestionIndex >=
    reviewQuestions.length
  ) {

    showReviewFinished(
      direction
    );

    return;
  }


  const current =
    reviewQuestions[
      currentQuestionIndex
    ];


  title.textContent =
    currentChapter.name;

  subtitle.textContent = `
    Question
    ${currentQuestionIndex + 1}
    sur
    ${reviewQuestions.length}
  `;


  container.innerHTML = "";


  const box =
    document.createElement("div");

  box.className =
    "review-box";


  box.innerHTML = `

    <div class="review-question">
      ${escapeHtml(
        current.question
      )}
    </div>


    <button
      id="show-answer"
      class="main-button"
    >
      Voir la réponse
    </button>


    <div
      id="answer-area"
      class="hidden"
    >

      <div class="review-answer">
        ${escapeHtml(
          current.answer
        )}
      </div>


      <div class="review-actions">

        <button
          id="wrong-button"
          class="review-button"
        >
          ❌ À revoir
        </button>

        <button
          id="correct-button"
          class="review-button"
        >
          ✅ Je savais
        </button>

      </div>

    </div>


    <button
      id="quit-review"
      class="secondary-button review-back-button"
    >
      ← Quitter la révision
    </button>
  `;


  container.appendChild(box);


  document
    .getElementById(
      "show-answer"
    )
    .addEventListener(
      "click",
      () => {

        document
          .getElementById(
            "answer-area"
          )
          .classList.remove(
            "hidden"
          );

        document
          .getElementById(
            "show-answer"
          )
          .classList.add(
            "hidden"
          );
      }
    );


  document
    .getElementById(
      "correct-button"
    )
    .addEventListener(
      "click",
      () => {

        currentQuestionIndex++;

        showReviewQuestion(
          direction
        );
      }
    );


  document
    .getElementById(
      "wrong-button"
    )
    .addEventListener(
      "click",
      () => {

        const missed =
          reviewQuestions[
            currentQuestionIndex
          ];

        reviewQuestions.push(
          missed
        );

        currentQuestionIndex++;

        showReviewQuestion(
          direction
        );
      }
    );


  document
    .getElementById(
      "quit-review"
    )
    .addEventListener(
      "click",
      () => {

        if (
          currentChapter
            .direction_mode ===
          "bidirectional"
        ) {

          showDirectionChoice(
            "review"
          );

        } else {

          showModes(
            currentChapter
          );
        }
      }
    );
}


// ============================================================
// FIN RÉVISION
// ============================================================

function showReviewFinished(
  direction = "forward"
) {

  title.textContent =
    currentChapter.name;

  subtitle.textContent =
    "Révision terminée";

  container.innerHTML = `
    <div class="review-box">

      <div class="subject-icon">
        🎉
      </div>

      <div class="review-question">
        Bravo !
      </div>

      <div class="mode-description">
        Tu as terminé cette révision.
      </div>

      <button
        id="restart-review"
        class="main-button"
      >
        Nouvelle révision
      </button>

      <button
        id="back-modes"
        class="secondary-button"
      >
        Retour au chapitre
      </button>

    </div>
  `;


  document
    .getElementById(
      "restart-review"
    )
    .addEventListener(
      "click",
      () => {

        if (
          currentChapter
            .content_type ===
          "flags"
        ) {

          startFlagReview(
            currentChapter
          );

        } else if (
          currentChapter
            .content_type ===
          "map"
        ) {

          startMapReview(
            currentChapter
          );

        } else {

          startReview(
            currentChapter,
            direction
          );
        }
      }
    );


  document
    .getElementById(
      "back-modes"
    )
    .addEventListener(
      "click",
      () =>
        showModes(
          currentChapter
        )
    );
}


// ============================================================
// TEST TEXTE OU QCM
// ============================================================

async function startTest(
  chapter,
  direction
) {

  if (
    chapter.test_mode === "qcm"
  ) {

    startQcmTest(
      chapter
    );

    return;
  }


  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Test écrit";

  container.innerHTML =
    "<p>Chargement...</p>";


  const cards =
    await loadCards(chapter);

  if (!cards) return;


  testQuestions =
    buildQuestions(
      cards,
      direction
    );


  shuffleArray(
    testQuestions
  );


  testQuestions =
    testQuestions.slice(
      0,
      20
    );


  currentTestIndex = 0;
  testScore = 0;


  showWrittenTestQuestion(
    direction
  );
}


// ============================================================
// TEST ÉCRIT
// ============================================================

function showWrittenTestQuestion(
  direction
) {

  if (
    currentTestIndex >=
    testQuestions.length
  ) {

    showTestFinished();

    return;
  }


  const current =
    testQuestions[
      currentTestIndex
    ];


  const progress =
    ((currentTestIndex + 1) /
      testQuestions.length) *
    100;


  title.textContent =
    currentChapter.name;

  subtitle.textContent =
    "Test écrit";


  container.innerHTML = `
    <div class="review-box">

      <div class="qcm-topbar">

        <div class="qcm-counter">
          Question
          ${currentTestIndex + 1}
          <span>
            sur
            ${testQuestions.length}
          </span>
        </div>

        <div class="qcm-score">
          ⭐ ${testScore}
        </div>

      </div>


      <div class="qcm-progress">

        <div
          class="qcm-progress-bar"
          style="
            width:${progress}%
          "
        ></div>

      </div>


      <div class="review-question">
        ${escapeHtml(
          current.question
        )}
      </div>


      <input
        id="written-answer"
        type="text"
        autocomplete="off"
        autocapitalize="none"
        spellcheck="false"
        placeholder="Écris ta réponse"
        style="
          width:100%;
          padding:18px;
          font-size:20px;
          border:2px solid #d1d5db;
          border-radius:16px;
          margin-bottom:18px;
        "
      />


      <button
        id="validate-written"
        class="main-button"
      >
        Valider
      </button>


      <div
        id="written-feedback"
        class="hidden"
        style="
          margin-top:25px;
          font-size:19px;
          font-weight:700;
        "
      ></div>


      <button
        id="next-written"
        class="main-button hidden"
        style="margin-top:20px;"
      >
        Question suivante
      </button>


      <button
        id="quit-test"
        class="secondary-button"
      >
        ← Quitter le test
      </button>

    </div>
  `;


  const input =
    document.getElementById(
      "written-answer"
    );

  input.focus();


  input.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter"
      ) {

        if (
          !document
            .getElementById(
              "validate-written"
            )
            .classList
            .contains("hidden")
        ) {

          validateWrittenAnswer();

        } else {

          currentTestIndex++;

          showWrittenTestQuestion(
            direction
          );
        }
      }
    }
  );


  document
    .getElementById(
      "validate-written"
    )
    .addEventListener(
      "click",
      validateWrittenAnswer
    );


  document
    .getElementById(
      "next-written"
    )
    .addEventListener(
      "click",
      () => {

        currentTestIndex++;

        showWrittenTestQuestion(
          direction
        );
      }
    );


  document
    .getElementById(
      "quit-test"
    )
    .addEventListener(
      "click",
      () => {

        if (
          currentChapter
            .direction_mode ===
          "bidirectional"
        ) {

          showDirectionChoice(
            "test"
          );

        } else {

          showModes(
            currentChapter
          );
        }
      }
    );
}


// ============================================================
// VALIDATION TEST ÉCRIT
// ============================================================

function validateWrittenAnswer() {

  const current =
    testQuestions[
      currentTestIndex
    ];


  const input =
    document.getElementById(
      "written-answer"
    );


  const feedback =
    document.getElementById(
      "written-feedback"
    );


  const validateButton =
    document.getElementById(
      "validate-written"
    );


  const nextButton =
    document.getElementById(
      "next-written"
    );


  const userAnswer =
    input.value.trim();


  if (!userAnswer) {
    return;
  }


  const correct =
    isAcceptedWrittenAnswer(
      userAnswer,
      current.answer
    );


  input.disabled = true;

  validateButton.classList.add(
    "hidden"
  );

  feedback.classList.remove(
    "hidden"
  );

  nextButton.classList.remove(
    "hidden"
  );


  if (correct) {

    testScore++;

    feedback.innerHTML = `
      ✅ Correct !
    `;

    feedback.style.color =
      "#15803d";

  } else {

    feedback.innerHTML = `
      ❌ Réponse attendue :
      <br>
      <strong>
        ${escapeHtml(
          current.answer
        )}
      </strong>
    `;

    feedback.style.color =
      "#b91c1c";
  }
}


// ============================================================
// TOLÉRANCE DES RÉPONSES ÉCRITES
// ============================================================

function isAcceptedWrittenAnswer(
  userAnswer,
  expectedAnswer
) {

  const normalizedUser =
    normalizeAnswer(
      userAnswer
    );


  const normalizedExpected =
    normalizeAnswer(
      expectedAnswer
    );


  if (
    normalizedUser ===
    normalizedExpected
  ) {
    return true;
  }


  // Permet plusieurs traductions :
  // ex. "duvet, couette"
  // ou "Va-t-en ! / Allez-vous en !"

  const alternatives =
    String(expectedAnswer)
      .split(/\s*\/\s*|,\s*/)
      .map(
        alternative =>
          normalizeAnswer(
            alternative
          )
      )
      .filter(Boolean);


  return alternatives.includes(
    normalizedUser
  );
}


function normalizeAnswer(value) {

  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[’']/g,
      ""
    )
    .replace(
      /[.!?,;:()[\]{}]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


// ============================================================
// QCM
// ============================================================

async function startQcmTest(
  chapter
) {

  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Test QCM";

  container.innerHTML =
    "<p>Chargement...</p>";


  const cards =
    await loadCards(chapter);

  if (!cards) return;


  testQuestions =
    cards
      .filter(card =>
        card.wrong_answer_1 &&
        card.wrong_answer_2 &&
        card.wrong_answer_3
      )
      .map(card => ({
        question:
          card.question,

        answer:
          card.answer,

        options: [
          card.answer,
          card.wrong_answer_1,
          card.wrong_answer_2,
          card.wrong_answer_3
        ]
      }));


  shuffleArray(
    testQuestions
  );


  testQuestions =
    testQuestions.slice(
      0,
      20
    );


  currentTestIndex = 0;
  testScore = 0;


  showQcmQuestion();
}


// ============================================================
// AFFICHAGE QCM
// ============================================================

function showQcmQuestion() {

  if (
    currentTestIndex >=
    testQuestions.length
  ) {

    showTestFinished();

    return;
  }


  const current =
    testQuestions[
      currentTestIndex
    ];


  const options =
    [...current.options];


  shuffleArray(options);


  const letters =
    ["A", "B", "C", "D"];


  const progress =
    ((currentTestIndex + 1) /
      testQuestions.length) *
    100;


  container.innerHTML = `

    <div class="review-box qcm-card">

      <div class="qcm-topbar">

        <div class="qcm-counter">
          Question
          ${currentTestIndex + 1}

          <span>
            sur
            ${testQuestions.length}
          </span>
        </div>

        <div class="qcm-score">
          ⭐ ${testScore}
        </div>

      </div>


      <div class="qcm-progress">

        <div
          class="qcm-progress-bar"
          style="
            width:${progress}%
          "
        ></div>

      </div>


      <div class="review-question">
        ${escapeHtml(
          current.question
        )}
      </div>


      <div
        id="qcm-options"
        class="qcm-grid"
      >

        ${options
          .map(
            (option, index) => `

              <button
                class="qcm-choice"
                data-answer="${encodeURIComponent(
                  option
                )}"
              >

                <span
                  class="qcm-letter"
                >
                  ${letters[index]}
                </span>

                <span>
                  ${escapeHtml(
                    option
                  )}
                </span>

              </button>
            `
          )
          .join("")}

      </div>


      <div
        id="qcm-feedback"
        class="hidden"
        style="
          margin-top:22px;
          font-size:18px;
          font-weight:700;
        "
      ></div>


      <button
        id="qcm-next"
        class="main-button hidden"
        style="margin-top:20px;"
      >
        Question suivante
      </button>


      <button
        id="quit-qcm"
        class="secondary-button"
      >
        ← Quitter le test
      </button>

    </div>
  `;


  document
    .querySelectorAll(
      ".qcm-choice"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          answerQcm(
            button,
            current.answer
          );
        }
      );
    });


  document
    .getElementById(
      "qcm-next"
    )
    .addEventListener(
      "click",
      () => {

        currentTestIndex++;

        showQcmQuestion();
      }
    );


  document
    .getElementById(
      "quit-qcm"
    )
    .addEventListener(
      "click",
      () =>
        showModes(
          currentChapter
        )
    );
}


// ============================================================
// RÉPONSE QCM
// ============================================================

function answerQcm(
  selectedButton,
  correctAnswer
) {

  const buttons =
    document.querySelectorAll(
      ".qcm-choice"
    );


  buttons.forEach(button => {

    button.disabled = true;


    const answer =
      decodeURIComponent(
        button.dataset.answer
      );


    if (
      answer === correctAnswer
    ) {

      button.classList.add(
        "qcm-correct"
      );
    }
  });


  const selectedAnswer =
    decodeURIComponent(
      selectedButton.dataset.answer
    );


  const feedback =
    document.getElementById(
      "qcm-feedback"
    );


  feedback.classList.remove(
    "hidden"
  );


  if (
    selectedAnswer ===
    correctAnswer
  ) {

    testScore++;

    feedback.textContent =
      "✅ Correct !";

    feedback.style.color =
      "#15803d";

  } else {

    selectedButton
      .classList
      .add(
        "qcm-wrong"
      );

    feedback.innerHTML = `
      ❌ Réponse :
      <strong>
        ${escapeHtml(
          correctAnswer
        )}
      </strong>
    `;

    feedback.style.color =
      "#b91c1c";
  }


  document
    .getElementById(
      "qcm-next"
    )
    .classList.remove(
      "hidden"
    );
}


// ============================================================
// DRAPEAUX - RÉVISION
// ============================================================

async function startFlagReview(
  chapter
) {

  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Drapeau → pays";

  container.innerHTML =
    "<p>Chargement...</p>";


  const cards =
    await loadCards(chapter);

  if (!cards) return;


  reviewQuestions =
    cards
      .filter(card =>
        card.image_url
      )
      .map(card => ({
        question:
          card.question,

        answer:
          card.answer,

        image_url:
          card.image_url
      }));


  shuffleArray(
    reviewQuestions
  );


  currentQuestionIndex = 0;

  showFlagReviewQuestion();
}


function showFlagReviewQuestion() {

  if (
    currentQuestionIndex >=
    reviewQuestions.length
  ) {

    showReviewFinished();

    return;
  }


  const current =
    reviewQuestions[
      currentQuestionIndex
    ];


  subtitle.textContent = `
    Question
    ${currentQuestionIndex + 1}
    sur
    ${reviewQuestions.length}
  `;


  container.innerHTML = `

    <div class="review-box">

      <div class="review-question">
        Quel pays correspond
        à ce drapeau ?
      </div>


      <div class="flag-display">

        <img
          src="${current.image_url}"
          class="flag-main-image"
          alt="Drapeau"
        >

      </div>


      <button
        id="show-flag-answer"
        class="main-button"
      >
        Voir la réponse
      </button>


      <div
        id="flag-answer-area"
        class="hidden"
      >

        <div class="review-answer">
          ${escapeHtml(
            current.answer
          )}
        </div>


        <div class="review-actions">

          <button
            id="flag-wrong"
            class="review-button"
          >
            ❌ À revoir
          </button>

          <button
            id="flag-correct"
            class="review-button"
          >
            ✅ Je savais
          </button>

        </div>

      </div>


      <button
        id="quit-flag-review"
        class="secondary-button review-back-button"
      >
        ← Quitter
      </button>

    </div>
  `;


  document
    .getElementById(
      "show-flag-answer"
    )
    .addEventListener(
      "click",
      () => {

        document
          .getElementById(
            "flag-answer-area"
          )
          .classList.remove(
            "hidden"
          );

        document
          .getElementById(
            "show-flag-answer"
          )
          .classList.add(
            "hidden"
          );
      }
    );


  document
    .getElementById(
      "flag-correct"
    )
    .addEventListener(
      "click",
      () => {

        currentQuestionIndex++;

        showFlagReviewQuestion();
      }
    );


  document
    .getElementById(
      "flag-wrong"
    )
    .addEventListener(
      "click",
      () => {

        reviewQuestions.push(
          reviewQuestions[
            currentQuestionIndex
          ]
        );

        currentQuestionIndex++;

        showFlagReviewQuestion();
      }
    );


  document
    .getElementById(
      "quit-flag-review"
    )
    .addEventListener(
      "click",
      () =>
        showModes(
          currentChapter
        )
    );
}


// ============================================================
// DRAPEAUX - TEST
// Pays -> 4 drapeaux
// ============================================================

async function startFlagTest(
  chapter
) {

  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Test drapeaux";

  container.innerHTML =
    "<p>Chargement...</p>";


  const cards =
    await loadCards(chapter);

  if (!cards) return;


  const validCards =
    cards.filter(card =>
      card.image_url
    );


  testQuestions =
    [...validCards];


  shuffleArray(
    testQuestions
  );


  testQuestions =
    testQuestions.slice(
      0,
      20
    );


  currentMapCards =
    validCards;

  currentTestIndex = 0;
  testScore = 0;


  showFlagTestQuestion();
}


function showFlagTestQuestion() {

  if (
    currentTestIndex >=
    testQuestions.length
  ) {

    showTestFinished();

    return;
  }


  const correct =
    testQuestions[
      currentTestIndex
    ];


  const wrongCards =
    currentMapCards
      .filter(card =>
        card.id !== correct.id
      );


  shuffleArray(
    wrongCards
  );


  const options = [
    correct,
    ...wrongCards.slice(
      0,
      3
    )
  ];


  shuffleArray(options);


  const progress =
    ((currentTestIndex + 1) /
      testQuestions.length) *
    100;


  container.innerHTML = `

    <div class="review-box">

      <div class="qcm-topbar">

        <div class="qcm-counter">
          Question
          ${currentTestIndex + 1}

          <span>
            sur
            ${testQuestions.length}
          </span>
        </div>

        <div class="qcm-score">
          ⭐ ${testScore}
        </div>

      </div>


      <div class="qcm-progress">

        <div
          class="qcm-progress-bar"
          style="
            width:${progress}%
          "
        ></div>

      </div>


      <div class="review-question">
        Quel est le drapeau de :
        <br>
        <strong>
          ${escapeHtml(
            correct.answer
          )}
        </strong>
      </div>


      <div
        class="flag-qcm-grid"
        id="flag-options"
      >

        ${options
          .map(card => `

            <button
              class="flag-choice-button"
              data-id="${card.id}"
            >

              <img
                src="${card.image_url}"
                alt="Drapeau"
              >

            </button>
          `)
          .join("")}

      </div>


      <div
        id="flag-feedback"
        class="hidden"
        style="
          margin-top:20px;
          font-weight:700;
        "
      ></div>


      <button
        id="flag-next"
        class="main-button hidden"
        style="margin-top:20px;"
      >
        Question suivante
      </button>


      <button
        id="quit-flag-test"
        class="secondary-button"
      >
        ← Quitter
      </button>

    </div>
  `;


  document
    .querySelectorAll(
      ".flag-choice-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const selectedId =
            Number(
              button.dataset.id
            );


          const allButtons =
            document.querySelectorAll(
              ".flag-choice-button"
            );


          allButtons.forEach(
            optionButton => {

              optionButton.disabled =
                true;


              if (
                Number(
                  optionButton.dataset.id
                ) ===
                Number(correct.id)
              ) {

                optionButton.classList.add(
                  "qcm-correct"
                );
              }
            }
          );


          const feedback =
            document.getElementById(
              "flag-feedback"
            );


          feedback.classList.remove(
            "hidden"
          );


          if (
            selectedId ===
            Number(correct.id)
          ) {

            testScore++;

            feedback.textContent =
              "✅ Correct !";

            feedback.style.color =
              "#15803d";

          } else {

            button.classList.add(
              "qcm-wrong"
            );

            feedback.textContent =
              "❌ Mauvais drapeau";

            feedback.style.color =
              "#b91c1c";
          }


          document
            .getElementById(
              "flag-next"
            )
            .classList.remove(
              "hidden"
            );
        }
      );
    });


  document
    .getElementById(
      "flag-next"
    )
    .addEventListener(
      "click",
      () => {

        currentTestIndex++;

        showFlagTestQuestion();
      }
    );


  document
    .getElementById(
      "quit-flag-test"
    )
    .addEventListener(
      "click",
      () =>
        showModes(
          currentChapter
        )
    );
}


// ============================================================
// CARTE - RÉVISION
// ============================================================

async function startMapReview(
  chapter
) {

  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Révision carte";

  container.innerHTML =
    "<p>Chargement...</p>";


  const cards =
    await loadCards(chapter);

  if (!cards) return;


  currentMapCards =
    cards.filter(card =>
      card.map_code
    );


  reviewQuestions =
    [...currentMapCards];


  shuffleArray(
    reviewQuestions
  );


  currentQuestionIndex = 0;

  showMapReviewQuestion();
}


async function showMapReviewQuestion() {

  if (
    currentQuestionIndex >=
    reviewQuestions.length
  ) {

    showReviewFinished();

    return;
  }


  const current =
    reviewQuestions[
      currentQuestionIndex
    ];


  subtitle.textContent = `
    Question
    ${currentQuestionIndex + 1}
    sur
    ${reviewQuestions.length}
  `;


  renderMapCard(
    current,
    "review"
  );


  await loadInteractiveMap(
    current.map_code,
    "review"
  );
}


// ============================================================
// CARTE - TEST
// ============================================================

async function startMapTest(
  chapter
) {

  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Test carte";

  container.innerHTML =
    "<p>Chargement...</p>";


  const cards =
    await loadCards(chapter);

  if (!cards) return;


  currentMapCards =
    cards.filter(card =>
      card.map_code
    );


  testQuestions =
    [...currentMapCards];


  shuffleArray(
    testQuestions
  );


  testQuestions =
    testQuestions.slice(
      0,
      20
    );


  currentTestIndex = 0;
  testScore = 0;


  showMapTestQuestion();
}


async function showMapTestQuestion() {

  if (
    currentTestIndex >=
    testQuestions.length
  ) {

    showTestFinished();

    return;
  }


  const current =
    testQuestions[
      currentTestIndex
    ];


  renderMapCard(
    current,
    "test"
  );


  await loadInteractiveMap(
    current.map_code,
    "test"
  );
}


// ============================================================
// CARTE - INTERFACE
// ============================================================

function renderMapCard(
  current,
  mode
) {

  const index =
    mode === "review"
      ? currentQuestionIndex
      : currentTestIndex;


  const total =
    mode === "review"
      ? reviewQuestions.length
      : testQuestions.length;


  container.innerHTML = `

    <div class="map-card">

      ${
        mode === "test"
          ? `
            <div class="qcm-topbar">

              <div class="qcm-counter">
                Question
                ${index + 1}

                <span>
                  sur ${total}
                </span>
              </div>

              <div class="qcm-score">
                ⭐ ${testScore}
              </div>

            </div>
          `
          : ""
      }


      <div class="map-instruction">
        ${
          mode === "test"
            ? "Clique sur :"
            : "Trouve :"
        }
      </div>


      <div class="map-country-name">
        ${escapeHtml(
          current.answer
        )}
      </div>


      <div class="map-controls">

        <button
          id="map-zoom-out"
          class="map-control-button"
        >
          −
        </button>

        <button
          id="map-reset"
          class="
            map-control-button
            map-reset-button
          "
        >
          Recentrer
        </button>

        <button
          id="map-zoom-in"
          class="map-control-button"
        >
          +
        </button>

      </div>


      <div
        id="map-container"
        class="europe-map-container"
      >
        Chargement de la carte...
      </div>


      <div
        id="map-feedback"
        class="hidden"
        style="
          margin-top:18px;
          text-align:center;
          font-weight:700;
          font-size:18px;
        "
      ></div>


      <button
        id="quit-map"
        class="secondary-button"
        style="margin-top:20px;"
      >
        ← Quitter
      </button>

    </div>
  `;


  document
    .getElementById(
      "quit-map"
    )
    .addEventListener(
      "click",
      () =>
        showModes(
          currentChapter
        )
    );
}


// ============================================================
// CHARGEMENT SVG
// ============================================================

async function loadInteractiveMap(
  correctCode,
  mode
) {

  const mapContainer =
    document.getElementById(
      "map-container"
    );


  try {

    const response =
      await fetch(
        "europe-map.svg"
      );


    if (!response.ok) {

      throw new Error(
        "europe-map.svg introuvable"
      );
    }


    const svgText =
      await response.text();


    mapContainer.innerHTML =
      svgText;


    const svg =
      mapContainer.querySelector(
        "svg"
      );


    if (!svg) {

      throw new Error(
        "SVG invalide"
      );
    }


    prepareEuropeMap(svg);

    setupMapNavigation(svg);

    setupMapClicks(
      svg,
      correctCode,
      mode
    );


  } catch (error) {

    console.error(error);

    mapContainer.innerHTML = `
      <p>
        Impossible de charger la carte.
      </p>
    `;
  }
}


// ============================================================
// PRÉPARER LA CARTE
// ============================================================

function prepareEuropeMap(svg) {

  svg.removeAttribute(
    "width"
  );

  svg.removeAttribute(
    "height"
  );


  svg.classList.add(
    "interactive-europe-map"
  );


  svg.setAttribute(
    "preserveAspectRatio",
    "xMidYMid meet"
  );


  const allowedCodes =
    currentMapCards
      .map(card =>
        String(
          card.map_code
        ).toUpperCase()
      );


  svg
    .querySelectorAll(
      "g[id]"
    )
    .forEach(group => {

      const code =
        String(
          group.id
        ).toUpperCase();


      group.classList.remove(
        "map-country",
        "map-country-disabled",
        "map-country-correct",
        "map-country-wrong"
      );


      if (
        allowedCodes.includes(
          code
        )
      ) {

        group.classList.add(
          "map-country"
        );

        group.dataset.countryCode =
          code;

      } else {

        group.classList.add(
          "map-country-disabled"
        );
      }
    });


  createMapHitAreas(
    svg,
    allowedCodes
  );


  setInitialEuropeView(
    svg
  );
}


// ============================================================
// CADRAGE EUROPE
// ============================================================

function setInitialEuropeView(svg) {

  const viewBox = {

    x: 430,
    y: 55,
    width: 235,
    height: 205

  };


  mapOriginalViewBox = {
    ...viewBox
  };


  mapCurrentViewBox = {
    ...viewBox
  };


  applyMapViewBox(svg);
}


// ============================================================
// PETITS PAYS
// ============================================================

function createMapHitAreas(
  svg,
  allowedCodes
) {

  const namespace =
    "http://www.w3.org/2000/svg";


  const overlay =
    document.createElementNS(
      namespace,
      "g"
    );


  overlay.setAttribute(
    "id",
    "map-hit-areas"
  );


  const smallCodes = [
    "AD",
    "LI",
    "LU",
    "SM",
    "VA",
    "MT",
    "XK"
  ];


  smallCodes.forEach(code => {

    if (
      !allowedCodes.includes(
        code
      )
    ) {
      return;
    }


    const country =
      svg.querySelector(
        `g[id="${code}"]`
      );


    if (!country) {
      return;
    }


    try {

      const box =
        country.getBBox();


      const centerX =
        box.x +
        box.width / 2;


      const centerY =
        box.y +
        box.height / 2;


      const size = 8;


      const hit =
        document.createElementNS(
          namespace,
          "rect"
        );


      hit.setAttribute(
        "x",
        centerX - size / 2
      );

      hit.setAttribute(
        "y",
        centerY - size / 2
      );

      hit.setAttribute(
        "width",
        size
      );

      hit.setAttribute(
        "height",
        size
      );

      hit.setAttribute(
        "class",
        "map-small-hit"
      );


      hit.dataset.countryCode =
        code;


      overlay.appendChild(
        hit
      );


    } catch (error) {

      console.warn(
        "Impossible d'ajouter la zone :",
        code
      );
    }
  });


  svg.appendChild(
    overlay
  );
}


// ============================================================
// CLICS CARTE
// ============================================================

function setupMapClicks(
  svg,
  correctCode,
  mode
) {

  const normalizedCorrect =
    String(
      correctCode
    ).toUpperCase();


  const clickable =
    svg.querySelectorAll(
      ".map-country, .map-small-hit"
    );


  clickable.forEach(element => {

    element.addEventListener(
      "click",
      event => {

        if (
          svg.dataset.ignoreMapClick ===
          "true"
        ) {
          return;
        }


        event.stopPropagation();


        const clickedCode =
          String(
            element.dataset.countryCode ||
            element.id
          ).toUpperCase();


        handleMapAnswer(
          svg,
          clickedCode,
          normalizedCorrect,
          mode
        );
      }
    );
  });
}


// ============================================================
// RÉPONSE CARTE
// ============================================================

function handleMapAnswer(
  svg,
  clickedCode,
  correctCode,
  mode
) {

  const feedback =
    document.getElementById(
      "map-feedback"
    );


  const clickedCountry =
    svg.querySelector(
      `g[id="${clickedCode}"]`
    );


  const correctCountry =
    svg.querySelector(
      `g[id="${correctCode}"]`
    );


  svg
    .querySelectorAll(
      ".map-country, .map-small-hit"
    )
    .forEach(element => {

      element.style.pointerEvents =
        "none";
    });


  if (
    clickedCode ===
    correctCode
  ) {

    if (clickedCountry) {

      clickedCountry.classList.add(
        "map-country-correct"
      );
    }


    feedback.classList.remove(
      "hidden"
    );

    feedback.textContent =
      "✅ Correct !";

    feedback.style.color =
      "#15803d";


    if (
      mode === "test"
    ) {

      testScore++;
    }


  } else {

    if (clickedCountry) {

      clickedCountry.classList.add(
        "map-country-wrong"
      );
    }


    if (correctCountry) {

      correctCountry.classList.add(
        "map-country-correct"
      );
    }


    feedback.classList.remove(
      "hidden"
    );

    feedback.textContent =
      "❌ Ce n’était pas ce pays.";

    feedback.style.color =
      "#b91c1c";


    if (
      mode === "review"
    ) {

      reviewQuestions.push(
        reviewQuestions[
          currentQuestionIndex
        ]
      );
    }
  }


  setTimeout(
    () => {

      if (
        mode === "review"
      ) {

        currentQuestionIndex++;

        showMapReviewQuestion();

      } else {

        currentTestIndex++;

        showMapTestQuestion();
      }

    },
    1100
  );
}


// ============================================================
// NAVIGATION CARTE
// ============================================================

function setupMapNavigation(svg) {

  setupMapZoom(svg);

  setupMapPan(svg);

  setupMouseWheelZoom(svg);
}


// ============================================================
// BOUTONS ZOOM
// ============================================================

function setupMapZoom(svg) {

  const zoomIn =
    document.getElementById(
      "map-zoom-in"
    );


  const zoomOut =
    document.getElementById(
      "map-zoom-out"
    );


  const reset =
    document.getElementById(
      "map-reset"
    );


  zoomIn?.addEventListener(
    "click",
    () =>
      zoomMap(
        svg,
        0.8
      )
  );


  zoomOut?.addEventListener(
    "click",
    () =>
      zoomMap(
        svg,
        1.25
      )
  );


  reset?.addEventListener(
    "click",
    () => {

      mapCurrentViewBox = {
        ...mapOriginalViewBox
      };

      applyMapViewBox(svg);
    }
  );
}


// ============================================================
// MOLETTE
// ============================================================

function setupMouseWheelZoom(svg) {

  svg.addEventListener(
    "wheel",
    event => {

      event.preventDefault();


      if (
        event.deltaY < 0
      ) {

        zoomMap(
          svg,
          0.9
        );

      } else {

        zoomMap(
          svg,
          1.1
        );
      }

    },
    {
      passive: false
    }
  );
}


// ============================================================
// ZOOM CARTE
// ============================================================

function zoomMap(
  svg,
  factor
) {

  if (!mapCurrentViewBox) {
    return;
  }


  const centerX =
    mapCurrentViewBox.x +
    mapCurrentViewBox.width / 2;


  const centerY =
    mapCurrentViewBox.y +
    mapCurrentViewBox.height / 2;


  const newWidth =
    mapCurrentViewBox.width *
    factor;


  const newHeight =
    mapCurrentViewBox.height *
    factor;


  const minWidth = 80;
  const maxWidth = 360;


  if (
    newWidth < minWidth ||
    newWidth > maxWidth
  ) {
    return;
  }


  mapCurrentViewBox = {

    x:
      centerX -
      newWidth / 2,

    y:
      centerY -
      newHeight / 2,

    width:
      newWidth,

    height:
      newHeight
  };


  clampMapViewBox();

  applyMapViewBox(svg);
}


// ============================================================
// PAN / DRAG
// ============================================================

function setupMapPan(svg) {

  let pointerDown = false;
  let dragging = false;

  let startX = 0;
  let startY = 0;

  let startViewBox = null;

  let activePointerId = null;


  svg.addEventListener(
    "pointerdown",
    event => {

      if (!mapCurrentViewBox) {
        return;
      }


      pointerDown = true;
      dragging = false;

      activePointerId =
        event.pointerId;

      startX =
        event.clientX;

      startY =
        event.clientY;

      startViewBox = {
        ...mapCurrentViewBox
      };
    }
  );


  svg.addEventListener(
    "pointermove",
    event => {

      if (
        !pointerDown ||
        event.pointerId !==
          activePointerId ||
        !startViewBox
      ) {
        return;
      }


      const deltaPixelsX =
        event.clientX -
        startX;


      const deltaPixelsY =
        event.clientY -
        startY;


      if (
        !dragging &&
        (
          Math.abs(
            deltaPixelsX
          ) > 6 ||
          Math.abs(
            deltaPixelsY
          ) > 6
        )
      ) {

        dragging = true;

        svg.classList.add(
          "map-dragging"
        );


        try {

          svg.setPointerCapture(
            event.pointerId
          );

        } catch (error) {}
      }


      if (!dragging) {
        return;
      }


      event.preventDefault();


      const rect =
        svg.getBoundingClientRect();


      if (
        rect.width === 0 ||
        rect.height === 0
      ) {
        return;
      }


      const deltaMapX =
        deltaPixelsX *
        (
          startViewBox.width /
          rect.width
        );


      const deltaMapY =
        deltaPixelsY *
        (
          startViewBox.height /
          rect.height
        );


      mapCurrentViewBox = {

        x:
          startViewBox.x -
          deltaMapX,

        y:
          startViewBox.y -
          deltaMapY,

        width:
          startViewBox.width,

        height:
          startViewBox.height
      };


      clampMapViewBox();

      applyMapViewBox(svg);
    }
  );


  const finishPointer =
    event => {

      if (
        event.pointerId !==
        activePointerId
      ) {
        return;
      }


      if (dragging) {

        svg.dataset.ignoreMapClick =
          "true";


        setTimeout(
          () => {

            svg.dataset.ignoreMapClick =
              "false";

          },
          100
        );
      }


      try {

        if (
          svg.hasPointerCapture &&
          svg.hasPointerCapture(
            event.pointerId
          )
        ) {

          svg.releasePointerCapture(
            event.pointerId
          );
        }

      } catch (error) {}


      pointerDown = false;
      dragging = false;

      activePointerId = null;
      startViewBox = null;


      svg.classList.remove(
        "map-dragging"
      );
    };


  svg.addEventListener(
    "pointerup",
    finishPointer
  );


  svg.addEventListener(
    "pointercancel",
    finishPointer
  );
}


// ============================================================
// LIMITES CARTE
// ============================================================

function clampMapViewBox() {

  if (!mapCurrentViewBox) {
    return;
  }


  const minX = 360;
  const maxX = 760;

  const minY = 20;
  const maxY = 315;


  if (
    mapCurrentViewBox.x <
    minX
  ) {

    mapCurrentViewBox.x =
      minX;
  }


  if (
    mapCurrentViewBox.y <
    minY
  ) {

    mapCurrentViewBox.y =
      minY;
  }


  if (
    mapCurrentViewBox.x +
      mapCurrentViewBox.width >
    maxX
  ) {

    mapCurrentViewBox.x =
      maxX -
      mapCurrentViewBox.width;
  }


  if (
    mapCurrentViewBox.y +
      mapCurrentViewBox.height >
    maxY
  ) {

    mapCurrentViewBox.y =
      maxY -
      mapCurrentViewBox.height;
  }
}


// ============================================================
// APPLIQUER VIEWBOX
// ============================================================

function applyMapViewBox(svg) {

  if (!mapCurrentViewBox) {
    return;
  }


  svg.setAttribute(
    "viewBox",
    `
      ${mapCurrentViewBox.x}
      ${mapCurrentViewBox.y}
      ${mapCurrentViewBox.width}
      ${mapCurrentViewBox.height}
    `
  );
}


// ============================================================
// FIN DU TEST
// ============================================================

function showTestFinished() {

  const total =
    testQuestions.length;


  const percentage =
    total > 0
      ? Math.round(
          (
            testScore /
            total
          ) *
          100
        )
      : 0;


  let message =
    "Continue à t'entraîner 💪";


  if (
    percentage >= 90
  ) {

    message =
      "Excellent travail ! 🌟";

  } else if (
    percentage >= 75
  ) {

    message =
      "Très bon résultat ! 👏";

  } else if (
    percentage >= 60
  ) {

    message =
      "Bien joué ! 👍";
  }


  title.textContent =
    currentChapter.name;


  subtitle.textContent =
    "Test terminé";


  container.innerHTML = `

    <div class="review-box">

      <div
        class="subject-icon"
        style="font-size:60px;"
      >
        🎯
      </div>


      <div class="review-question">
        ${testScore} / ${total}
      </div>


      <div
        class="review-answer"
        style="font-size:30px;"
      >
        ${percentage} %
      </div>


      <div
        class="mode-description"
        style="
          font-size:18px;
          margin-bottom:30px;
        "
      >
        ${message}
      </div>


      <button
        id="restart-test"
        class="main-button"
      >
        Nouveau test
      </button>


      <button
        id="test-back"
        class="secondary-button"
      >
        Retour au chapitre
      </button>

    </div>
  `;


  document
    .getElementById(
      "restart-test"
    )
    .addEventListener(
      "click",
      () => {

        if (
          currentChapter
            .content_type ===
          "flags"
        ) {

          startFlagTest(
            currentChapter
          );

        } else if (
          currentChapter
            .content_type ===
          "map"
        ) {

          startMapTest(
            currentChapter
          );

        } else if (
          currentChapter
            .direction_mode ===
          "bidirectional"
        ) {

          showDirectionChoice(
            "test"
          );

        } else {

          startTest(
            currentChapter,
            "forward"
          );
        }
      }
    );


  document
    .getElementById(
      "test-back"
    )
    .addEventListener(
      "click",
      () =>
        showModes(
          currentChapter
        )
    );
}


// ============================================================
// BOUTON RETOUR
// ============================================================

function addBackButton(
  callback
) {

  const back =
    document.createElement("div");

  back.className =
    "subject-card";

  back.style.gridColumn =
    "1 / -1";

  back.style.padding =
    "16px 20px";


  back.innerHTML = `
    <div
      class="subject-name"
      style="
        font-size:17px;
        text-align:left;
      "
    >
      ← Retour
    </div>
  `;


  back.addEventListener(
    "click",
    callback
  );


  container.appendChild(back);
}


// ============================================================
// MÉLANGE
// ============================================================

function shuffleArray(array) {

  for (
    let i =
      array.length - 1;

    i > 0;

    i--
  ) {

    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );


    [
      array[i],
      array[j]
    ] = [
      array[j],
      array[i]
    ];
  }
}


// ============================================================
// SÉCURISER LE TEXTE HTML
// ============================================================

function escapeHtml(value) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}
