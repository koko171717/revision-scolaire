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
// ELEMENTS PRINCIPAUX
// ============================================================

const container =
  document.getElementById("subjects");

const title =
  document.querySelector("h1");

const subtitle =
  document.querySelector("header p");


// ============================================================
// ETAT GENERAL
// ============================================================

let currentSubject = null;
let currentChapter = null;

let allSubjectChapters = [];
let navigationStack = [];


// ============================================================
// REVISION / TEST
// ============================================================

let reviewQuestions = [];
let currentQuestionIndex = 0;

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
// FRANCAIS
// ============================================================

let frenchLearningCards = [];
let frenchLearningIndex = 0;
let frenchLearningScore = 0;

let oppositeQuestions = [];
let oppositeIndex = 0;


// ============================================================
// DEMARRAGE
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

  const { data, error } =
    await supabaseClient
      .from("subjects")
      .select("*")
      .order("sort_order");

  if (error) {

    console.error(error);

    container.innerHTML =
      "<p>Impossible de charger les matières.</p>";

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
// OUVRIR UNE MATIERE
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

  const { data, error } =
    await supabaseClient
      .from("chapters")
      .select("*")
      .eq("subject_id", subject.id)
      .order("sort_order");

  if (error) {

    console.error(error);

    container.innerHTML =
      "<p>Impossible de charger les chapitres.</p>";

    return;
  }

  allSubjectChapters =
    data || [];

  renderChapterLevel(null);
}


// ============================================================
// NAVIGATION CHAPITRES
// ============================================================

function renderChapterLevel(parentId) {

  container.innerHTML = "";

  const children =
    allSubjectChapters
      .filter(chapter => {

        if (parentId === null) {
          return chapter.parent_chapter_id === null;
        }

        return (
          Number(chapter.parent_chapter_id) ===
          Number(parentId)
        );
      })
      .sort(
        (a, b) =>
          (a.sort_order || 0) -
          (b.sort_order || 0)
      );

  if (navigationStack.length === 0) {

    title.textContent =
      currentSubject.name;

    subtitle.textContent =
      "Choisis une rubrique";

  } else {

    const parent =
      navigationStack[
        navigationStack.length - 1
      ];

    title.textContent =
      parent.name;

    subtitle.textContent =
      "Choisis une partie";
  }

  addBackButton(() => {

    if (navigationStack.length === 0) {
      loadSubjects();
      return;
    }

    navigationStack.pop();

    if (navigationStack.length === 0) {

      renderChapterLevel(null);

    } else {

      const parent =
        navigationStack[
          navigationStack.length - 1
        ];

      renderChapterLevel(parent.id);
    }
  });

  if (children.length === 0) {

    const empty =
      document.createElement("div");

    empty.className =
      "subject-card disabled-card";

    empty.innerHTML = `
      <div class="subject-icon">📭</div>

      <div class="subject-name">
        Aucun contenu pour le moment
      </div>
    `;

    container.appendChild(empty);
    return;
  }

  children.forEach(chapter => {

    const hasChildren =
      allSubjectChapters.some(
        c =>
          Number(c.parent_chapter_id) ===
          Number(chapter.id)
      );

    const card =
      document.createElement("div");

    card.className =
      "subject-card";

    card.innerHTML = `
      <div class="subject-icon">
        ${getChapterIcon(chapter, hasChildren)}
      </div>

      <div class="subject-name">
        ${escapeHtml(chapter.name)}
      </div>

      ${
        hasChildren
          ? `
            <div class="mode-description">
              Ouvrir
            </div>
          `
          : ""
      }
    `;

    card.addEventListener(
      "click",
      () => {

        if (hasChildren) {

          navigationStack.push(chapter);

          renderChapterLevel(
            chapter.id
          );

        } else {

          showModes(chapter);
        }
      }
    );

    container.appendChild(card);
  });
}


// ============================================================
// ICONES
// ============================================================

function getChapterIcon(chapter, hasChildren) {

  if (chapter.name === "Vocabulaire")
    return "🔤";

  if (chapter.name === "Grammaire")
    return "✏️";

  if (/^TS\d+/i.test(chapter.name))
    return "📝";

  if (chapter.name.includes("Unit"))
    return "📚";

  if (chapter.name === "Family")
    return "👨‍👩‍👧";

  if (chapter.name === "Housework")
    return "🧹";

  if (chapter.name === "Home objects")
    return "🏠";

  if (chapter.name === "Words and phrases")
    return "💬";

  if (chapter.name === "Everyday English")
    return "🗣️";

  if (chapter.content_type === "flags")
    return "🏳️";

  if (chapter.content_type === "map")
    return "🗺️";

  if (chapter.content_type === "french_vocab")
    return "📖";

  if (hasChildren)
    return "📂";

  return "📘";
}


// ============================================================
// MODES GENERIQUES
// ============================================================

function showModes(chapter) {

  currentChapter = chapter;

  if (
    chapter.content_type ===
    "french_vocab"
  ) {

    showFrenchVocabModes(chapter);
    return;
  }

  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Choisis ton mode";

  container.innerHTML = "";

  addBackButton(
    goBackToChapterList
  );


  // REVISION

  const revision =
    document.createElement("div");

  revision.className =
    "subject-card";

  revision.innerHTML = `
    <div class="subject-icon">
      ${
        chapter.content_type === "map"
          ? "🗺️"
          : chapter.content_type === "flags"
          ? "🏳️"
          : "📚"
      }
    </div>

    <div class="subject-name">
      Révision
    </div>

    <div class="mode-description">
      ${
        chapter.content_type === "map"
          ? "Retrouve les pays sur la carte"
          : chapter.content_type === "flags"
          ? "Drapeau → pays"
          : "Cartes de révision"
      }
    </div>
  `;

  revision.addEventListener(
    "click",
    () => {

      if (
        chapter.content_type === "map"
      ) {

        startMapReview(chapter);

      } else if (
        chapter.content_type === "flags"
      ) {

        startFlagReview(chapter);

      } else if (
        chapter.direction_mode ===
        "bidirectional"
      ) {

        showDirectionChoice("review");

      } else {

        startReview(
          chapter,
          "forward"
        );
      }
    }
  );

  container.appendChild(revision);


  // TEST

  const test =
    document.createElement("div");

  if (chapter.test_mode === "disabled") {

    test.className =
      "subject-card disabled-card";

    test.innerHTML = `
      <div class="subject-icon">🎯</div>

      <div class="subject-name">
        Test
      </div>

      <div class="mode-description">
        Pas de test disponible
      </div>
    `;

  } else {

    test.className =
      "subject-card";

    test.innerHTML = `
      <div class="subject-icon">
        🎯
      </div>

      <div class="subject-name">
        Test
      </div>

      <div class="mode-description">
        ${
          chapter.test_mode === "written"
            ? "Écris les réponses"
            : chapter.test_mode === "qcm"
            ? "Choisis la bonne réponse"
            : "Teste tes connaissances"
        }
      </div>
    `;

    test.addEventListener(
      "click",
      () => {

        if (
          chapter.content_type === "flags"
        ) {

          startFlagTest(chapter);

        } else if (
          chapter.content_type === "map"
        ) {

          startMapTest(chapter);

        } else if (
          chapter.direction_mode ===
          "bidirectional"
        ) {

          showDirectionChoice("test");

        } else {

          startTest(
            chapter,
            "forward"
          );
        }
      }
    );
  }

  container.appendChild(test);
}


