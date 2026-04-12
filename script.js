const resumeEl = document.getElementById("resume");

const fields = {
  name: document.getElementById("name"),
  headline: document.getElementById("headline"),
  email: document.getElementById("email"),
  phone: document.getElementById("phone"),
  location: document.getElementById("location"),
  website: document.getElementById("website"),
  summary: document.getElementById("summary"),
  skills: document.getElementById("skills"),
  accent: document.getElementById("accent"),
  layoutMode: document.getElementById("layoutMode")
};

const preview = {
  name: document.getElementById("pName"),
  headline: document.getElementById("pHeadline"),
  email: document.getElementById("pEmail"),
  phone: document.getElementById("pPhone"),
  location: document.getElementById("pLocation"),
  website: document.getElementById("pWebsite"),
  summary: document.getElementById("pSummary"),
  skills: document.getElementById("pSkills"),
  experience: document.getElementById("pExperience"),
  education: document.getElementById("pEducation"),
  projects: document.getElementById("pProjects")
};

const lists = {
  experience: document.getElementById("experienceList"),
  education: document.getElementById("educationList"),
  projects: document.getElementById("projectList")
};

const defaults = {
  name: "Your Name",
  headline: "Your Role",
  email: "email@example.com",
  phone: "+1 000 000 0000",
  location: "City, Country",
  website: "your-site.com",
  summary: "Your summary appears here."
};

const storageKey = "novaResumeBuilderData";

function getCardData(listEl) {
  return Array.from(listEl.querySelectorAll(".card-item")).map((card) => ({
    title: card.querySelector(".title").value.trim(),
    org: card.querySelector(".org").value.trim(),
    duration: card.querySelector(".duration").value.trim(),
    desc: card.querySelector(".desc").value.trim()
  }));
}

function renderEntries(target, entries, emptyText) {
  target.innerHTML = "";
  const useful = entries.filter((item) => item.title || item.org || item.duration || item.desc);

  if (!useful.length) {
    const p = document.createElement("p");
    p.className = "entry-desc";
    p.textContent = emptyText;
    target.appendChild(p);
    return;
  }

  useful.forEach((item) => {
    const wrap = document.createElement("article");
    wrap.className = "entry";

    const top = document.createElement("div");
    top.className = "entry-top";

    const title = document.createElement("p");
    title.className = "entry-title";
    title.textContent = item.title || item.org || "Untitled";

    const duration = document.createElement("p");
    duration.className = "entry-org";
    duration.textContent = item.duration;

    const org = document.createElement("p");
    org.className = "entry-org";
    org.textContent = item.org;

    const desc = document.createElement("p");
    desc.className = "entry-desc";
    desc.textContent = item.desc;

    top.appendChild(title);
    if (item.duration) {
      top.appendChild(duration);
    }

    wrap.appendChild(top);
    if (item.org) {
      wrap.appendChild(org);
    }
    if (item.desc) {
      wrap.appendChild(desc);
    }

    target.appendChild(wrap);
  });
}

function syncPreview() {
  preview.name.textContent = fields.name.value.trim() || defaults.name;
  preview.headline.textContent = fields.headline.value.trim() || defaults.headline;
  preview.email.textContent = fields.email.value.trim() || defaults.email;
  preview.phone.textContent = fields.phone.value.trim() || defaults.phone;
  preview.location.textContent = fields.location.value.trim() || defaults.location;
  preview.website.textContent = fields.website.value.trim() || defaults.website;
  preview.summary.textContent = fields.summary.value.trim() || defaults.summary;

  const skillTokens = fields.skills.value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  preview.skills.innerHTML = "";
  if (!skillTokens.length) {
    const fallback = document.createElement("li");
    fallback.textContent = "Your skills";
    preview.skills.appendChild(fallback);
  } else {
    skillTokens.forEach((skill) => {
      const li = document.createElement("li");
      li.textContent = skill;
      preview.skills.appendChild(li);
    });
  }

  renderEntries(preview.experience, getCardData(lists.experience), "No experience added yet.");
  renderEntries(preview.education, getCardData(lists.education), "No education added yet.");
  renderEntries(preview.projects, getCardData(lists.projects), "No projects added yet.");

  document.documentElement.style.setProperty("--accent", fields.accent.value);

  resumeEl.classList.remove("split", "single");
  resumeEl.classList.add(fields.layoutMode.value);

  persist();
}

function bindCardEvents(card) {
  card.addEventListener("input", syncPreview);
  const removeBtn = card.querySelector(".remove");
  removeBtn.addEventListener("click", () => {
    card.remove();
    syncPreview();
  });
}

function addCard(type, initial = {}) {
  const templateId = `${type}Template`;
  const template = document.getElementById(templateId);
  const card = template.content.firstElementChild.cloneNode(true);

  card.querySelector(".title").value = initial.title || "";
  card.querySelector(".org").value = initial.org || "";
  card.querySelector(".duration").value = initial.duration || "";
  card.querySelector(".desc").value = initial.desc || "";

  lists[type].appendChild(card);
  bindCardEvents(card);
  syncPreview();
}

function gatherState() {
  return {
    fields: {
      name: fields.name.value,
      headline: fields.headline.value,
      email: fields.email.value,
      phone: fields.phone.value,
      location: fields.location.value,
      website: fields.website.value,
      summary: fields.summary.value,
      skills: fields.skills.value,
      accent: fields.accent.value,
      layoutMode: fields.layoutMode.value
    },
    experience: getCardData(lists.experience),
    education: getCardData(lists.education),
    projects: getCardData(lists.projects)
  };
}

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(gatherState()));
}

function restore() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    addCard("experience");
    addCard("education");
    addCard("projects");
    return;
  }

  try {
    const data = JSON.parse(raw);

    Object.keys(data.fields || {}).forEach((key) => {
      if (fields[key]) {
        fields[key].value = data.fields[key];
      }
    });

    ["experience", "education", "projects"].forEach((type) => {
      lists[type].innerHTML = "";
      const entries = Array.isArray(data[type]) ? data[type] : [];
      if (!entries.length) {
        addCard(type);
      } else {
        entries.forEach((entry) => addCard(type, entry));
      }
    });
  } catch {
    addCard("experience");
    addCard("education");
    addCard("projects");
  }
}

function resetAll() {
  localStorage.removeItem(storageKey);

  Object.entries(fields).forEach(([key, el]) => {
    if (key === "accent") {
      el.value = "#0f9d8c";
      return;
    }
    if (key === "layoutMode") {
      el.value = "split";
      return;
    }
    el.value = "";
  });

  Object.values(lists).forEach((list) => {
    list.innerHTML = "";
  });

  addCard("experience");
  addCard("education");
  addCard("projects");
  syncPreview();
}

document.getElementById("addExperience").addEventListener("click", () => addCard("experience"));
document.getElementById("addEducation").addEventListener("click", () => addCard("education"));
document.getElementById("addProject").addEventListener("click", () => addCard("projects"));

document.getElementById("downloadBtn").addEventListener("click", () => window.print());
document.getElementById("clearBtn").addEventListener("click", resetAll);

Object.values(fields).forEach((input) => {
  input.addEventListener("input", syncPreview);
  input.addEventListener("change", syncPreview);
});

restore();
syncPreview();
