const subjects = [
  { name: "Géographie", icon: "🌍" },
  { name: "Sciences", icon: "🔬" },
  { name: "Français", icon: "📖" },
  { name: "Allemand", icon: "🇩🇪" },
  { name: "Anglais", icon: "🇬🇧" },
  { name: "Économie et droit", icon: "⚖️" }
];

const container = document.getElementById("subjects");

subjects.forEach(subject => {
  const card = document.createElement("div");
  card.className = "subject-card";

  card.innerHTML = `
    <div class="subject-icon">${subject.icon}</div>
    <div class="subject-name">${subject.name}</div>
  `;

  card.addEventListener("click", () => {
    alert(`Ouverture de ${subject.name}`);
  });

  container.appendChild(card);
});