// ============================================================
// MODES FRANCAIS
// ============================================================

function showFrenchVocabModes(chapter) {

  currentChapter = chapter;

  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Choisis ton mode";

  container.innerHTML = "";

  addBackButton(
    goBackToChapterList
  );

  const modes = [

    {
      icon: "📄",
      name: "Fiche de révision",
      description:
        "Vocabulaire, définitions et suppléments",
      action:
        () =>
          startFrenchRevisionSheet(
            chapter
          )
    },

    {
      icon: "🧩",
      name: "Apprentissage",
      description:
        "Associe les mots et leurs définitions",
      action:
        () =>
          startFrenchLearning(
            chapter
          )
    },

    {
      icon: "✍️",
      name: "Définition → mot",
      description:
        "Lis la définition et écris le vocabulaire",
      action:
        () =>
          chooseFrenchTestLength(
            chapter,
            "definition"
          )
    },

    {
      icon: "📝",
      name: "Phrase à trou",
      description:
        "Complète la phrase avec le bon mot",
      action:
        () =>
          chooseFrenchTestLength(
            chapter,
            "cloze"
          )
    },

    {
      icon: "🔊",
      name: "Dictée",
      description:
        "Écoute le mot puis écris-le",
      action:
        () =>
          chooseFrenchTestLength(
            chapter,
            "dictation"
          )
    },

    {
      icon: "🔁",
      name: "Contraires",
      description:
        "Cartes de révision sur les contraires",
      action:
        () =>
          showOppositeDirectionChoice(
            chapter
          )
    }
  ];

  modes.forEach(mode => {

    const card =
      document.createElement("div");

    card.className =
      "subject-card";

    card.innerHTML = `
      <div class="subject-icon">
        ${mode.icon}
      </div>

      <div class="subject-name">
        ${mode.name}
      </div>

      <div class="mode-description">
        ${mode.description}
      </div>
    `;

    card.addEventListener(
      "click",
      mode.action
    );

    container.appendChild(card);
  });
}


// ============================================================
// FICHE DE REVISION FRANCAIS
// ============================================================

async function startFrenchRevisionSheet(chapter) {

  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Fiche de révision";

  container.innerHTML =
    "<p>Chargement...</p>";

  const cards =
    await loadCards(chapter);

  if (!cards) return;

  container.innerHTML = "";

  addBackButton(
    () =>
      showFrenchVocabModes(
        chapter
      )
  );

  const sheet =
    document.createElement("div");

  sheet.className =
    "review-box";

  sheet.style.maxWidth =
    "850px";

  sheet.style.textAlign =
    "left";

  sheet.style.padding =
    "30px";

  cards.forEach(card => {

    const row =
      document.createElement("div");

    row.style.padding =
      "20px 0";

    row.style.borderBottom =
      "1px solid #e5e7eb";

    row.innerHTML = `
      <div style="
        font-size:21px;
        font-weight:800;
        margin-bottom:8px;
      ">
        ${escapeHtml(card.answer)}
      </div>

      <div style="
        font-size:17px;
        line-height:1.5;
      ">
        <strong>
          Définition :
        </strong>

        ${escapeHtml(
          card.definition ||
          card.question
        )}
      </div>

      ${
        card.supplement
          ? `
            <div style="
              margin-top:8px;
              font-size:16px;
              color:#4b5563;
            ">
              <strong>
                Supplément :
              </strong>

              ${escapeHtml(
                card.supplement
              )}
            </div>
          `
          : ""
      }
    `;

    sheet.appendChild(row);
  });

  container.appendChild(sheet);
}


// ============================================================
// APPRENTISSAGE FRANCAIS
// ============================================================

async function startFrenchLearning(chapter) {

  const cards =
    await loadCards(chapter);

  if (!cards) return;

  frenchLearningCards =
    cards.map(card => ({
      ...card
    }));

  shuffleArray(
    frenchLearningCards
  );

  frenchLearningIndex = 0;
  frenchLearningScore = 0;

  showFrenchLearningQuestion();
}


