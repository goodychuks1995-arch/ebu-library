import { useEffect, useState } from "react";
import "./App.css";
import "./subjects.css";

const FOOTER_DOCS = [
  ["About us", "/About_Us.pdf"],
  ["Contact us", "/Contact_Us.pdf"],
  ["Privacy policy", "/Privacy_Policy.pdf"],
  ["Disclaimer", "/Disclaimer.pdf"],
  ["Terms and Condition", "/TERMS AND CONDITIONS.docx.pdf"],
];

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const LEVELS = ["ALL CLASSES", "JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];
const TERMS = ["ALL TERMS", "FIRST TERM", "SECOND TERM", "THIRD TERM"];
const NAV_KEY = "bta_nav";
const BANK = { bank: "Opay", name: "Nwaokeafor Chukwuebuka Goodluck", number: "9022019744" };

const money = (kobo) => `₦${(Number(kobo || 0) / 100).toLocaleString("en-NG")}`;

const NAV_ITEMS = [
  { key: "home", label: "Home" },
  {
    key: "student",
    label: "Student Resources",
    children: [
      { label: "Lesson notes", level: "ALL CLASSES" },
      { label: "Textbooks & study guides", section: "studyguides" },
      { label: "Scholarship opportunities", section: "scholarships" },
      { label: "CBT", section: "CBT" },
    ],
  },
  {
    key: "teachers",
    label: "Teachers' Resources",
    children: [
      { label: "All lesson notes", level: "ALL CLASSES" },
      { label: "JSS 1 notes", level: "JSS 1" },
      { label: "JSS 2 notes", level: "JSS 2" },
      { label: "JSS 3 notes", level: "JSS 3" },
      { label: "SS 1 notes", level: "SS 1" },
      { label: "SS 2 notes", level: "SS 2" },
      { label: "SS 3 notes", level: "SS 3" },
      { label: "Schemes of work", section: "schemes" },
      { label: "Lesson plans", section: "lessonplans" },
    ],
  },
  { key: "courses", label: "Online Courses" },
  {
    key: "school",
    label: "School Resources",
    children: [
      { label: "Overview", section: "school" },
      { label: "Timetables", section: "timetables" },
      { label: "Schemes of work", section: "schemes" },
      { label: "School management", section: "management" },
    ],
  },
  {
    key: "admissions",
    label: "Admission Resources",
    children: [
      { label: "JAMB guide", section: "jamb" },
      { label: "Post-UTME", section: "postutme" },
      { label: "Universities & courses", section: "universities" },
      { label: "Polytechnics & colleges of education", section: "polytechnics" },
      { label: "Requirements & cut-off marks", section: "cutoffs" },
      { label: "Past questions & answers", section: "pastquestions" },
    ],
  },
  { key: "seller", label: "Become a Seller" },
  { key: "news", label: "News" },
];

const SECTIONS = {
  student: {
    parent: "student",
    title: "Student Resources",
    blurb: "Revision notes, study guides and past questions for JSS 1 – SS 3 students.",
  },
  school: {
    parent: "school",
    title: "School Resources",
    blurb: "Tools and materials for schools: timetables, schemes of work, and school management.",
  },
  seller: {
    title: "Become a Seller",
    blurb: "Teachers and creators can sell study materials and courses to learners across Nigeria.",
  },
  pastquestions: {
    parent: "admissions",
    title: "Past Questions & Answers",
    blurb: "Past JAMB, WAEC and NECO questions with worked answers, arranged by subject and year.",
  },
  CBT: {
    parent: "student",
    title: "CBT Practice",
    blurb: "Computer-based practice for JAMB, WAEC and NECO exams.",
  },
  courses: {
    title: "Online Courses",
    blurb: "Learn at your own pace with structured video courses, anytime and anywhere.",
  },
  studyguides: {
    parent: "student",
    title: "Textbooks & Study Guides",
    blurb: "Recommended textbooks and short, clear study guides to help you revise any topic quickly.",
  },
  scholarships: {
    parent: "student",
    title: "Scholarship Opportunities",
    blurb: "Scholarships and grants for Nigerian students, with deadlines and how to apply.",
  },
  jamb: {
    parent: "admissions",
    title: "JAMB Guide",
    blurb: "Registration steps, syllabus, subject combinations and tips for the UTME.",
  },
  postutme: {
    parent: "admissions",
    title: "Post-UTME",
    blurb: "How Post-UTME screening works and how to prepare for it.",
  },
  universities: {
    parent: "admissions",
    title: "Universities & Courses",
    blurb: "Find universities and the courses they offer, with the subjects each one requires.",
  },
  polytechnics: {
    parent: "admissions",
    title: "Polytechnics & Colleges of Education",
    blurb: "Admission guides for polytechnics, monotechnics and colleges of education.",
  },
  cutoffs: {
    parent: "admissions",
    title: "Requirements & Cut-off Marks",
    blurb: "Admission requirements and cut-off marks, explained clearly.",
  },
  schemes: {
    parent: "teachers",
    title: "Schemes of Work",
    blurb: "Termly schemes of work for JSS 1 – SS 3, ready to adapt for your school.",
  },
  lessonplans: {
    parent: "teachers",
    title: "Lesson Plans",
    blurb: "Ready-to-use weekly lesson plans for every class and subject.",
  },
  timetables: {
    parent: "school",
    title: "Timetables",
    blurb: "Timetable templates and tools for planning the school week.",
  },
  management: {
    parent: "school",
    title: "School Management",
    blurb: "Tools for admissions, records, fees and reporting.",
  },
};

function loadNav() {
  try {
    return JSON.parse(sessionStorage.getItem(NAV_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function getArticleLevel(article = {}) {
  const [level] = (article.description || "").split(" - ");
  const match = (level || "").trim().match(/^(JSS|SS)\s*([123])$/i);
  return match ? `${match[1].toUpperCase()} ${match[2]}` : "General";
}

function getArticleTerm(article = {}) {
  const byNumber = { 1: "FIRST TERM", 2: "SECOND TERM", 3: "THIRD TERM" };
  const numeric = article.term ?? article.term_number ?? article.term_no ?? article.term_id;
  if (byNumber[Number(numeric)]) return byNumber[Number(numeric)];

  const skip = new Set(["preview_text", "body", "content"]);
  const raw = Object.entries(article)
    .filter(([key]) => !skip.has(key))
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
    .filter((value) => typeof value === "string")
    .join(" ");
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {}
  const text = decoded.toLowerCase().replace(/[_\-.+]+/g, " ");

  if (/\b(first|1st|1)\s*term\b|\bterm\s*(1|one|i)\b/.test(text)) return "FIRST TERM";
  if (/\b(second|2nd|2)\s*term\b|\bterm\s*(2|two|ii)\b/.test(text)) return "SECOND TERM";
  if (/\b(third|3rd|3)\s*term\b|\bterm\s*(3|three|iii)\b/.test(text)) return "THIRD TERM";
  return "General";
}

function getArticleSubject(article = {}) {
  const parts = (article.description || "").split(" - ").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return "General";
  const subject = parts.slice(1).join(" - ").replace(/_/g, " ");
  return subject.length <= 4 ? subject : subject.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getArticleWeek(article = {}) {
  const title = article.title || "";
  const patterns = [
    /(?:week|wk)\s*[-: ]?0?(\d{1,2})/i,
    /(?:^|[\s-])0?(\d{1,2})(?=\s*[_-]\s*[A-Za-z]|\s+[A-Za-z])/,
    /(?:^|[\s-])0?(\d{1,2})(?=\s*[A-Z][a-z])/,
  ];
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return Number(match[1]);
  }
  return Number.MAX_SAFE_INTEGER;
}

function getSubjectWeekRange(items = []) {
  const weeks = items.map(getArticleWeek).filter((w) => Number.isFinite(w) && w !== Number.MAX_SAFE_INTEGER);
  if (!weeks.length) return null;
  const min = Math.min(...weeks);
  const max = Math.max(...weeks);
  return min === max ? `Week ${min}` : `Weeks ${min}–${max}`;
}

function tokenExpired(token) {
  try {
    const { exp } = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return Boolean(exp) && exp * 1000 < Date.now();
  } catch {
    return false;
  }
}

let pendingRequests = 0;
const loadingListeners = new Set();
const trackRequests = (change) => {
  pendingRequests += change;
  loadingListeners.forEach((listener) => listener(pendingRequests));
};

async function api(path, options = {}) {
  trackRequests(1);
  try {
    const token = localStorage.getItem("article_token");
    const headers = {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_URL}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && token && !path.startsWith("/auth/")) {
      localStorage.removeItem("article_token");
      localStorage.removeItem("article_user");
      window.dispatchEvent(new Event("session-expired"));
    }
    if (!response.ok) throw new Error(data.error || data.message || "Something went wrong");
    return data;
  } finally {
    trackRequests(-1);
  }
}

async function downloadFile(articleId) {
  const data = await api(`/downloads/${articleId}`);
  window.location.href = data.url;
}

async function getViewUrl(articleId) {
  const data = await api(`/downloads/${articleId}/view`);
  return data.url;
}

function App() {
  const [articles, setArticles] = useState([]);
  const [news, setNews] = useState([]);
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("article_token");
    if (token && tokenExpired(token)) {
      localStorage.removeItem("article_token");
      localStorage.removeItem("article_user");
      return null;
    }
    try {
      return JSON.parse(localStorage.getItem("article_user") || "null");
    } catch {
      return null;
    }
  });
  const saved = loadNav();
  const restorable = user ? saved.view : ["section", "news"].includes(saved.view) ? saved.view : null;
  const [view, setView] = useState(restorable || "catalog");
  const [section, setSection] = useState(saved.section || null);
  const [selected, setSelected] = useState(null);
  const [selectedId, setSelectedId] = useState(saved.selectedId || null);
  const [modal, setModal] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState(saved.level || "ALL CLASSES");
  const [notice, setNotice] = useState("");
  const [showReturnToTop, setShowReturnToTop] = useState(false);
  const [busyCount, setBusyCount] = useState(0);
  const [loadingLevel, setLoadingLevel] = useState(0);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [manualFor, setManualFor] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState(saved.term || "ALL TERMS");
  const [openMenu, setOpenMenu] = useState(null);
  const [menuX, setMenuX] = useState(0);
  const [collectionParent, setCollectionParent] = useState("teachers");
  const isBusy = busyCount > 0;

  useEffect(() => {
    if (!user) return;
    setArticlesLoading(true);
    api("/articles")
      .then(setArticles)
      .catch((error) => setNotice(error.message))
      .finally(() => setArticlesLoading(false));
  }, [user]);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setPurchases([]);
      setSelected(null);
      setView("catalog");
      setNotice("Your session expired. Please sign in again.");
      setModal("login");
    };
    window.addEventListener("session-expired", onExpired);
    return () => window.removeEventListener("session-expired", onExpired);
  }, []);

  useEffect(() => {
    loadingListeners.add(setBusyCount);
    return () => loadingListeners.delete(setBusyCount);
  }, []);

  useEffect(() => {
    if (!isBusy) {
      setLoadingLevel(0);
      return;
    }
    const showBar = setTimeout(() => setLoadingLevel(1), 250);
    const showMessage = setTimeout(() => setLoadingLevel(2), 4000);
    return () => {
      clearTimeout(showBar);
      clearTimeout(showMessage);
    };
  }, [isBusy]);

  useEffect(() => {
    if (view !== "news") return;
    setNewsLoading(true);
    api("/news")
      .then(setNews)
      .catch((error) => setNotice(error.message))
      .finally(() => setNewsLoading(false));
  }, [view]);

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    const onKey = (event) => event.key === "Escape" && close();
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  useEffect(() => {
    if (!user) return;
    setPurchasesLoading(true);
    api("/purchases")
      .then(setPurchases)
      .catch(() => {})
      .finally(() => setPurchasesLoading(false));
  }, [user]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        NAV_KEY,
        JSON.stringify({
          view,
          section,
          level: selectedLevel,
          term: selectedTerm,
          selectedId: selected ? selected.id : null,
        }),
      );
    } catch {}
  }, [view, section, selectedLevel, selectedTerm, selected]);

  useEffect(() => {
    if (!selectedId || selected || !articles.length) return;
    const found = articles.find((a) => String(a.id) === String(selectedId));
    if (found) setSelected(found);
    setSelectedId(null);
  }, [articles, selectedId, selected]);

  useEffect(() => {
    const handleScroll = () => setShowReturnToTop(window.scrollY > 400);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredArticles = articles
    .filter((article) =>
      `${article.title} ${article.description || ""}`.toLowerCase().includes(search.toLowerCase()),
    )
    .filter((article) => selectedTerm === "ALL TERMS" || getArticleTerm(article) === selectedTerm);

  const visibleArticles =
    selectedLevel === "ALL CLASSES"
      ? filteredArticles
      : filteredArticles.filter((article) => getArticleLevel(article) === selectedLevel);

  const classGroups = LEVELS.filter((level) => level !== "ALL CLASSES")
    .map((level) => {
      const items = (selectedLevel === "ALL CLASSES" ? filteredArticles : visibleArticles).filter(
        (article) => getArticleLevel(article) === level,
      );
      const subjectGroups = Array.from(new Set(items.map((article) => getArticleSubject(article))))
        .map((subject) => ({
          subject,
          items: items
            .filter((article) => getArticleSubject(article) === subject)
            .sort((a, b) => {
              const weekDiff = getArticleWeek(a) - getArticleWeek(b);
              return weekDiff !== 0 ? weekDiff : (a.title || "").localeCompare(b.title || "");
            }),
        }))
        .sort((a, b) => a.subject.localeCompare(b.subject));
      return { level, total: items.length, subjectGroups };
    })
    .filter((group) => group.total > 0);

  const groupedDisplay =
    selectedLevel === "ALL CLASSES" ? classGroups : classGroups.filter((group) => group.level === selectedLevel);

  const owned = (id) => purchases.some((purchase) => String(purchase.article_id) === String(id));

  const goCatalog = () => {
    setView("catalog");
    setSelected(null);
  };

  const browseCollection = (level = "ALL CLASSES") => {
    if (!user) return setModal("login");
    setSelected(null);
    setSelectedLevel(level);
    setView("collection");
  };

  // Single entry point for every nav link
  function navigate(key, options = {}) {
    setSelected(null);
    window.scrollTo({ top: 0 });
    if (key === "about") return window.open("/About_Us.pdf", "_blank", "noopener");
    if (key === "home") return goCatalog();
    if (key === "teachers") return browseCollection(options.level);
    if (key === "news") return setView("news");
    if (key === "library") return setView("library");
    if (SECTIONS[key]) {
      setSection(key);
      setView("section");
    }
  }

  function toggleMenu(event, key) {
    event.stopPropagation();
    if (openMenu === key) return setOpenMenu(null);
    const rect = event.currentTarget.getBoundingClientRect();
    const half = Math.min(340, window.innerWidth - 24) / 2;
    const center = rect.left + rect.width / 2;
    setMenuX(Math.min(Math.max(center, half + 12), window.innerWidth - half - 12));
    setOpenMenu(key);
  }

  function openChild(parentKey, child) {
    setOpenMenu(null);
    setCollectionParent(parentKey);
    if (child.section) return navigate(child.section);
    browseCollection(child.level);
  }

  const openItem = NAV_ITEMS.find((item) => item.key === openMenu);
  const activeKey =
    view === "catalog"
      ? "home"
      : view === "collection"
        ? collectionParent
        : view === "section"
          ? SECTIONS[section]?.parent || section
          : view === "news"
            ? "news"
            : view === "library"
              ? "library"
              : null;

  function saveSession(data) {
    localStorage.setItem("article_token", data.token);
    localStorage.setItem("article_user", JSON.stringify(data.user));
    setUser(data.user);
    setModal(null);
  }

  async function authenticate(form, mode) {
    try {
      saveSession(await api(`/auth/${mode}`, { method: "POST", body: JSON.stringify(form) }));
    } catch (error) {
      setNotice(error.message);
    }
  }

  function logout() {
    localStorage.removeItem("article_token");
    localStorage.removeItem("article_user");
    sessionStorage.removeItem(NAV_KEY);
    setUser(null);
    setPurchases([]);
    goCatalog();
  }

  function focusSearch() {
    if (view !== "collection") return browseCollection();
    document.querySelector(".search-input")?.focus();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={goCatalog}>
          <span className="brand-mark">B</span>
          <span>
            BINARY THINKER'S
            <br />
            <small>ACADEMY</small>
          </span>
        </button>

        <nav>
          {NAV_ITEMS.map((item) =>
            item.children ? (
              <button
                key={item.key}
                className={`nav-parent${activeKey === item.key ? " active" : ""}${openMenu === item.key ? " open" : ""}`}
                aria-haspopup="true"
                aria-expanded={openMenu === item.key}
                onClick={(event) => toggleMenu(event, item.key)}
              >
                {item.label} <span className="caret">▾</span>
              </button>
            ) : (
              <button
                key={item.key}
                className={activeKey === item.key ? "active" : ""}
                onClick={() => navigate(item.key)}
              >
                {item.label}
              </button>
            ),
          )}
          {user && (
            <button className={view === "library" ? "active" : ""} onClick={() => navigate("library")}>
              My library
            </button>
          )}
          {user && (
            <button
              className={view === "requests" ? "active" : ""}
              onClick={() => {
                setSelected(null);
                setView("requests");
              }}
            >
              My payments
            </button>
          )}
          {user?.role === "admin" && (
            <button
              className={view === "adminpayments" ? "active" : ""}
              onClick={() => {
                setSelected(null);
                setView("adminpayments");
              }}
            >
              Payments
            </button>
          )}
        </nav>

        <div className="top-actions">
          <button className="search-button" onClick={focusSearch}>
            ⌕ <span>Search</span>
          </button>
          {user ? (
            <button className="profile" onClick={logout}>
              {user.name?.slice(0, 1).toUpperCase()} <span>Sign out</span>
            </button>
          ) : (
            <button className="button button-dark" onClick={() => setModal("login")}>
              Sign in
            </button>
          )}
        </div>

        {openItem && (
          <div className="nav-dropdown" style={{ left: menuX }} role="menu">
            {openItem.children.map((child) => (
              <button key={child.label} role="menuitem" onClick={() => openChild(openItem.key, child)}>
                {child.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {notice && (
        <div className="notice">
          {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}

      {loadingLevel >= 1 && <div className="loading-bar" role="progressbar" aria-label="Loading" />}
      {loadingLevel >= 2 && (
        <div className="loading-toast" role="status">
          Still working... The server may be waking up, which can take up to a minute on the first visit.
        </div>
      )}

      {view === "catalog" && !selected && (
        <main>
          <section className="hero">
            <div>
              <p className="eyebrow">CURATED FOR THE CURIOUS</p>
              <h1>
                Make space
                <br />
                <em>for better thinking.</em>
              </h1>
              <p className="hero-copy">
                A considered library of lesson notes, field guides, and deep dives for the days when you want to
                learn with intention.
              </p>
              <button className="button button-accent" onClick={() => browseCollection()}>
                Browse the collection <span>↘</span>
              </button>
              <ul className="trust">
                <li>JSS 1 – SS 3</li>
                <li>Weekly lesson notes</li>
                <li>Instant download</li>
              </ul>
            </div>
            <div className="hero-art">
              <img src="/BinaryThinker Academy Student Success.png" alt="Binarythinker Academy" />
            </div>
          </section>
        </main>
      )}

      {view === "section" && section && SECTIONS[section] && (
        <SectionPage
          {...SECTIONS[section]}
          onBrowse={() => {
            setCollectionParent(SECTIONS[section].parent || "teachers");
            browseCollection();
          }}
          onHome={() => navigate("home")}
        />
      )}

      {view === "collection" && !selected && (
        <main className="collection">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE COLLECTION</p>
              <h2>
                Notes worth
                <br />
                <em>keeping close.</em>
              </h2>
            </div>
            <div className="collection-tools">
              <span>{visibleArticles.length} titles</span>
              <input
                className="search-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search notes..."
              />
            </div>
          </div>

          <div className="class-filter" aria-label="Term filter">
            {TERMS.map((term) => (
              <button
                key={term}
                type="button"
                className={selectedTerm === term ? "active" : ""}
                onClick={() => setSelectedTerm(term)}
              >
                {term}
              </button>
            ))}
          </div>

          <div className="class-filter" aria-label="Class filter">
            {LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                className={selectedLevel === level ? "active" : ""}
                onClick={() => setSelectedLevel(level)}
              >
                {level}
              </button>
            ))}
          </div>

          {articlesLoading ? (
            <Skeletons />
          ) : groupedDisplay.length ? (
            groupedDisplay.map((group) => (
              <div className="level-group" key={group.level} data-level={group.level}>
                <div className="group-heading">
                  <span>{group.level}</span>
                  <small>{group.total} notes</small>
                </div>
                {group.subjectGroups.map((subjectGroup) => {
                  const weekRange = getSubjectWeekRange(subjectGroup.items);
                  return (
                    <section className="subject-group subject-panel" key={`${group.level}-${subjectGroup.subject}`}>
                      <div className="subject-heading">
                        <span>{subjectGroup.subject}</span>
                        <small>
                          {weekRange
                            ? `${weekRange} · ${subjectGroup.items.length} files`
                            : `${subjectGroup.items.length} files`}
                        </small>
                      </div>
                      <div className="article-grid">
                        {subjectGroup.items.map((article, index) => (
                          <ArticleCard
                            key={article.id}
                            article={article}
                            index={index}
                            onOpen={() => setSelected(article)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="empty">No articles match this level yet. Try another class or search.</div>
          )}
        </main>
      )}

      {view === "collection" && selected && (
        <ArticleDetail
          article={selected}
          onBack={() => setSelected(null)}
          onManualPay={() => (user ? setManualFor(selected) : setModal("login"))}
          onDownload={() => downloadFile(selected.id).catch((error) => setNotice(error.message))}
          onRead={getViewUrl}
          owned={owned(selected.id)}
        />
      )}

      {view === "library" && (
        <Library
          purchases={purchases}
          loading={purchasesLoading}
          onDownload={(id) => downloadFile(id).catch((error) => setNotice(error.message))}
        />
      )}

      {view === "adminpayments" && user?.role === "admin" && <AdminPayments setNotice={setNotice} />}
      {view === "requests" && user && <MyRequests articles={articles} setNotice={setNotice} />}

      {view === "news" && (
        <News
          items={news}
          loading={newsLoading}
          isAdmin={user?.role === "admin"}
          onChange={setNews}
          setNotice={setNotice}
        />
      )}

      <footer>
        <span>© 2026 BINARY THINKERS</span>
        <div className="footer-links">
          {FOOTER_DOCS.map(([label, href]) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer">
              {label}
            </a>
          ))}
        </div>
        <span>Think clearly. Learn deeply.</span>
      </footer>

      {showReturnToTop && (
        <button
          className="return-to-top"
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Return to top"
        >
          ↑ <span>Return to top</span>
        </button>
      )}

      {manualFor && (
        <ManualPayModal
          article={manualFor}
          onClose={() => setManualFor(null)}
          onDone={() => {
            setManualFor(null);
            setSelected(null);
            setView("requests");
            setNotice("Proof received. We'll unlock it in My library once your payment is confirmed.");
            window.scrollTo({ top: 0 });
          }}
          setNotice={setNotice}
        />
      )}

      {modal && (
        <AuthModal
          mode={modal}
          onClose={() => setModal(null)}
          onSubmit={authenticate}
          onSwitch={() => setModal(modal === "login" ? "signup" : "login")}
        />
      )}
    </div>
  );
}

function AuthModal({ mode, onClose, onSubmit, onSwitch }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="auth-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          await onSubmit(form, mode === "login" ? "login" : "signup");
          setBusy(false);
        }}
      >
        <button type="button" className="close" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">BINARY THINKERS</p>
        <h2>{mode === "login" ? "Welcome back." : "Make an account."}</h2>
        {mode === "signup" && (
          <label>
            Name
            <input required value={form.name} onChange={set("name")} />
          </label>
        )}
        <label>
          Email
          <input required type="email" value={form.email} onChange={set("email")} />
        </label>
        <label>
          Password
          <input required type="password" value={form.password} onChange={set("password")} />
        </label>
        <button className="button button-dark" disabled={busy}>
          {busy ? "Please wait..." : `${mode === "login" ? "Sign in" : "Create account"} ↗`}
        </button>
        <button type="button" className="text-button" onClick={onSwitch}>
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
        <button type="button" className="text-button" onClick={onClose}>
          Cancel
        </button>
      </form>
    </div>
  );
}

function ManualPayModal({ article, onClose, onDone, setNotice }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      const data = new FormData();
      data.append("articleId", article.id);
      data.append("proof", file);
      await api("/payments/manual", { method: "POST", body: data });
      setDone(true);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={done ? onDone : onClose}>
      <form className="auth-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <button type="button" className="close" onClick={done ? onDone : onClose}>
          ×
        </button>
        <p className="eyebrow">PAY BY BANK TRANSFER</p>
        {done ? (
          <>
            <h2>Proof received.</h2>
            <p>We'll confirm your payment and unlock "{article.title}" in My library. This can take a few hours.</p>
            <button type="button" className="button button-dark" onClick={onDone}>
              Done ↗
            </button>
          </>
        ) : (
          <>
            <h2>{article.title}</h2>
            <p>
              Transfer exactly <strong>{money(article.price_kobo)}</strong> to:
            </p>
            <p>
              <strong>{BANK.bank}</strong>
              <br />
              {BANK.name}
              <br />
              {BANK.number}
            </p>
            <p>In the transfer narration, write the email you signed up with.</p>
            <label>
              Upload proof of payment (JPG, PNG or PDF, max 5 MB)
              <input
                required
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(e) => setFile(e.target.files[0] || null)}
              />
            </label>
            <button className="button button-dark" disabled={busy}>
              {busy ? "Uploading..." : "Submit proof"} ↗
            </button>
            <button type="button" className="text-button" onClick={onClose}>
              Cancel
            </button>
          </>
        )}
      </form>
    </div>
  );
}

function MyRequests({ articles, setNotice }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api("/payments/manual/mine")
      .then(setRows)
      .catch((e) => {
        setNotice(e.message);
        setRows([]);
      });
  }, []);

  const titleOf = (id) => articles.find((a) => String(a.id) === String(id))?.title || "Article";
  const label = {
    pending: "Awaiting confirmation",
    approved: "Approved · in My library",
    rejected: "Rejected",
  };
  const when = (d) =>
    new Date(d).toLocaleString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <main className="library">
      <p className="eyebrow">YOUR PAYMENTS</p>
      <h1>
        My <em>payments.</em>
      </h1>
      <p className="subhead">Proofs you've sent and where they stand.</p>
      <div className="library-list">
        {rows === null ? (
          <div className="empty">Loading...</div>
        ) : rows.length ? (
          rows.map((r) => (
            <div className="library-item" key={r.id}>
              <div>
                <p className={`status-badge status-${r.status}`}>{label[r.status] || r.status}</p>
                <h3>{titleOf(r.article_id)}</h3>
                <p>
                  {r.reference} · {when(r.created_at)}
                </p>
                {r.status === "rejected" && r.note && <p>Reason: {r.note}</p>}
                {r.status === "rejected" && <p>You can submit a new proof from the article page.</p>}
              </div>
            </div>
          ))
        ) : (
          <div className="empty">You haven't submitted any payment proof yet.</div>
        )}
      </div>
    </main>
  );
}

function AdminPayments({ setNotice }) {
  const [rows, setRows] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = () =>
    api("/payments/admin/manual")
      .then(setRows)
      .catch((e) => setNotice(e.message));

  useEffect(() => {
    load();
  }, []);

  async function act(id, action) {
    if (action === "reject" && !window.confirm("Reject this payment?")) return;
    setBusyId(id);
    try {
      await api(`/payments/admin/manual/${id}/${action}`, { method: "POST", body: JSON.stringify({}) });
      setNotice(action === "approve" ? "Approved. Article unlocked." : "Rejected.");
      load();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="library">
      <p className="eyebrow">ADMIN</p>
      <h1>
        Pending <em>payments.</em>
      </h1>
      <div className="library-list">
        {rows.length ? (
          rows.map((r) => (
            <div className="library-item" key={r.id}>
              <div>
                <h3>{r.article_title}</h3>
                <p>
                  {r.user_name} · {r.user_email}
                </p>
                <p>
                  {money(r.amount_kobo)} · {r.reference}
                </p>
                <a href={r.proof_url} target="_blank" rel="noopener noreferrer">
                  View proof ↗
                </a>
              </div>
              <div>
                <button className="button button-dark" disabled={busyId === r.id} onClick={() => act(r.id, "approve")}>
                  Approve
                </button>{" "}
                <button className="button button-outline" disabled={busyId === r.id} onClick={() => act(r.id, "reject")}>
                  Reject
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty">No pending payments.</div>
        )}
      </div>
    </main>
  );
}

function Skeletons({ count = 6 }) {
  return (
    <div className="skeleton-grid" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div className="skeleton-card" key={i} />
      ))}
    </div>
  );
}

function SectionPage({ title, blurb, cta, onBrowse, onHome }) {
  return (
    <main className="section-page">
      <p className="eyebrow">BINARY THINKER'S ACADEMY</p>
      <h1>{title}</h1>
      <p className="subhead">{blurb}</p>
      <div className="section-actions">
        {cta ? (
          <a className="button button-accent" href={cta.href} target="_blank" rel="noopener noreferrer">
            {cta.label} <span>↗</span>
          </a>
        ) : (
          <p className="section-soon">This section is coming soon.</p>
        )}
        <button className="button button-outline" onClick={onBrowse}>
          Browse lesson notes <span>↘</span>
        </button>
        <button className="text-button" onClick={onHome}>
          ← Back to home
        </button>
      </div>
    </main>
  );
}

function ArticleCard({ article, index, onOpen }) {
  const term = getArticleTerm(article);
  return (
    <button className={`article-card card-${index % 4}`} onClick={onOpen}>
      <div className="card-art">
        <span>NO. {String(index + 1).padStart(2, "0")}</span>
        <b>{article.title?.slice(0, 1)}</b>
      </div>
      <div className="card-content">
        <div>
          <p className="card-kicker">
            {term !== "General" && `${term} · `}
            {article.is_premium ? "PREMIUM NOTE" : "OPEN ACCESS"}
          </p>
          <h3>{article.title}</h3>
        </div>
        <strong>{money(article.price_kobo)}</strong>
      </div>
    </button>
  );
}

function ArticleDetail({ article, onBack, onManualPay, onDownload, onRead, owned }) {
  const [readerUrl, setReaderUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canAccess = owned || !article.is_premium;

  async function openReader() {
    setBusy(true);
    setError("");
    try {
      setReaderUrl(await onRead(article.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="detail">
      <button className="back" onClick={onBack}>
        ← Back to collection
      </button>
      <div className="detail-layout">
        <div className="detail-art">
          <span>
            FIELD
            <br />
            NOTE
          </span>
          <strong>{article.title?.slice(0, 1)}</strong>
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{article.is_premium ? "PREMIUM NOTE" : "OPEN ACCESS"}</p>
          <h1>{article.title}</h1>
          <p className="detail-description">
            {article.description || article.preview_text || "A considered piece of study material for curious minds."}
          </p>
          <div className="rule" />
          <p className="preview">
            {article.preview_text || "Read, reflect, and return to the ideas that stay with you."}
          </p>
          {canAccess ? (
            <div className="detail-actions">
              <button className="button button-accent" onClick={openReader} disabled={busy}>
                {busy ? "Opening..." : "Read online"} <span>↗</span>
              </button>
              <button className="button button-outline" onClick={onDownload}>
                {owned ? "Download your copy" : "Download free"} <span>↓</span>
              </button>
            </div>
          ) : (
            <button className="button button-dark" onClick={onManualPay}>
              {`Buy · ${money(article.price_kobo)} · Pay by bank transfer`} <span>↗</span>
            </button>
          )}
          {error && <p className="reader-error">{error}</p>}
        </div>
      </div>
      {readerUrl && (
        <section className="reader">
          <div className="reader-bar">
            <strong>{article.title}</strong>
            <div className="reader-actions">
              <a className="reader-link" href={readerUrl} target="_blank" rel="noopener noreferrer">
                Open in new tab
              </a>
              <button className="reader-link" onClick={onDownload}>
                Download
              </button>
              <button className="reader-link" onClick={() => setReaderUrl("")}>
                Close
              </button>
            </div>
          </div>
          <iframe className="reader-frame" src={readerUrl} title={article.title} />
        </section>
      )}
    </main>
  );
}

function Library({ purchases, loading, onDownload }) {
  return (
    <main className="library">
      <p className="eyebrow">YOUR READING ROOM</p>
      <h1>
        My <em>library.</em>
      </h1>
      <p className="subhead">The ideas you chose to keep.</p>
      <div className="library-list">
        {loading && !purchases.length ? (
          <Skeletons count={3} />
        ) : purchases.length ? (
          purchases.map((purchase) => (
            <div className="library-item" key={purchase.id}>
              <div className="mini-art">{purchase.title?.slice(0, 1)}</div>
              <div>
                <p className="card-kicker">ADDED TO YOUR LIBRARY</p>
                <h3>{purchase.title}</h3>
                <p>{purchase.description}</p>
              </div>
              <button className="button button-outline" onClick={() => onDownload(purchase.article_id)}>
                Download ↗
              </button>
            </div>
          ))
        ) : (
          <div className="empty">Your library is quiet for now. Find something worth bringing home.</div>
        )}
      </div>
    </main>
  );
}

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^https?:\/\//.test(part))
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer">
          {part}
        </a>
      );
    return part;
  });
}

function FormattedBody({ text = "", title = "" }) {
  let content = text.replace(/\r/g, "").trim();
  const lead = `# ${title}`;
  if (content.startsWith(lead)) content = content.slice(lead.length).trim();
  const lines = content
    .replace(/\s(#{1,3})\s/g, "\n$1 ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks = [];
  let list = null;
  lines.forEach((line) => {
    const bullet = line.match(/^[-*]\s+(.*)/);
    const numbered = line.match(/^\d+\.\s+(.*)/);
    if (bullet || numbered) {
      const type = bullet ? "ul" : "ol";
      if (!list || list.type !== type) {
        list = { type, items: [] };
        blocks.push(list);
      }
      list.items.push((bullet || numbered)[1]);
      return;
    }
    list = null;
    const heading = line.match(/^(#{1,3})\s+(.*)/);
    blocks.push(heading ? { type: "h", text: heading[2] } : { type: "p", text: line });
  });
  return (
    <div className="body">
      {blocks.map((block, i) => {
        if (block.type === "h") return <h4 key={i}>{block.text}</h4>;
        if (block.type === "p") return <p key={i}>{renderInline(block.text)}</p>;
        const Tag = block.type;
        return (
          <Tag key={i}>
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </Tag>
        );
      })}
    </div>
  );
}

function excerpt(body = "", title = "", max = 200) {
  let text = body.replace(/\r/g, "").trim();
  if (text.startsWith(`# ${title}`)) text = text.slice(title.length + 2);
  text = text
    .replace(/\*\*/g, "")
    .replace(/#{1,3}\s/g, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function News({ items, loading, isAdmin, onChange, setNotice }) {
  const [form, setForm] = useState({ title: "", body: "", image: null });
  const [fileKey, setFileKey] = useState(0);
  const [openId, setOpenId] = useState(null);
  const story = items.find((item) => item.id === openId);

  const formatDate = (item) =>
    new Date(item.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });

  function openStory(id) {
    setOpenId(id);
    window.scrollTo({ top: 0 });
  }

  async function publish(event) {
    event.preventDefault();
    try {
      const data = new FormData();
      data.append("title", form.title);
      data.append("body", form.body);
      if (form.image) data.append("image", form.image);
      const item = await api("/news", { method: "POST", body: data });
      onChange([item, ...items]);
      setForm({ title: "", body: "", image: null });
      setFileKey((key) => key + 1);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this post?")) return;
    try {
      await api(`/news/${id}`, { method: "DELETE" });
      onChange(items.filter((item) => item.id !== id));
      setOpenId(null);
    } catch (error) {
      setNotice(error.message);
    }
  }

  if (story) {
    return (
      <main className="news">
        <button className="back" onClick={() => setOpenId(null)}>
          ← Back to news
        </button>
        <article className="news-item story">
          <small>{formatDate(story)}</small>
          <h1 className="story-title">{story.title}</h1>
          {story.image_url && <img className="news-image" src={story.image_url} alt={story.title} />}
          <FormattedBody text={story.body} title={story.title} />
          {isAdmin && (
            <button className="text-button" onClick={() => remove(story.id)}>
              Delete
            </button>
          )}
        </article>
      </main>
    );
  }

  return (
    <main className="news news-list">
      <p className="eyebrow">LATEST UPDATES</p>
      <h1>
        The <em>news.</em>
      </h1>
      <p className="news-intro">JAMB, WAEC, admissions and school updates, explained clearly.</p>
      {isAdmin && (
        <form className="news-form" onSubmit={publish}>
          <input
            required
            placeholder="Headline"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <textarea
            required
            rows={4}
            placeholder="Write the update..."
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
          />
          <input
            key={fileKey}
            type="file"
            accept="image/*"
            onChange={(event) => setForm({ ...form, image: event.target.files[0] || null })}
          />
          <button className="button button-dark">Publish ↗</button>
        </form>
      )}
      {loading && !items.length ? (
        <Skeletons count={4} />
      ) : items.length ? (
        <>
          {items.slice(0, 1).map((item) => (
            <article className={`news-featured${item.image_url ? "" : " no-img"}`} key={item.id}>
              {item.image_url && <img className="news-featured-img" src={item.image_url} alt={item.title} />}
              <div className="news-featured-body">
                <span className="news-tag">Latest</span>
                <small className="news-date">{formatDate(item)}</small>
                <h2>
                  <button className="news-headline" onClick={() => openStory(item.id)}>
                    {item.title}
                  </button>
                </h2>
                <p className="news-excerpt">{excerpt(item.body, item.title, 260)}</p>
                <button className="read-more" onClick={() => openStory(item.id)}>
                  Read full story →
                </button>
              </div>
            </article>
          ))}
          <div className="news-grid">
            {items.slice(1).map((item) => (
              <article className="news-card" key={item.id}>
                {item.image_url ? (
                  <img className="news-card-img" src={item.image_url} alt={item.title} />
                ) : (
                  <div className="news-card-ph">B</div>
                )}
                <div className="news-card-body">
                  <small className="news-date">{formatDate(item)}</small>
                  <h3>
                    <button className="news-headline" onClick={() => openStory(item.id)}>
                      {item.title}
                    </button>
                  </h3>
                  <p className="news-excerpt">{excerpt(item.body, item.title, 140)}</p>
                  <button className="read-more" onClick={() => openStory(item.id)}>
                    Read story →
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="empty">No news yet. Check back soon.</div>
      )}
    </main>
  );
}

export default App;
