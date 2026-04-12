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
  targetCompany: document.getElementById("targetCompany"),
  targetRole: document.getElementById("targetRole"),
  accent: document.getElementById("accent"),
  layoutMode: document.getElementById("layoutMode")
};

const coach = {
  score: document.getElementById("readinessScore"),
  summary: document.getElementById("scoreSummary"),
  checklist: document.getElementById("coachChecklist")
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

const storageKey = "pankajEliteResumeStudioData";

function normalize(text) {
  return text.toLowerCase();
}

function hasMetric(text) {
  return /(\d+%|\d+\+|\$\d+|\d+x)/i.test(text);
}

function countStrongBullets(entries) {
  const actionVerbs = [
    "built", "designed", "launched", "improved", "optimized", "reduced", "scaled", "implemented", "led", "automated"
  ];

  return entries.filter((item) => {
    const body = `${item.title} ${item.org} ${item.desc}`.toLowerCase();
    const hasAction = actionVerbs.some((verb) => body.includes(verb));
    return hasAction && hasMetric(body);
  }).length;
}

function renderCoachItems(items) {
  coach.checklist.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = item.ok ? "pass" : "warn";
    li.textContent = `${item.ok ? "PASS" : "IMPROVE"}: ${item.text}`;
    coach.checklist.appendChild(li);
  });
}

function updateReadinessScore(experienceData, projectData) {
  let score = 0;
  const checks = [];

  const hasIdentity = Boolean(fields.name.value.trim() && fields.headline.value.trim() && fields.email.value.trim());
  checks.push({ ok: hasIdentity, text: "Identity section includes name, role headline, and professional email." });
  if (hasIdentity) score += 12;

  const summary = fields.summary.value.trim();
  const summaryStrong = summary.length >= 90 && hasMetric(summary);
  checks.push({ ok: summaryStrong, text: "Summary is impact-focused and includes measurable outcomes." });
  if (summaryStrong) score += 18;

  const skillCount = fields.skills.value.split(",").map((s) => s.trim()).filter(Boolean).length;
  const skillStrong = skillCount >= 8;
  checks.push({ ok: skillStrong, text: "Skills list has at least 8 relevant strengths for technical screening." });
  if (skillStrong) score += 15;

  const strongExpBullets = countStrongBullets(experienceData);
  const expStrong = experienceData.length >= 2 && strongExpBullets >= 2;
  checks.push({ ok: expStrong, text: "Experience has at least 2 entries with action + metrics (STAR style)." });
  if (expStrong) score += 25;

  const strongProjectBullets = countStrongBullets(projectData);
  const projectStrong = projectData.length >= 2 && strongProjectBullets >= 1;
  checks.push({ ok: projectStrong, text: "Projects show ownership and measurable impact with modern tech stack." });
  if (projectStrong) score += 15;

  const targetCompany = normalize(fields.targetCompany.value.trim());
  const targetRole = normalize(fields.targetRole.value.trim());
  const fullText = normalize(`${fields.headline.value} ${fields.skills.value} ${summary} ${experienceData.map((e) => e.desc).join(" ")} ${projectData.map((p) => p.desc).join(" ")}`);

  const companyKeywords = targetCompany.includes("google")
    ? ["scale", "distributed", "latency", "reliability", "ownership"]
    : targetCompany.includes("amazon")
      ? ["customer", "ownership", "deliver", "automate", "efficiency"]
      : ["leadership", "impact", "optimization", "scalability", "execution"];

  const hits = companyKeywords.filter((k) => fullText.includes(k)).length;
  const companyAligned = Boolean(targetCompany || targetRole) && hits >= 2;
  checks.push({ ok: companyAligned, text: "Content is tailored to target role/company keywords used in top-tier interviews." });
  if (companyAligned) score += 15;

  if (!targetCompany && !targetRole) {
    coach.summary.textContent = "Tip: Add a target company and role for sharper Google/Amazon style guidance.";
  } else if (score >= 80) {
    coach.summary.textContent = "Strong draft. Your resume is interview-ready for top-tier screening rounds.";
  } else if (score >= 60) {
    coach.summary.textContent = "Good direction. Improve highlighted areas to become highly competitive.";
  } else {
    coach.summary.textContent = "Needs strengthening. Focus on quantified impact, targeted keywords, and stronger bullets.";
  }

  coach.score.textContent = `${score}/100`;
  renderCoachItems(checks);
}

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
  const experienceData = getCardData(lists.experience);
  const educationData = getCardData(lists.education);
  const projectData = getCardData(lists.projects);

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

  renderEntries(preview.experience, experienceData, "No experience added yet.");
  renderEntries(preview.education, educationData, "No education added yet.");
  renderEntries(preview.projects, projectData, "No projects added yet.");

  updateReadinessScore(experienceData, projectData);

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

function addCard(type, initial = {}, skipSync = false) {
  const templateId = type === "projects" ? "projectTemplate" : `${type}Template`;
  const template = document.getElementById(templateId);
  const card = template.content.firstElementChild.cloneNode(true);

  card.querySelector(".title").value = initial.title || "";
  card.querySelector(".org").value = initial.org || "";
  card.querySelector(".duration").value = initial.duration || "";
  card.querySelector(".desc").value = initial.desc || "";

  lists[type].appendChild(card);
  bindCardEvents(card);
  if (!skipSync) {
    syncPreview();
  }
}

function sanitizeEntries(entries) {
  const seen = new Set();
  const cleaned = [];

  entries.forEach((item) => {
    const normalized = {
      title: (item?.title || "").trim(),
      org: (item?.org || "").trim(),
      duration: (item?.duration || "").trim(),
      desc: (item?.desc || "").trim()
    };

    const isEmpty = !normalized.title && !normalized.org && !normalized.duration && !normalized.desc;
    const key = `${normalized.title}|${normalized.org}|${normalized.duration}|${normalized.desc}`;

    if (isEmpty) {
      return;
    }

    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push(normalized);
    }
  });

  return cleaned;
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
      targetCompany: fields.targetCompany.value,
      targetRole: fields.targetRole.value,
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
      const entries = sanitizeEntries(Array.isArray(data[type]) ? data[type] : []);
      if (!entries.length) {
        addCard(type, {}, true);
      } else {
        entries.forEach((entry) => addCard(type, entry, true));
      }
    });

    syncPreview();
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