function showFrenchLearningQuestion() {

  if (
    frenchLearningIndex >=
    frenchLearningCards.length
  ) {

    showFrenchLearningFinished();
    return;
  }

  const current =
    frenchLearningCards[
      frenchLearningIndex
    ];

  const wrong =
    frenchLearningCards.filter(
      card =>
        card.id !== current.id
    );

  shuffleArray(wrong);

  const options = [
    current,
    ...wrong.slice(0, 3)
  ];

  shuffleArray(options);

  title.textContent =
    currentChapter.name;

  subtitle.textContent =
    `Apprentissage • ${frenchLearningIndex + 1}/${frenchLearningCards.length}`;

  container.innerHTML = `
    <div class="review-box">

      <div class="review-question">
        ${escapeHtml(
          current.answer
        )}
      </div>

      <div style="
        color:#6b7280;
        margin-bottom:20px;
      ">
        Choisis la bonne définition.
      </div>

      <div class="qcm-grid">

        ${options.map(
          option => `
            <button
              class="qcm-choice french-learning-choice"
              data-id="${option.id}"
            >
              ${escapeHtml(
                option.definition ||
                option.question
              )}
            </button>
          `
        ).join("")}

      </div>

      <div
        id="french-learning-feedback"
        class="hidden"
        style="
          margin-top:20px;
          font-weight:700;
        "
      ></div>

      <button
        id="french-learning-next"
        class="main-button hidden"
        style="margin-top:20px;"
      >
        Suivant
      </button>

      <button
        id="quit-french-learning"
        class="secondary-button"
      >
        ← Quitter
      </button>

    </div>
  `;

  document
    .querySelectorAll(
      ".french-learning-choice"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const selected =
            Number(
              button.dataset.id
            );

          document
            .querySelectorAll(
              ".french-learning-choice"
            )
            .forEach(b => {

              b.disabled = true;

              if (
                Number(b.dataset.id) ===
                Number(current.id)
              ) {

                b.classList.add(
                  "qcm-correct"
                );
              }
            });

          const feedback =
            document.getElementById(
              "french-learning-feedback"
            );

          feedback.classList.remove(
            "hidden"
          );

          if (
            selected ===
            Number(current.id)
          ) {

            frenchLearningScore++;

            feedback.textContent =
              "✅ Correct !";

            feedback.style.color =
              "#15803d";

          } else {

            button.classList.add(
              "qcm-wrong"
            );

            feedback.innerHTML = `
              ❌ À revoir :
              <strong>
                ${escapeHtml(
                  current.answer
                )}
              </strong>
            `;

            feedback.style.color =
              "#b91c1c";

            frenchLearningCards.push(
              current
            );
          }

          document
            .getElementById(
              "french-learning-next"
            )
            .classList.remove(
              "hidden"
            );
        }
      );
    });

  document
    .getElementById(
      "french-learning-next"
    )
    .addEventListener(
      "click",
      () => {

        frenchLearningIndex++;
        showFrenchLearningQuestion();
      }
    );

  document
    .getElementById(
      "quit-french-learning"
    )
    .addEventListener(
      "click",
      () =>
        showFrenchVocabModes(
          currentChapter
        )
    );
}


function showFrenchLearningFinished() {

  container.innerHTML = `
    <div class="review-box">

      <div class="subject-icon">
        🎉
      </div>

      <div class="review-question">
        Apprentissage terminé !
      </div>

      <button
        id="back-french-learning"
        class="main-button"
      >
        Retour
      </button>

    </div>
  `;

  document
    .getElementById(
      "back-french-learning"
    )
    .addEventListener(
      "click",
      () =>
        showFrenchVocabModes(
          currentChapter
        )
    );
}


// ============================================================
// CHOIX LONGUEUR TEST FRANCAIS
// ============================================================

