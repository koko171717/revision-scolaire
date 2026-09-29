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
// REVISION
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
      .order(
        "sort_order",
        { ascending: true }
      );


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

    container.innerHTML =
      "<p>Impossible de charger les chapitres.</p>";

    return;
  }


  allSubjectChapters =
    data || [];


  renderChapterLevel(null);
}


// ============================================================
// NAVIGATION ENTRE LES NIVEAUX
// ============================================================

function renderChapterLevel(parentId) {

  container.innerHTML = "";


  const children =
    allSubjectChapters
      .filter(chapter => {

        if (parentId === null) {

          return (
            chapter.parent_chapter_id === null
          );
        }

        return (
          Number(
            chapter.parent_chapter_id
          ) ===
          Number(parentId)
        );
      })
      .sort(
        (a, b) =>
          (a.sort_order || 0) -
          (b.sort_order || 0)
      );


  if (
    navigationStack.length === 0
  ) {

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

      const parent =
        navigationStack[
          navigationStack.length - 1
        ];

      renderChapterLevel(
        parent.id
      );
    }
  });


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


  children.forEach(chapter => {

    const hasChildren =
      allSubjectChapters.some(
        possibleChild =>
          Number(
            possibleChild.parent_chapter_id
          ) ===
          Number(chapter.id)
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
      chapter.content_type === "french_vocab"
    ) {

      description =
        "Vocabulaire";

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
// ICONES
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
    chapter.name.includes("Unit")
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
    chapter.name === "Words and phrases"
  ) {
    return "💬";
  }

  if (
    chapter.name === "Everyday English"
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

  if (
    chapter.content_type === "french_vocab"
  ) {
    return "📖";
  }

  if (hasChildren) {
    return "📂";
  }

  return "📘";
}


// ============================================================
// MODES D'UN CHAPITRE
// ============================================================

function showModes(chapter) {

  currentChapter = chapter;


  // ----------------------------------------------------------
  // VOCABULAIRE FRANCAIS
  // ----------------------------------------------------------

  if (
    chapter.content_type ===
    "french_vocab"
  ) {

    showFrenchVocabModes(
      chapter
    );

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


  // ----------------------------------------------------------
  // REVISION
  // ----------------------------------------------------------

  const revision =
    document.createElement("div");

  revision.className =
    "subject-card";


  let revisionIcon = "📚";
  let revisionDescription =
    "Cartes de révision";


  if (
    chapter.content_type === "flags"
  ) {

    revisionIcon = "🏳️";
    revisionDescription =
      "Drapeau → pays";

  } else if (
    chapter.content_type === "map"
  ) {

    revisionIcon = "🗺️";
    revisionDescription =
      "Retrouve les pays sur la carte";
  }


  revision.innerHTML = `
    <div class="subject-icon">
      ${revisionIcon}
    </div>

    <div class="subject-name">
      Révision
    </div>

    <div class="mode-description">
      ${revisionDescription}
    </div>
  `;


  revision.addEventListener(
    "click",
    () => {

      if (
        chapter.content_type === "flags"
      ) {

        startFlagReview(
          chapter
        );

      } else if (
        chapter.content_type === "map"
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
    revision
  );


  // ----------------------------------------------------------
  // TEST
  // ----------------------------------------------------------

  const test =
    document.createElement("div");


  if (
    chapter.test_mode === "disabled"
  ) {

    test.className =
      "subject-card disabled-card";

    test.innerHTML = `
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

    test.className =
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
      chapter.content_type === "flags"
    ) {

      description =
        "Choisis le bon drapeau";

    } else if (
      chapter.content_type === "map"
    ) {

      description =
        "Retrouve 20 pays";
    }


    test.innerHTML = `
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


    test.addEventListener(
      "click",
      () => {

        if (
          chapter.content_type === "flags"
        ) {

          startFlagTest(
            chapter
          );

        } else if (
          chapter.content_type === "map"
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
    test
  );
}


// ============================================================
// VOCABULAIRE FRANCAIS - MODES
// ============================================================

function showFrenchVocabModes(
  chapter
) {

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

      name:
        "Fiche de révision",

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

      name:
        "Apprentissage",

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

      name:
        "Définition → mot",

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

      name:
        "Phrase à trou",

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

      name:
        "Dictée",

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

      name:
        "Contraires",

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


    container.appendChild(
      card
    );
  });
}


// ============================================================
// FICHE DE REVISION FRANCAIS
// ============================================================

async function startFrenchRevisionSheet(
  chapter
) {

  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Fiche de révision";

  container.innerHTML =
    "<p>Chargement...</p>";


  const cards =
    await loadCards(
      chapter
    );

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


  const heading =
    document.createElement("div");


  heading.innerHTML = `
    <h2 style="
      margin-top:0;
      margin-bottom:8px;
    ">
      📄 Fiche de révision
    </h2>

    <p style="
      color:#6b7280;
      margin-bottom:30px;
    ">
      Mot • définition • supplément
    </p>
  `;


  sheet.appendChild(
    heading
  );


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
        margin-bottom:
        ${card.supplement ? "8px" : "0"};
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
              font-size:16px;
              line-height:1.5;
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


    sheet.appendChild(
      row
    );
  });


  const bottomBack =
    document.createElement(
      "button"
    );


  bottomBack.className =
    "secondary-button";

  bottomBack.textContent =
    "← Retour";


  bottomBack.addEventListener(
    "click",
    () =>
      showFrenchVocabModes(
        chapter
      )
  );


  sheet.appendChild(
    bottomBack
  );

  container.appendChild(
    sheet
  );
}


// ============================================================
// APPRENTISSAGE FRANCAIS
// ============================================================

async function startFrenchLearning(
  chapter
) {

  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Apprentissage";

  container.innerHTML =
    "<p>Chargement...</p>";


  const cards =
    await loadCards(
      chapter
    );

  if (!cards) return;


  frenchLearningCards =
    cards.map(
      card => ({
        ...card
      })
    );


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
    frenchLearningCards
      .filter(
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
    <div class="review-box qcm-card">

      <div class="qcm-topbar">

        <div class="qcm-counter">
          Carte ${frenchLearningIndex + 1}
          <span>
            sur ${frenchLearningCards.length}
          </span>
        </div>

        <div class="qcm-score">
          ⭐ ${frenchLearningScore}
        </div>

      </div>


      <div class="review-question">
        ${escapeHtml(
          current.answer
        )}
      </div>


      <div style="
        color:#6b7280;
        margin-bottom:25px;
      ">
        Choisis la bonne définition.
      </div>


      <div class="qcm-grid">

        ${options.map(
          (option, index) => `

            <button
              class="qcm-choice french-learning-choice"
              data-id="${option.id}"
            >

              <span class="qcm-letter">
                ${["A", "B", "C", "D"][index]}
              </span>

              <span style="
                text-align:left;
                line-height:1.4;
              ">
                ${escapeHtml(
                  option.definition ||
                  option.question
                )}
              </span>

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

          const selectedId =
            Number(
              button.dataset.id
            );


          const buttons =
            document.querySelectorAll(
              ".french-learning-choice"
            );


          buttons.forEach(
            currentButton => {

              currentButton.disabled =
                true;


              if (
                Number(
                  currentButton.dataset.id
                ) ===
                Number(current.id)
              ) {

                currentButton
                  .classList
                  .add(
                    "qcm-correct"
                  );
              }
            }
          );


          const feedback =
            document.getElementById(
              "french-learning-feedback"
            );


          feedback
            .classList
            .remove(
              "hidden"
            );


          if (
            selectedId ===
            Number(current.id)
          ) {

            frenchLearningScore++;

            feedback.textContent =
              "✅ Correct !";

            feedback.style.color =
              "#15803d";

          } else {

            button
              .classList
              .add(
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
            .classList
            .remove(
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

  title.textContent =
    currentChapter.name;

  subtitle.textContent =
    "Apprentissage terminé";


  container.innerHTML = `
    <div class="review-box">

      <div class="subject-icon">
        🎉
      </div>

      <div class="review-question">
        Apprentissage terminé !
      </div>

      <button
        id="restart-french-learning"
        class="main-button"
      >
        Recommencer
      </button>

      <button
        id="back-french-learning"
        class="secondary-button"
      >
        Retour
      </button>

    </div>
  `;


  document
    .getElementById(
      "restart-french-learning"
    )
    .addEventListener(
      "click",
      () =>
        startFrenchLearning(
          currentChapter
        )
    );


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
// CHOIX 10 / 20 / TOUS
// ============================================================

function chooseFrenchTestLength(
  chapter,
  mode
) {

  title.textContent =
    chapter.name;


  if (
    mode === "dictation"
  ) {

    subtitle.textContent =
      "Dictée";

  } else if (
    mode === "cloze"
  ) {

    subtitle.textContent =
      "Phrase à trou";

  } else {

    subtitle.textContent =
      "Définition → mot";
  }


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

        if (
          mode === "dictation"
        ) {

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


    container.appendChild(
      card
    );
  });
}


// ============================================================
// DEFINITION -> MOT
// ============================================================

async function startFrenchWrittenTest(
  chapter,
  amount = 20
) {

  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Définition → mot";

  container.innerHTML =
    "<p>Chargement...</p>";


  const cards =
    await loadCards(
      chapter
    );

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


  if (
    amount !== "all"
  ) {

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


  const progress =
    ((currentTestIndex + 1) /
      testQuestions.length) *
    100;


  title.textContent =
    currentChapter.name;

  subtitle.textContent =
    "Définition → mot";


  container.innerHTML = `
    <div class="review-box">

      <div class="qcm-topbar">

        <div class="qcm-counter">
          Question ${currentTestIndex + 1}

          <span>
            sur ${testQuestions.length}
          </span>
        </div>

        <div class="qcm-score">
          ⭐ ${testScore}
        </div>

      </div>


      <div class="qcm-progress">

        <div
          class="qcm-progress-bar"
          style="width:${progress}%"
        ></div>

      </div>


      <div style="
        color:#6b7280;
        margin-bottom:15px;
      ">
        Quel mot ou quelle expression
        correspond à cette définition ?
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
        placeholder="Écris le mot ou l’expression"
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
          margin-top:22px;
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


    feedback
      .classList
      .remove(
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
        <br>

        <strong>
          ${escapeHtml(
            current.answer
          )}
        </strong>

        ${
          current.accepted_answers?.length
            ? `
              <br>
              <small>
                Autres réponses acceptées :
                ${escapeHtml(
                  current.accepted_answers.join(", ")
                )}
              </small>
            `
            : ""
        }
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

      if (
        event.key !== "Enter"
      ) return;


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

  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Phrase à trou";

  container.innerHTML =
    "<p>Chargement...</p>";


  const cards =
    await loadCards(
      chapter
    );

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

        answer:
          card.cloze_answer,

        accepted_answers:
          card.accepted_answers || []

      }));


  shuffleArray(
    testQuestions
  );


  if (
    amount !== "all"
  ) {

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


  const progress =
    ((currentTestIndex + 1) /
      testQuestions.length) *
    100;


  title.textContent =
    currentChapter.name;

  subtitle.textContent =
    "Phrase à trou";


  container.innerHTML = `
    <div class="review-box">

      <div class="qcm-topbar">

        <div class="qcm-counter">
          Question ${currentTestIndex + 1}

          <span>
            sur ${testQuestions.length}
          </span>
        </div>

        <div class="qcm-score">
          ⭐ ${testScore}
        </div>

      </div>


      <div class="qcm-progress">

        <div
          class="qcm-progress-bar"
          style="width:${progress}%"
        ></div>

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
          margin-top:22px;
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


    feedback
      .classList
      .remove(
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

      if (
        event.key !== "Enter"
      ) return;


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

  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Dictée";

  container.innerHTML =
    "<p>Chargement...</p>";


  const cards =
    await loadCards(
      chapter
    );

  if (!cards) return;


  testQuestions =
    cards.map(card => ({

      answer:
        card.answer,

      accepted_answers:
        card.accepted_answers || []

    }));


  shuffleArray(
    testQuestions
  );


  if (
    amount !== "all"
  ) {

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


  const progress =
    ((currentTestIndex + 1) /
      testQuestions.length) *
    100;


  title.textContent =
    currentChapter.name;

  subtitle.textContent =
    "Dictée";


  container.innerHTML = `
    <div class="review-box">

      <div class="qcm-topbar">

        <div class="qcm-counter">
          Mot ${currentTestIndex + 1}

          <span>
            sur ${testQuestions.length}
          </span>
        </div>

        <div class="qcm-score">
          ⭐ ${testScore}
        </div>

      </div>


      <div class="qcm-progress">

        <div
          class="qcm-progress-bar"
          style="width:${progress}%"
        ></div>

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
          margin-top:22px;
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


  const speak = () => {

    speakFrenchWord(
      current.answer
    );
  };


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


    /*
      En dictée, on teste l'orthographe du mot entendu.
      On ne valide donc PAS les synonymes.

      Si l'app prononce "sinueux",
      il faut écrire "sinueux".
    */

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


    feedback
      .classList
      .remove(
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

      if (
        event.key !== "Enter"
      ) return;


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


  /*
    Tentative de lecture automatique.
    Sur iPhone/iPad, Safari peut exiger
    un premier clic sur "Écouter".
  */

  setTimeout(
    speak,
    400
  );
}


// ============================================================
// SYNTHESE VOCALE
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

function showOppositeDirectionChoice(
  chapter
) {

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
      title:
        "Mot → contraire",
      direction:
        "forward"
    },

    {
      icon: "⬅️",
      title:
        "Contraire → mot",
      direction:
        "reverse"
    },

    {
      icon: "🔀",
      title:
        "Les deux",
      direction:
        "both"
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


    container.appendChild(
      card
    );
  });
}


async function startOppositeCards(
  chapter,
  direction
) {

  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Cartes des contraires";

  container.innerHTML =
    "<p>Chargement...</p>";


  const cards =
    await loadCards(
      chapter
    );

  if (!cards) return;


  oppositeQuestions = [];


  cards
    .filter(
      card =>
        card.opposite
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


  showOppositeCard(
    direction
  );
}


function showOppositeCard(
  direction
) {

  if (
    oppositeIndex >=
    oppositeQuestions.length
  ) {

    showOppositeFinished(
      direction
    );

    return;
  }


  const current =
    oppositeQuestions[
      oppositeIndex
    ];


  subtitle.textContent =
    `Contraire ${oppositeIndex + 1}/${oppositeQuestions.length}`;


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


      <button
        id="quit-opposites"
        class="secondary-button review-back-button"
      >
        ← Quitter
      </button>

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
          .classList
          .remove(
            "hidden"
          );


        document
          .getElementById(
            "show-opposite"
          )
          .classList
          .add(
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

        showOppositeCard(
          direction
        );
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

        showOppositeCard(
          direction
        );
      }
    );


  document
    .getElementById(
      "quit-opposites"
    )
    .addEventListener(
      "click",
      () =>
        showOppositeDirectionChoice(
          currentChapter
        )
    );
}


function showOppositeFinished(
  direction
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
        id="restart-opposites"
        class="main-button"
      >
        Recommencer
      </button>

      <button
        id="back-opposites"
        class="secondary-button"
      >
        Retour
      </button>

    </div>
  `;


  document
    .getElementById(
      "restart-opposites"
    )
    .addEventListener(
      "click",
      () =>
        startOppositeCards(
          currentChapter,
          direction
        )
    );


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
}


// ============================================================
// RETOUR GENERIQUE AUX CHAPITRES
// ============================================================

function goBackToChapterList() {

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

  let forwardDescription =
    "Question → réponse";

  let reverseDescription =
    "Réponse → question";


  if (
    currentSubject?.name === "Anglais"
  ) {

    forwardTitle =
      "Anglais → Français";

    reverseTitle =
      "Français → Anglais";

    forwardDescription =
      "Ex. mother → mère";

    reverseDescription =
      "Ex. mère → mother";
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
      title:
        forwardTitle,
      description:
        forwardDescription,
      direction:
        "forward"
    },

    {
      icon: "⬅️",
      title:
        reverseTitle,
      description:
        reverseDescription,
      direction:
        "reverse"
    },

    {
      icon: "🔀",
      title:
        "Les deux",
      description:
        "Mélange les deux sens",
      direction:
        "both"
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


    container.appendChild(
      card
    );
  });
}


// ============================================================
// CHARGEMENT DES CARTES
// ============================================================

async function loadCards(
  chapter
) {

  const { data, error } =
    await supabaseClient
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

    container.innerHTML =
      "<p>Impossible de charger les questions.</p>";

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
          showModes(
            chapter
          )
      );


    return null;
  }


  return data;
}


// ============================================================
// CONSTRUCTION DES QUESTIONS
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

  title.textContent =
    chapter.name;

  subtitle.textContent =
    "Mode Révision";

  container.innerHTML =
    "<p>Chargement...</p>";


  const cards =
    await loadCards(
      chapter
    );

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

  subtitle.textContent =
    `Question ${currentQuestionIndex + 1} sur ${reviewQuestions.length}`;


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


      <button
        id="quit-review"
        class="secondary-button review-back-button"
      >
        ← Quitter
      </button>

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
          .classList
          .remove(
            "hidden"
          );

        document
          .getElementById(
            "show-answer"
          )
          .classList
          .add(
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

        reviewQuestions.push(
          reviewQuestions[
            currentQuestionIndex
          ]
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
      () =>
        showModes(
          currentChapter
        )
    );
}


// ============================================================
// FIN REVISION
// ============================================================

function showReviewFinished(
  direction
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

      <button
        id="restart-review"
        class="main-button"
      >
        Nouvelle révision
      </button>

      <button
        id="back-review"
        class="secondary-button"
      >
        Retour
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
          currentChapter.content_type ===
          "flags"
        ) {

          startFlagReview(
            currentChapter
          );

        } else if (
          currentChapter.content_type ===
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
// TEST ECRIT GENERIQUE
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
    await loadCards(
      chapter
    );

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
          Question ${currentTestIndex + 1}

          <span>
            sur ${testQuestions.length}
          </span>
        </div>

        <div class="qcm-score">
          ⭐ ${testScore}
        </div>

      </div>


      <div class="qcm-progress">

        <div
          class="qcm-progress-bar"
          style="width:${progress}%"
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
          margin-top:22px;
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
        id="quit-written"
        class="secondary-button"
      >
        ← Quitter
      </button>

    </div>
  `;


  const input =
    document.getElementById(
      "written-answer"
    );


  input.focus();


  const validate = () => {

    const value =
      input.value.trim();


    if (!value) return;


    const correct =
      isAcceptedWrittenAnswer(
        value,
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


    feedback
      .classList
      .remove(
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


  input.addEventListener(
    "keydown",
    event => {

      if (
        event.key !== "Enter"
      ) return;


      if (!input.disabled) {

        validate();

      } else {

        currentTestIndex++;

        showWrittenTestQuestion(
          direction
        );
      }
    }
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
      "quit-written"
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
    await loadCards(
      chapter
    );

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


  shuffleArray(
    options
  );


  const progress =
    ((currentTestIndex + 1) /
      testQuestions.length) *
    100;


  container.innerHTML = `
    <div class="review-box qcm-card">

      <div class="qcm-topbar">

        <div class="qcm-counter">
          Question ${currentTestIndex + 1}

          <span>
            sur ${testQuestions.length}
          </span>
        </div>

        <div class="qcm-score">
          ⭐ ${testScore}
        </div>

      </div>


      <div class="qcm-progress">

        <div
          class="qcm-progress-bar"
          style="width:${progress}%"
        ></div>

      </div>


      <div class="review-question">
        ${escapeHtml(
          current.question
        )}
      </div>


      <div class="qcm-grid">

        ${options.map(
          (option, index) => `

            <button
              class="qcm-choice"
              data-answer="${encodeURIComponent(option)}"
            >

              <span class="qcm-letter">
                ${["A", "B", "C", "D"][index]}
              </span>

              <span>
                ${escapeHtml(option)}
              </span>

            </button>

          `
        ).join("")}

      </div>


      <div
        id="qcm-feedback"
        class="hidden"
        style="
          margin-top:20px;
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
        ← Quitter
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
        () =>
          answerQcm(
            button,
            current.answer
          )
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
      answer ===
      correctAnswer
    ) {

      button
        .classList
        .add(
          "qcm-correct"
        );
    }
  });


  const selected =
    decodeURIComponent(
      selectedButton.dataset.answer
    );


  const feedback =
    document.getElementById(
      "qcm-feedback"
    );


  feedback
    .classList
    .remove(
      "hidden"
    );


  if (
    selected ===
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
    .classList
    .remove(
      "hidden"
    );
}


// ============================================================
// DRAPEAUX - REVISION
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
    await loadCards(
      chapter
    );

  if (!cards) return;


  reviewQuestions =
    cards
      .filter(
        card =>
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

    showReviewFinished(
      "forward"
    );

    return;
  }


  const current =
    reviewQuestions[
      currentQuestionIndex
    ];


  subtitle.textContent =
    `Question ${currentQuestionIndex + 1} sur ${reviewQuestions.length}`;


  container.innerHTML = `
    <div class="review-box">

      <div class="review-question">
        Quel pays correspond à ce drapeau ?
      </div>


      <div class="flag-display">

        <img
          src="${current.image_url}"
          class="flag-main-image"
          alt="Drapeau"
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
      "show-flag"
    )
    .addEventListener(
      "click",
      () => {

        document
          .getElementById(
            "flag-answer"
          )
          .classList
          .remove(
            "hidden"
          );

        document
          .getElementById(
            "show-flag"
          )
          .classList
          .add(
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
    await loadCards(
      chapter
    );

  if (!cards) return;


  currentMapCards =
    cards.filter(
      card =>
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
    currentMapCards
      .filter(
        card =>
          card.id !== correct.id
      );


  shuffleArray(
    wrong
  );


  const options = [
    correct,
    ...wrong.slice(0, 3)
  ];


  shuffleArray(
    options
  );


  container.innerHTML = `
    <div class="review-box">

      <div class="qcm-topbar">

        <div class="qcm-counter">
          Question ${currentTestIndex + 1}

          <span>
            sur ${testQuestions.length}
          </span>
        </div>

        <div class="qcm-score">
          ⭐ ${testScore}
        </div>

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

          const selected =
            Number(
              button.dataset.id
            );


          document
            .querySelectorAll(
              ".flag-choice-button"
            )
            .forEach(
              currentButton => {

                currentButton.disabled =
                  true;


                if (
                  Number(
                    currentButton.dataset.id
                  ) ===
                  Number(correct.id)
                ) {

                  currentButton
                    .classList
                    .add(
                      "qcm-correct"
                    );
                }
              }
            );


          const feedback =
            document.getElementById(
              "flag-feedback"
            );


          feedback
            .classList
            .remove(
              "hidden"
            );


          if (
            selected ===
            Number(correct.id)
          ) {

            testScore++;

            feedback.textContent =
              "✅ Correct !";

            feedback.style.color =
              "#15803d";

          } else {

            button
              .classList
              .add(
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
            .classList
            .remove(
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
// CARTE EUROPE - REVISION
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
    await loadCards(
      chapter
    );

  if (!cards) return;


  currentMapCards =
    cards.filter(
      card =>
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

    showReviewFinished(
      "forward"
    );

    return;
  }


  const current =
    reviewQuestions[
      currentQuestionIndex
    ];


  subtitle.textContent =
    `Question ${currentQuestionIndex + 1} sur ${reviewQuestions.length}`;


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
// CARTE EUROPE - TEST
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
    await loadCards(
      chapter
    );

  if (!cards) return;


  currentMapCards =
    cards.filter(
      card =>
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
                Question ${index + 1}

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

    mapContainer.innerHTML =
      "<p>Impossible de charger la carte.</p>";
  }
}


// ============================================================
// PREPARATION CARTE
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
    currentMapCards.map(
      card =>
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


  applyMapViewBox(
    svg
  );
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
        centerX -
        size / 2
      );

      hit.setAttribute(
        "y",
        centerY -
        size / 2
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
        "Zone de clic impossible :",
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

  const correct =
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


// ============================================================
// REPONSE CARTE
// ============================================================

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


  svg
    .querySelectorAll(
      ".map-country, .map-small-hit"
    )
    .forEach(element => {

      element.style.pointerEvents =
        "none";
    });


  if (
    clicked === correct
  ) {

    clickedCountry
      ?.classList
      .add(
        "map-country-correct"
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

    clickedCountry
      ?.classList
      .add(
        "map-country-wrong"
      );


    correctCountry
      ?.classList
      .add(
        "map-country-correct"
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


  feedback
    .classList
    .remove(
      "hidden"
    );


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

function setupMapNavigation(
  svg
) {

  setupMapZoom(
    svg
  );

  setupMapPan(
    svg
  );

  setupMouseWheelZoom(
    svg
  );
}


// ============================================================
// ZOOM CARTE
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


  zoomIn
    ?.addEventListener(
      "click",
      () =>
        zoomMap(
          svg,
          0.8
        )
    );


  zoomOut
    ?.addEventListener(
      "click",
      () =>
        zoomMap(
          svg,
          1.25
        )
    );


  reset
    ?.addEventListener(
      "click",
      () => {

        mapCurrentViewBox = {
          ...mapOriginalViewBox
        };

        applyMapViewBox(
          svg
        );
      }
    );
}


function setupMouseWheelZoom(
  svg
) {

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


function zoomMap(
  svg,
  factor
) {

  if (
    !mapCurrentViewBox
  ) return;


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
  ) {
    return;
  }


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

  applyMapViewBox(
    svg
  );
}


// ============================================================
// PAN / DRAG CARTE
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

      if (
        !mapCurrentViewBox
      ) return;


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

      applyMapViewBox(
        svg
      );
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

  if (
    !mapCurrentViewBox
  ) return;


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

function applyMapViewBox(
  svg
) {

  if (
    !mapCurrentViewBox
  ) return;


  svg.setAttribute(
    "viewBox",
    `${mapCurrentViewBox.x} ${mapCurrentViewBox.y} ${mapCurrentViewBox.width} ${mapCurrentViewBox.height}`
  );
}


// ============================================================
// FIN DE TEST
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
    "Continue à t’entraîner 💪";


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
        id="test-back"
        class="main-button"
      >
        Retour au chapitre
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
// VALIDATION REPONSES GENERIQUES
// ============================================================

function isAcceptedWrittenAnswer(
  user,
  expected
) {

  const normalizedUser =
    normalizeAnswer(
      user
    );


  const normalizedExpected =
    normalizeAnswer(
      expected
    );


  if (
    normalizedUser ===
    normalizedExpected
  ) {
    return true;
  }


  /*
    Pour le vocabulaire anglais :
    permet plusieurs traductions écrites
    sous la forme :
    "duvet, couette"
    ou
    "Va-t-en ! / Allez-vous en !"
  */

  const alternatives =
    String(expected)
      .split(
        /\s*\/\s*|,\s*/
      )
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


// ============================================================
// NORMALISATION
// ============================================================

function normalizeAnswer(value) {

  return String(
    value || ""
  )
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


  container.appendChild(
    back
  );
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
// SECURISER LE TEXTE HTML
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
