const SUPABASE_URL = "https://bohstmyjornxpvjwmldk.supabase.co";
const SUPABASE_KEY = "sb_publishable_24le4__Z_AASUmxBRyoIGQ_5ccDOucQ";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const container = document.getElementById("subjects");
const title = document.querySelector("h1");
const subtitle = document.querySelector("header p");

async function loadSubjects() {
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

async function loadChapters(subject) {
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

  const backButton = document.createElement("div");
  backButton.className = "subject-card";
  backButton.innerHTML = `
    <div class="subject-icon">←</div>
    <div class="subject-name">Retour</div>
  `;

  backButton.addEventListener("click", loadSubjects);
  container.appendChild(backButton);

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
      alert(`Ouverture de ${chapter.name}`);
    });

    container.appendChild(card);
  });
}

loadSubjects();