function chooseFrenchTestLength(
  chapter,
  mode
) {

  title.textContent =
    chapter.name;

  subtitle.textContent =
    mode === "dictation"
      ? "Dictée"
      : mode === "cloze"
      ? "Phrase à trou"
      : "Définition → mot";

  container.innerHTML = "";

  addBackButton(
    () =>
      showFrenchVocabModes(
        chapter
      )
  );

  const choices = [
    {
      icon: "🔟",
      name: "10 mots",
      amount: 10
    },
    {
      icon: "2️⃣0️⃣",
      name: "20 mots",
      amount: 20
    },
    {
      icon: "📚",
      name: "Tous les mots",
      amount: "all"
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
        ${choice.name}
      </div>
    `;

    card.addEventListener(
      "click",
      () => {

        if (mode === "dictation") {

          startFrenchDictation(
            chapter,
            choice.amount
          );

        } else if (
          mode === "cloze"
        ) {

          startFrenchClozeTest(
            chapter,
            choice.amount
          );

        } else {

          startFrenchWrittenTest(
            chapter,
            choice.amount
          );
        }
      }
    );

    container.appendChild(card);
  });
}


// ============================================================
// DEFINITION -> MOT
// ============================================================

async function startFrenchWrittenTest(
  chapter,
  amount
) {

  const cards =
    await loadCards(chapter);

  if (!cards) return;

  testQuestions =
    cards.map(card => ({

      question:
        card.definition ||
        card.question,

      answer:
        card.answer,

      accepted_answers:
        card.accepted_answers || []

    }));

  shuffleArray(
    testQuestions
  );

  if (amount !== "all") {

    testQuestions =
      testQuestions.slice(
        0,
        amount
      );
  }

  currentTestIndex = 0;
  testScore = 0;

  showFrenchWrittenQuestion();
}


function showFrenchWrittenQuestion() {

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

  container.innerHTML = `
    <div class="review-box">

      <div class="qcm-topbar">

        <div>
          Question ${currentTestIndex + 1}
          / ${testQuestions.length}
        </div>

        <div>
          ⭐ ${testScore}
        </div>

      </div>

      <div class="review-question">
        ${escapeHtml(
          current.question
        )}
      </div>

      <input
        id="french-written-answer"
        type="text"
        autocomplete="off"
        spellcheck="false"
        placeholder="Écris le mot"
        style="
          width:100%;
          padding:18px;
          font-size:20px;
          border:2px solid #d1d5db;
          border-radius:16px;
          margin-bottom:18px;
        "
      >

      <button
        id="validate-french-written"
        class="main-button"
      >
        Valider
      </button>

      <div
        id="french-written-feedback"
        class="hidden"
        style="
          margin-top:20px;
          font-size:19px;
          font-weight:700;
        "
      ></div>

      <button
        id="next-french-written"
        class="main-button hidden"
        style="margin-top:20px;"
      >
        Question suivante
      </button>

      <button
        id="quit-french-written"
        class="secondary-button"
      >
        ← Quitter
      </button>

    </div>
  `;

  const input =
    document.getElementById(
      "french-written-answer"
    );

  input.focus();

  const validate = () => {

    const value =
      input.value.trim();

    if (!value) return;

    const accepted = [
      current.answer,
      ...(current.accepted_answers || [])
    ];

    const correct =
      accepted.some(
        answer =>
          normalizeAnswer(value) ===
          normalizeAnswer(answer)
      );

    input.disabled = true;

    document
      .getElementById(
        "validate-french-written"
      )
      .classList.add(
        "hidden"
      );

    document
      .getElementById(
        "next-french-written"
      )
      .classList.remove(
        "hidden"
      );

    const feedback =
      document.getElementById(
        "french-written-feedback"
      );

    feedback.classList.remove(
      "hidden"
    );

    if (correct) {

      testScore++;

      feedback.textContent =
        "✅ Correct !";

      feedback.style.color =
        "#15803d";

    } else {

      feedback.innerHTML = `
        ❌ Réponse attendue :
        <strong>
          ${escapeHtml(
            current.answer
          )}
        </strong>
      `;

      feedback.style.color =
        "#b91c1c";
    }
  };

  document
    .getElementById(
      "validate-french-written"
    )
    .addEventListener(
      "click",
      validate
    );

  input.addEventListener(
    "keydown",
    event => {

      if (event.key !== "Enter")
        return;

      if (!input.disabled) {

        validate();

      } else {

        currentTestIndex++;
        showFrenchWrittenQuestion();
      }
    }
  );

  document
    .getElementById(
      "next-french-written"
    )
    .addEventListener(
      "click",
      () => {

        currentTestIndex++;
        showFrenchWrittenQuestion();
      }
    );

  document
    .getElementById(
      "quit-french-written"
    )
    .addEventListener(
      "click",
      () =>
        showFrenchVocabModes(
          currentChapter
        )
    );
}


// ============================================================
// PHRASE A TROU
// ============================================================

async function startFrenchClozeTest(
  chapter,
  amount
) {

  const cards =
    await loadCards(chapter);

  if (!cards) return;

  testQuestions =
    cards
      .filter(card =>
        card.cloze_sentence &&
        card.cloze_answer
      )
      .map(card => ({

        question:
          card.cloze_sentence,

        hint:
          card.cloze_hint,

        answer:
          card.cloze_answer

      }));

  shuffleArray(
    testQuestions
  );

  if (amount !== "all") {

    testQuestions =
      testQuestions.slice(
        0,
        amount
      );
  }

  currentTestIndex = 0;
  testScore = 0;

  showFrenchClozeQuestion();
}


function showFrenchClozeQuestion() {

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

  title.textContent =
    currentChapter.name;

  subtitle.textContent =
    "Phrase à trou";

  container.innerHTML = `
    <div class="review-box">

      <div class="qcm-topbar">

        <div>
          Question ${currentTestIndex + 1}
          / ${testQuestions.length}
        </div>

        <div>
          ⭐ ${testScore}
        </div>

      </div>

      <div style="
        color:#6b7280;
        margin-bottom:15px;
      ">
        Complète la phrase.
      </div>

      <div class="review-question">

        ${escapeHtml(
          current.question
        )}

        ${
          current.hint
            ? `
              <div style="
                margin-top:14px;
                font-size:18px;
                font-weight:600;
                color:#6b7280;
              ">
                (${escapeHtml(
                  current.hint
                )})
              </div>
            `
            : ""
        }

      </div>

      <input
        id="cloze-answer"
        type="text"
        autocomplete="off"
        spellcheck="false"
        placeholder="Écris le mot"
        style="
          width:100%;
          padding:18px;
          font-size:20px;
          border:2px solid #d1d5db;
          border-radius:16px;
          margin-bottom:18px;
        "
      >

      <button
        id="validate-cloze"
        class="main-button"
      >
        Valider
      </button>

      <div
        id="cloze-feedback"
        class="hidden"
        style="
          margin-top:20px;
          font-size:19px;
          font-weight:700;
        "
      ></div>

      <button
        id="next-cloze"
        class="main-button hidden"
        style="margin-top:20px;"
      >
        Question suivante
      </button>

      <button
        id="quit-cloze"
        class="secondary-button"
      >
        ← Quitter
      </button>

    </div>
  `;

  const input =
    document.getElementById(
      "cloze-answer"
    );

  input.focus();

  const validate = () => {

    const value =
      input.value.trim();

    if (!value) return;

    // IMPORTANT :
    // Pour une phrase à trou, on exige
    // exactement la forme grammaticale
    // correspondant à la phrase.

    const correct =
      normalizeAnswer(value) ===
      normalizeAnswer(
        current.answer
      );

    input.disabled = true;

    document
      .getElementById(
        "validate-cloze"
      )
      .classList.add(
        "hidden"
      );

    document
      .getElementById(
        "next-cloze"
      )
      .classList.remove(
        "hidden"
      );

    const feedback =
      document.getElementById(
        "cloze-feedback"
      );

    feedback.classList.remove(
      "hidden"
    );

    if (correct) {

      testScore++;

      feedback.textContent =
        "✅ Correct !";

      feedback.style.color =
        "#15803d";

    } else {

      feedback.innerHTML = `
        ❌ Réponse attendue :
        <strong>
          ${escapeHtml(
            current.answer
          )}
        </strong>
      `;

      feedback.style.color =
        "#b91c1c";
    }
  };

  document
    .getElementById(
      "validate-cloze"
    )
    .addEventListener(
      "click",
      validate
    );

  input.addEventListener(
    "keydown",
    event => {

      if (event.key !== "Enter")
        return;

      if (!input.disabled) {

        validate();

      } else {

        currentTestIndex++;
        showFrenchClozeQuestion();
      }
    }
  );

  document
    .getElementById(
      "next-cloze"
    )
    .addEventListener(
      "click",
      () => {

        currentTestIndex++;
        showFrenchClozeQuestion();
      }
    );

  document
    .getElementById(
      "quit-cloze"
    )
    .addEventListener(
      "click",
      () =>
        showFrenchVocabModes(
          currentChapter
        )
    );
}


// ============================================================
// DICTEE
// ============================================================

async function startFrenchDictation(
  chapter,
  amount
) {

  const cards =
    await loadCards(chapter);

  if (!cards) return;

  testQuestions =
    cards.map(card => ({

      answer:
        card.answer

    }));

  shuffleArray(
    testQuestions
  );

  if (amount !== "all") {

    testQuestions =
      testQuestions.slice(
        0,
        amount
      );
  }

  currentTestIndex = 0;
  testScore = 0;

  showFrenchDictationQuestion();
}


function showFrenchDictationQuestion() {

  if (
    currentTestIndex >=
    testQuestions.length
  ) {

    if (
      "speechSynthesis" in window
    ) {
      speechSynthesis.cancel();
    }

    showTestFinished();
    return;
  }

  const current =
    testQuestions[
      currentTestIndex
    ];

  title.textContent =
    currentChapter.name;

  subtitle.textContent =
    "Dictée";

  container.innerHTML = `
    <div class="review-box">

      <div class="qcm-topbar">

        <div>
          Mot ${currentTestIndex + 1}
          / ${testQuestions.length}
        </div>

        <div>
          ⭐ ${testScore}
        </div>

      </div>

      <div
        class="subject-icon"
        style="
          font-size:65px;
          margin:20px 0;
        "
      >
        🔊
      </div>

      <div class="review-question">
        Écoute puis écris le mot
      </div>

      <button
        id="listen-word"
        class="main-button"
        style="margin-bottom:20px;"
      >
        🔊 Écouter
      </button>

      <input
        id="dictation-answer"
        type="text"
        autocomplete="off"
        spellcheck="false"
        placeholder="Écris ce que tu entends"
        style="
          width:100%;
          padding:18px;
          font-size:20px;
          border:2px solid #d1d5db;
          border-radius:16px;
          margin-bottom:18px;
        "
      >

      <button
        id="validate-dictation"
        class="main-button"
      >
        Valider
      </button>

      <div
        id="dictation-feedback"
        class="hidden"
        style="
          margin-top:20px;
          font-size:19px;
          font-weight:700;
        "
      ></div>

      <button
        id="next-dictation"
        class="main-button hidden"
        style="margin-top:20px;"
      >
        Mot suivant
      </button>

      <button
        id="quit-dictation"
        class="secondary-button"
      >
        ← Quitter
      </button>

    </div>
  `;

  const speak =
    () =>
      speakFrenchWord(
        current.answer
      );

  document
    .getElementById(
      "listen-word"
    )
    .addEventListener(
      "click",
      speak
    );

  const input =
    document.getElementById(
      "dictation-answer"
    );

  input.focus();

  const validate = () => {

    const value =
      input.value.trim();

    if (!value) return;

    const correct =
      normalizeAnswer(value) ===
      normalizeAnswer(
        current.answer
      );

    input.disabled = true;

    document
      .getElementById(
        "validate-dictation"
      )
      .classList.add(
        "hidden"
      );

    document
      .getElementById(
        "next-dictation"
      )
      .classList.remove(
        "hidden"
      );

    const feedback =
      document.getElementById(
        "dictation-feedback"
      );

    feedback.classList.remove(
      "hidden"
    );

    if (correct) {

      testScore++;

      feedback.textContent =
        "✅ Correct !";

      feedback.style.color =
        "#15803d";

    } else {

      feedback.innerHTML = `
        ❌ Le mot était :
        <strong>
          ${escapeHtml(
            current.answer
          )}
        </strong>
      `;

      feedback.style.color =
        "#b91c1c";
    }
  };

  document
    .getElementById(
      "validate-dictation"
    )
    .addEventListener(
      "click",
      validate
    );

  input.addEventListener(
    "keydown",
    event => {

      if (event.key !== "Enter")
        return;

      if (!input.disabled) {

        validate();

      } else {

        currentTestIndex++;
        showFrenchDictationQuestion();
      }
    }
  );

  document
    .getElementById(
      "next-dictation"
    )
    .addEventListener(
      "click",
      () => {

        currentTestIndex++;
        showFrenchDictationQuestion();
      }
    );

  document
    .getElementById(
      "quit-dictation"
    )
    .addEventListener(
      "click",
      () => {

        if (
          "speechSynthesis" in window
        ) {
          speechSynthesis.cancel();
        }

        showFrenchVocabModes(
          currentChapter
        );
      }
    );

  setTimeout(
    speak,
    400
  );
}


// ============================================================
// VOIX FRANCAISE
// ============================================================

function speakFrenchWord(word) {

  if (
    !("speechSynthesis" in window)
  ) {

    alert(
      "La synthèse vocale n’est pas disponible sur cet appareil."
    );

    return;
  }

  speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(
      word
    );

  utterance.lang =
    "fr-FR";

  utterance.rate =
    0.8;

  utterance.pitch =
    1;

  const voices =
    speechSynthesis.getVoices();

  const frenchVoice =
    voices.find(
      voice =>
        voice.lang
          ?.toLowerCase()
          .startsWith("fr-ch")
    ) ||
    voices.find(
      voice =>
        voice.lang
          ?.toLowerCase()
          .startsWith("fr-fr")
    ) ||
    voices.find(
      voice =>
        voice.lang
          ?.toLowerCase()
          .startsWith("fr")
    );

  if (frenchVoice) {

    utterance.voice =
      frenchVoice;
  }

  speechSynthesis.speak(
    utterance
  );
}


// ============================================================
// CONTRAIRES
// ============================================================

function showOppositeDirectionChoice(chapter) {

  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Cartes des contraires";

  container.innerHTML = "";

  addBackButton(
    () =>
      showFrenchVocabModes(
        chapter
      )
  );

  const choices = [

    {
      icon: "➡️",
      title: "Mot → contraire",
      direction: "forward"
    },

    {
      icon: "⬅️",
      title: "Contraire → mot",
      direction: "reverse"
    },

    {
      icon: "🔀",
      title: "Les deux",
      direction: "both"
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
    `;

    card.addEventListener(
      "click",
      () =>
        startOppositeCards(
          chapter,
          choice.direction
        )
    );

    container.appendChild(card);
  });
}


async function startOppositeCards(
  chapter,
  direction
) {

  const cards =
    await loadCards(chapter);

  if (!cards) return;

  oppositeQuestions = [];

  cards
    .filter(
      card => card.opposite
    )
    .forEach(card => {

      if (
        direction === "forward" ||
        direction === "both"
      ) {

        oppositeQuestions.push({
          question:
            card.answer,
          answer:
            card.opposite
        });
      }

      if (
        direction === "reverse" ||
        direction === "both"
      ) {

        oppositeQuestions.push({
          question:
            card.opposite,
          answer:
            card.answer
        });
      }
    });

  shuffleArray(
    oppositeQuestions
  );

  oppositeIndex = 0;

  showOppositeCard(direction);
}


function showOppositeCard(direction) {

  if (
    oppositeIndex >=
    oppositeQuestions.length
  ) {

    container.innerHTML = `
      <div class="review-box">

        <div class="subject-icon">
          🎉
        </div>

        <div class="review-question">
          Contraires terminés !
        </div>

        <button
          id="back-opposites"
          class="main-button"
        >
          Retour
        </button>

      </div>
    `;

    document
      .getElementById(
        "back-opposites"
      )
      .addEventListener(
        "click",
        () =>
          showFrenchVocabModes(
            currentChapter
          )
      );

    return;
  }

  const current =
    oppositeQuestions[
      oppositeIndex
    ];

  container.innerHTML = `
    <div class="review-box">

      <div style="
        color:#6b7280;
        font-weight:700;
        margin-bottom:15px;
      ">
        Quel est le contraire ?
      </div>

      <div class="review-question">
        ${escapeHtml(
          current.question
        )}
      </div>

      <button
        id="show-opposite"
        class="main-button"
      >
        Voir la réponse
      </button>

      <div
        id="opposite-answer-area"
        class="hidden"
      >

        <div class="review-answer">
          ${escapeHtml(
            current.answer
          )}
        </div>

        <div class="review-actions">

          <button
            id="opposite-wrong"
            class="review-button"
          >
            ❌ À revoir
          </button>

          <button
            id="opposite-correct"
            class="review-button"
          >
            ✅ Je savais
          </button>

        </div>

      </div>

    </div>
  `;

  document
    .getElementById(
      "show-opposite"
    )
    .addEventListener(
      "click",
      () => {

        document
          .getElementById(
            "opposite-answer-area"
          )
          .classList.remove(
            "hidden"
          );

        document
          .getElementById(
            "show-opposite"
          )
          .classList.add(
            "hidden"
          );
      }
    );

  document
    .getElementById(
      "opposite-correct"
    )
    .addEventListener(
      "click",
      () => {

        oppositeIndex++;
        showOppositeCard(direction);
      }
    );

  document
    .getElementById(
      "opposite-wrong"
    )
    .addEventListener(
      "click",
      () => {

        oppositeQuestions.push(
          current
        );

        oppositeIndex++;
        showOppositeCard(direction);
      }
    );
}


// ============================================================
// RETOUR CHAPITRE
// ============================================================

function goBackToChapterList() {

  if (navigationStack.length === 0) {

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

  addBackButton(
    () =>
      showModes(
        currentChapter
      )
  );

  let forwardTitle =
    "Sens normal";

  let reverseTitle =
    "Sens inverse";

  if (
    currentSubject?.name === "Anglais"
  ) {

    forwardTitle =
      "Anglais → Français";

    reverseTitle =
      "Français → Anglais";
  }

  if (
    currentSubject?.name === "Allemand"
  ) {

    forwardTitle =
      "Allemand → Français";

    reverseTitle =
      "Français → Allemand";
  }

  const choices = [

    {
      icon: "➡️",
      title: forwardTitle,
      direction: "forward"
    },

    {
      icon: "⬅️",
      title: reverseTitle,
      direction: "reverse"
    },

    {
      icon: "🔀",
      title: "Les deux",
      direction: "both"
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
    `;

    card.addEventListener(
      "click",
      () => {

        if (mode === "review") {

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
// CHARGEMENT CARTES
// ============================================================

async function loadCards(chapter) {

  const { data, error } =
    await supabaseClient
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

    container.innerHTML = `
      <div class="review-box">

        <div class="review-question">
          Aucun contenu pour le moment.
        </div>

      </div>
    `;

    return null;
  }

  return data;
}


// ============================================================
// QUESTIONS BIDIRECTIONNELLES
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
          card.answer
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
          card.reverse_answer
      });
    }
  });

  return questions;
}


// ============================================================
// REVISION GENERIQUE
// ============================================================

async function startReview(
  chapter,
  direction
) {

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

  showReviewQuestion(direction);
}


function showReviewQuestion(direction) {

  if (
    currentQuestionIndex >=
    reviewQuestions.length
  ) {

    showReviewFinished(direction);
    return;
  }

  const current =
    reviewQuestions[
      currentQuestionIndex
    ];

  container.innerHTML = `
    <div class="review-box">

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

    </div>
  `;

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
        showReviewQuestion(direction);
      }
    );

  document
    .getElementById(
      "wrong-button"
    )
    .addEventListener(
      "click",
      () => {

        reviewQuestions.push(
          current
        );

        currentQuestionIndex++;
        showReviewQuestion(direction);
      }
    );
}


function showReviewFinished(direction) {

  container.innerHTML = `
    <div class="review-box">

      <div class="subject-icon">
        🎉
      </div>

      <div class="review-question">
        Bravo !
      </div>

      <button
        id="back-review"
        class="main-button"
      >
        Retour
      </button>

    </div>
  `;

  document
    .getElementById(
      "back-review"
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
// TEST GENERIQUE
// ============================================================

async function startTest(
  chapter,
  direction
) {

  if (
    chapter.test_mode === "qcm"
  ) {

    startQcmTest(chapter);
    return;
  }

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

  showWrittenTestQuestion(direction);
}


function showWrittenTestQuestion(direction) {

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

  container.innerHTML = `
    <div class="review-box">

      <div class="review-question">
        ${escapeHtml(
          current.question
        )}
      </div>

      <input
        id="written-answer"
        type="text"
        autocomplete="off"
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
      >

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
          margin-top:20px;
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

    </div>
  `;

  const input =
    document.getElementById(
      "written-answer"
    );

  input.focus();

  const validate = () => {

    const correct =
      isAcceptedWrittenAnswer(
        input.value,
        current.answer
      );

    input.disabled = true;

    document
      .getElementById(
        "validate-written"
      )
      .classList.add(
        "hidden"
      );

    document
      .getElementById(
        "next-written"
      )
      .classList.remove(
        "hidden"
      );

    const feedback =
      document.getElementById(
        "written-feedback"
      );

    feedback.classList.remove(
      "hidden"
    );

    if (correct) {

      testScore++;

      feedback.textContent =
        "✅ Correct !";

      feedback.style.color =
        "#15803d";

    } else {

      feedback.innerHTML = `
        ❌ Réponse :
        <strong>
          ${escapeHtml(
            current.answer
          )}
        </strong>
      `;

      feedback.style.color =
        "#b91c1c";
    }
  };

  document
    .getElementById(
      "validate-written"
    )
    .addEventListener(
      "click",
      validate
    );

  document
    .getElementById(
      "next-written"
    )
    .addEventListener(
      "click",
      () => {

        currentTestIndex++;
        showWrittenTestQuestion(direction);
      }
    );
}


// ============================================================
// QCM
// ============================================================

async function startQcmTest(chapter) {

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

  shuffleArray(testQuestions);

  testQuestions =
    testQuestions.slice(0, 20);

  currentTestIndex = 0;
  testScore = 0;

  showQcmQuestion();
}


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

  container.innerHTML = `
    <div class="review-box">

      <div class="review-question">
        ${escapeHtml(
          current.question
        )}
      </div>

      <div class="qcm-grid">

        ${options.map(
          option => `
            <button
              class="qcm-choice"
              data-answer="${encodeURIComponent(option)}"
            >
              ${escapeHtml(option)}
            </button>
          `
        ).join("")}

      </div>

      <button
        id="qcm-next"
        class="main-button hidden"
        style="margin-top:20px;"
      >
        Question suivante
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

          const selected =
            decodeURIComponent(
              button.dataset.answer
            );

          document
            .querySelectorAll(
              ".qcm-choice"
            )
            .forEach(b => {

              b.disabled = true;

              const answer =
                decodeURIComponent(
                  b.dataset.answer
                );

              if (
                answer ===
                current.answer
              ) {

                b.classList.add(
                  "qcm-correct"
                );
              }
            });

          if (
            selected ===
            current.answer
          ) {

            testScore++;

          } else {

            button.classList.add(
              "qcm-wrong"
            );
          }

          document
            .getElementById(
              "qcm-next"
            )
            .classList.remove(
              "hidden"
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
}


// ============================================================
// DRAPEAUX
// ============================================================

async function startFlagReview(chapter) {

  const cards =
    await loadCards(chapter);

  if (!cards) return;

  reviewQuestions =
    cards
      .filter(card =>
        card.image_url
      )
      .map(card => ({
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

    showReviewFinished("forward");
    return;
  }

  const current =
    reviewQuestions[
      currentQuestionIndex
    ];

  container.innerHTML = `
    <div class="review-box">

      <div class="review-question">
        Quel pays correspond à ce drapeau ?
      </div>

      <div class="flag-display">

        <img
          src="${current.image_url}"
          class="flag-main-image"
        >

      </div>

      <button
        id="show-flag"
        class="main-button"
      >
        Voir la réponse
      </button>

      <div
        id="flag-answer"
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

    </div>
  `;

  document
    .getElementById(
      "show-flag"
    )
    .addEventListener(
      "click",
      () => {

        document
          .getElementById(
            "flag-answer"
          )
          .classList.remove(
            "hidden"
          );

        document
          .getElementById(
            "show-flag"
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
          current
        );

        currentQuestionIndex++;
        showFlagReviewQuestion();
      }
    );
}


async function startFlagTest(chapter) {

  const cards =
    await loadCards(chapter);

  if (!cards) return;

  currentMapCards =
    cards.filter(card =>
      card.image_url
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

  const wrong =
    currentMapCards.filter(
      card =>
        card.id !== correct.id
    );

  shuffleArray(wrong);

  const options = [
    correct,
    ...wrong.slice(0, 3)
  ];

  shuffleArray(options);

  container.innerHTML = `
    <div class="review-box">

      <div class="review-question">
        Quel est le drapeau de :
        <br>
        ${escapeHtml(
          correct.answer
        )}
      </div>

      <div class="flag-qcm-grid">

        ${options.map(card => `
          <button
            class="flag-choice-button"
            data-id="${card.id}"
          >
            <img
              src="${card.image_url}"
              alt="Drapeau"
            >
          </button>
        `).join("")}

      </div>

      <button
        id="flag-next"
        class="main-button hidden"
      >
        Question suivante
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

          const selected =
            Number(
              button.dataset.id
            );

          document
            .querySelectorAll(
              ".flag-choice-button"
            )
            .forEach(b => {

              b.disabled = true;

              if (
                Number(
                  b.dataset.id
                ) ===
                Number(correct.id)
              ) {

                b.classList.add(
                  "qcm-correct"
                );
              }
            });

          if (
            selected ===
            Number(correct.id)
          ) {

            testScore++;

          } else {

            button.classList.add(
              "qcm-wrong"
            );
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
}


// ============================================================
// CARTE EUROPE
// ============================================================

async function startMapReview(chapter) {

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

    showReviewFinished("forward");
    return;
  }

  const current =
    reviewQuestions[
      currentQuestionIndex
    ];

  renderMapCard(
    current,
    "review"
  );

  await loadInteractiveMap(
    current.map_code,
    "review"
  );
}


async function startMapTest(chapter) {

  const cards =
    await loadCards(chapter);

  if (!cards) return;

  currentMapCards =
    cards.filter(card =>
      card.map_code
    );

  testQuestions =
    [...currentMapCards];

  shuffleArray(testQuestions);

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


function renderMapCard(
  current,
  mode
) {

  container.innerHTML = `
    <div class="map-card">

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
          class="map-control-button map-reset-button"
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
        Chargement...
      </div>

      <div
        id="map-feedback"
        class="hidden"
        style="
          margin-top:18px;
          text-align:center;
          font-weight:700;
        "
      ></div>

    </div>
  `;
}


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

    const svgText =
      await response.text();

    mapContainer.innerHTML =
      svgText;

    const svg =
      mapContainer.querySelector(
        "svg"
      );

    prepareEuropeMap(svg);

    setupMapNavigation(svg);

    setupMapClicks(
      svg,
      correctCode,
      mode
    );

  } catch (error) {

    console.error(error);

    mapContainer.innerHTML =
      "Impossible de charger la carte.";
  }
}


function prepareEuropeMap(svg) {

  svg.removeAttribute("width");
  svg.removeAttribute("height");

  svg.classList.add(
    "interactive-europe-map"
  );

  const allowedCodes =
    currentMapCards.map(
      card =>
        String(
          card.map_code
        ).toUpperCase()
    );

  svg.querySelectorAll(
    "g[id]"
  ).forEach(group => {

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
      allowedCodes.includes(code)
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

  setInitialEuropeView(svg);
}


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


function createMapHitAreas(
  svg,
  allowedCodes
) {

  const ns =
    "http://www.w3.org/2000/svg";

  const overlay =
    document.createElementNS(
      ns,
      "g"
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
      !allowedCodes.includes(code)
    ) return;

    const country =
      svg.querySelector(
        `g[id="${code}"]`
      );

    if (!country) return;

    const box =
      country.getBBox();

    const hit =
      document.createElementNS(
        ns,
        "rect"
      );

    hit.setAttribute(
      "x",
      box.x +
      box.width / 2 - 4
    );

    hit.setAttribute(
      "y",
      box.y +
      box.height / 2 - 4
    );

    hit.setAttribute(
      "width",
      8
    );

    hit.setAttribute(
      "height",
      8
    );

    hit.setAttribute(
      "class",
      "map-small-hit"
    );

    hit.dataset.countryCode =
      code;

    overlay.appendChild(hit);
  });

  svg.appendChild(overlay);
}


function setupMapClicks(
  svg,
  correctCode,
  mode
) {

  const correct =
    String(
      correctCode
    ).toUpperCase();

  svg.querySelectorAll(
    ".map-country, .map-small-hit"
  ).forEach(element => {

    element.addEventListener(
      "click",
      event => {

        if (
          svg.dataset.ignoreMapClick ===
          "true"
        ) return;

        event.stopPropagation();

        const clicked =
          String(
            element.dataset.countryCode ||
            element.id
          ).toUpperCase();

        handleMapAnswer(
          svg,
          clicked,
          correct,
          mode
        );
      }
    );
  });
}


function handleMapAnswer(
  svg,
  clicked,
  correct,
  mode
) {

  const feedback =
    document.getElementById(
      "map-feedback"
    );

  const clickedCountry =
    svg.querySelector(
      `g[id="${clicked}"]`
    );

  const correctCountry =
    svg.querySelector(
      `g[id="${correct}"]`
    );

  if (
    clicked === correct
  ) {

    clickedCountry
      ?.classList.add(
        "map-country-correct"
      );

    feedback.textContent =
      "✅ Correct !";

    feedback.style.color =
      "#15803d";

    if (mode === "test") {
      testScore++;
    }

  } else {

    clickedCountry
      ?.classList.add(
        "map-country-wrong"
      );

    correctCountry
      ?.classList.add(
        "map-country-correct"
      );

    feedback.textContent =
      "❌ Ce n’était pas ce pays.";

    feedback.style.color =
      "#b91c1c";

    if (mode === "review") {

      reviewQuestions.push(
        reviewQuestions[
          currentQuestionIndex
        ]
      );
    }
  }

  feedback.classList.remove(
    "hidden"
  );

  setTimeout(
    () => {

      if (mode === "review") {

        currentQuestionIndex++;
        showMapReviewQuestion();

      } else {

        currentTestIndex++;
        showMapTestQuestion();
      }
    },
    1000
  );
}


// ============================================================
// ZOOM / PAN CARTE
// ============================================================

function setupMapNavigation(svg) {

  setupMapZoom(svg);
  setupMapPan(svg);
  setupMouseWheelZoom(svg);
}


function setupMapZoom(svg) {

  document
    .getElementById(
      "map-zoom-in"
    )
    ?.addEventListener(
      "click",
      () =>
        zoomMap(
          svg,
          0.8
        )
    );

  document
    .getElementById(
      "map-zoom-out"
    )
    ?.addEventListener(
      "click",
      () =>
        zoomMap(
          svg,
          1.25
        )
    );

  document
    .getElementById(
      "map-reset"
    )
    ?.addEventListener(
      "click",
      () => {

        mapCurrentViewBox = {
          ...mapOriginalViewBox
        };

        applyMapViewBox(svg);
      }
    );
}


function setupMouseWheelZoom(svg) {

  svg.addEventListener(
    "wheel",
    event => {

      event.preventDefault();

      zoomMap(
        svg,
        event.deltaY < 0
          ? 0.9
          : 1.1
      );
    },
    {
      passive: false
    }
  );
}


function zoomMap(svg, factor) {

  const centerX =
    mapCurrentViewBox.x +
    mapCurrentViewBox.width / 2;

  const centerY =
    mapCurrentViewBox.y +
    mapCurrentViewBox.height / 2;

  const width =
    mapCurrentViewBox.width *
    factor;

  const height =
    mapCurrentViewBox.height *
    factor;

  if (
    width < 80 ||
    width > 360
  ) return;

  mapCurrentViewBox = {
    x:
      centerX -
      width / 2,

    y:
      centerY -
      height / 2,

    width,
    height
  };

  clampMapViewBox();

  applyMapViewBox(svg);
}


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

      if (!mapCurrentViewBox) return;

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
      ) return;

      const deltaPixelsX =
        event.clientX - startX;

      const deltaPixelsY =
        event.clientY - startY;

      if (
        !dragging &&
        (
          Math.abs(deltaPixelsX) > 6 ||
          Math.abs(deltaPixelsY) > 6
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

      if (!dragging) return;

      event.preventDefault();

      const rect =
        svg.getBoundingClientRect();

      if (
        rect.width === 0 ||
        rect.height === 0
      ) return;

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
      ) return;

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


function clampMapViewBox() {

  const minX = 360;
  const maxX = 760;

  const minY = 20;
  const maxY = 315;

  mapCurrentViewBox.x =
    Math.max(
      minX,
      Math.min(
        mapCurrentViewBox.x,
        maxX -
        mapCurrentViewBox.width
      )
    );

  mapCurrentViewBox.y =
    Math.max(
      minY,
      Math.min(
        mapCurrentViewBox.y,
        maxY -
        mapCurrentViewBox.height
      )
    );
}


function applyMapViewBox(svg) {

  svg.setAttribute(
    "viewBox",
    `${mapCurrentViewBox.x} ${mapCurrentViewBox.y} ${mapCurrentViewBox.width} ${mapCurrentViewBox.height}`
  );
}


// ============================================================
// FIN TEST
// ============================================================

function showTestFinished() {

  const total =
    testQuestions.length;

  const percentage =
    total
      ? Math.round(
          testScore /
          total *
          100
        )
      : 0;

  container.innerHTML = `
    <div class="review-box">

      <div class="subject-icon">
        🎯
      </div>

      <div class="review-question">
        ${testScore} / ${total}
      </div>

      <div class="review-answer">
        ${percentage} %
      </div>

      <button
        id="test-back"
        class="main-button"
      >
        Retour
      </button>

    </div>
  `;

  document
    .getElementById(
      "test-back"
    )
    .addEventListener(
      "click",
      () => {

        if (
          currentChapter.content_type ===
          "french_vocab"
        ) {

          showFrenchVocabModes(
            currentChapter
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
// REPONSES
// ============================================================

function isAcceptedWrittenAnswer(
  user,
  expected
) {

  const normalizedUser =
    normalizeAnswer(user);

  const normalizedExpected =
    normalizeAnswer(expected);

  if (
    normalizedUser ===
    normalizedExpected
  ) return true;

  const alternatives =
    String(expected)
      .split(
        /\s*\/\s*|,\s*/
      )
      .map(
        normalizeAnswer
      );

  return alternatives.includes(
    normalizedUser
  );
}


function normalizeAnswer(value) {

  return String(value || "")
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
// RETOUR
// ============================================================

function addBackButton(callback) {

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
        text-align:left;
        font-size:17px;
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
// MELANGE
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
// SECURITE HTML
// ============================================================

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
