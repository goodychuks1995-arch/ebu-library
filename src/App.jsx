import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const LEVELS = ["ALL CLASSES", "JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];
const money = (kobo) => `₦${(Number(kobo || 0) / 100).toLocaleString("en-NG")}`;

function getArticleLevel(article = {}) {
  const title = article.title || "";
  const match = title.match(/^(JSS\s*1|JSS\s*2|JSS\s*3|SS\s*1|SS\s*2|SS\s*3)/i);
  if (!match) return "General";
  return match[1].replace(/\s+/g, " ").trim();
}

function getArticleSubject(article = {}) {
  const title = article.title || "";
  const parts = title
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 3) {
    return parts[1].replace(/_/g, " ").replace(/\s+/g, " ").trim();
  }

  return "General";
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
  const weeks = items
    .map((article) => getArticleWeek(article))
    .filter((week) => Number.isFinite(week) && week !== Number.MAX_SAFE_INTEGER);

  if (!weeks.length) return null;

  const minWeek = Math.min(...weeks);
  const maxWeek = Math.max(...weeks);

  return minWeek === maxWeek ? `Week ${minWeek}` : `Weeks ${minWeek}–${maxWeek}`;
}

async function api(path, options = {}) {
  const token = localStorage.getItem("article_token");
  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error || data.message || "Something went wrong");
  return data;
}

async function downloadFile(articleId) {
  const response = await fetch(`${API_URL}/downloads/${articleId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("article_token")}`,
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Download failed");
  }
  const blobUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = "article-download";
  link.click();
  URL.revokeObjectURL(blobUrl);
}

function App() {
  const [articles, setArticles] = useState([]);
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("article_user") || "null"),
  );
  const [view, setView] = useState("catalog");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("ALL CLASSES");
  const [notice, setNotice] = useState("");
  const [showReturnToTop, setShowReturnToTop] = useState(false);

  useEffect(() => {
    if (user)
      api("/articles")
        .then(setArticles)
        .catch((error) => setNotice(error.message));
    if (new URLSearchParams(window.location.search).has("reference"))
      setView("callback");
  }, [user]);
  useEffect(() => {
    if (user)
      api("/purchases")
        .then(setPurchases)
        .catch(() => {});
  }, [user]);
  useEffect(() => {
    const handleScroll = () => setShowReturnToTop(window.scrollY > 400);

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const filteredArticles = articles.filter((article) =>
    `${article.title} ${article.description || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const visibleArticles =
    selectedLevel === "ALL CLASSES"
      ? filteredArticles
      : filteredArticles.filter((article) => getArticleLevel(article) === selectedLevel);
  const classGroups = LEVELS.filter((level) => level !== "ALL CLASSES")
    .map((level) => {
      const items = (selectedLevel === "ALL CLASSES" ? filteredArticles : visibleArticles).filter(
        (article) => getArticleLevel(article) === level,
      );
      const subjectGroups = Array.from(
        new Set(items.map((article) => getArticleSubject(article))),
      )
        .map((subject) => ({
          subject,
          items: items
            .filter((article) => getArticleSubject(article) === subject)
            .sort((a, b) => {
              const weekDiff = getArticleWeek(a) - getArticleWeek(b);
              return weekDiff !== 0
                ? weekDiff
                : (a.title || "").localeCompare(b.title || "");
            }),
        }))
        .sort((a, b) => a.subject.localeCompare(b.subject));

      return {
        level,
        total: items.length,
        subjectGroups,
      };
    })
    .filter((group) => group.total > 0);
  const groupedDisplay = selectedLevel === "ALL CLASSES" ? classGroups : classGroups.filter((group) => group.level === selectedLevel);
  const owned = (id) =>
    purchases.some((purchase) => String(purchase.article_id) === String(id));
  const goCatalog = () => {
    setView("catalog");
    setSelected(null);
  };
  const browseCollection = () => {
    if (!user) return setModal("login");
    setSelected(null);
    setView("collection");
  };
  function saveSession(data) {
    localStorage.setItem("article_token", data.token);
    localStorage.setItem("article_user", JSON.stringify(data.user));
    setUser(data.user);
    setModal(null);
  }
  async function authenticate(form, mode) {
    try {
      saveSession(
        await api(`/auth/${mode}`, {
          method: "POST",
          body: JSON.stringify(form),
        }),
      );
    } catch (error) {
      setNotice(error.message);
    }
  }
  async function buy(article) {
    if (!user) return setModal("login");
    try {
      const result = await api("/payments/initialize", {
        method: "POST",
        body: JSON.stringify({ articleId: article.id }),
      });
      window.location.href = result.authorization_url;
    } catch (error) {
      setNotice(error.message);
    }
  }
  function logout() {
    localStorage.removeItem("article_token");
    localStorage.removeItem("article_user");
    setUser(null);
    setPurchases([]);
    goCatalog();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={goCatalog}>
          <span className="brand-mark">E</span>
          <span>
            Ebutech
            <br />
            <small>STUDY LIBRARY</small>
          </span>
        </button>
        <nav>
          <button
            className={view === "catalog" ? "active" : ""}
            onClick={goCatalog}
          >
            Explore
          </button>
          {user && (
            <button
              className={view === "library" ? "active" : ""}
              onClick={() => setView("library")}
            >
              My library
            </button>
          )}
        </nav>
        <div className="top-actions">
          <button
            className="search-button"
            onClick={() => document.querySelector(".search-input")?.focus()}
          >
            ⌕ <span>Search</span>
          </button>
          {user ? (
            <button className="profile" onClick={logout}>
              {user.name?.slice(0, 1).toUpperCase()} <span>Sign out</span>
            </button>
          ) : (
            <button
              className="button button-dark"
              onClick={() => setModal("login")}
            >
              Sign in
            </button>
          )}
        </div>
      </header>
      {notice && (
        <div className="notice">
          {notice}
          <button onClick={() => setNotice("")}>×</button>
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
                A considered library of lesson notes, field guides, and deep
                dives for the days when you want to learn with intention.
              </p>
              <button
                className="button button-accent"
                onClick={browseCollection}
              >
                Browse the collection <span>↘</span>
              </button>
            </div>
            <div className="hero-art">
              <div className="sun" />
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="art-note">
                ISSUE
                <br />
                <strong>07</strong>
                <br />
                <span>
                  THE FIELD
                  <br />
                  EDITION
                </span>
              </div>
            </div>
          </section>
        </main>
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

          {groupedDisplay.length ? (
            groupedDisplay.map((group) => (
              <div className="level-group" key={group.level} data-level={group.level}>
                <div className="group-heading">
                  <span>{group.level}</span>
                  <small>{group.total} notes</small>
                </div>

                {group.subjectGroups.map((subjectGroup) => {
                  const weekRange = getSubjectWeekRange(subjectGroup.items);

                  return (
                    <div className="subject-group" key={`${group.level}-${subjectGroup.subject}`}>
                      <div className="subject-heading">
                        <span>{subjectGroup.subject}</span>
                        <small>
                          {weekRange ? `${weekRange} · ${subjectGroup.items.length} files` : `${subjectGroup.items.length} files`}
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
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="empty">
              No articles match this level yet. Try another class or search.
            </div>
          )}
        </main>
      )}
      {view === "collection" && selected && (
        <ArticleDetail
          article={selected}
          onBack={() => setSelected(null)}
          onBuy={() => buy(selected)}
          onDownload={() => downloadFile(selected.id)}
          owned={owned(selected.id)}
        />
      )}
      {view === "library" && (
        <Library
          purchases={purchases}
          onDownload={(id) =>
            downloadFile(id).catch((error) => setNotice(error.message))
          }
        />
      )}
      {view === "callback" && (
        <Callback
          onDone={() => {
            setView("library");
            window.history.replaceState({}, "", "/");
          }}
          onError={setNotice}
        />
      )}
      <footer>
        <span>© 2026 Ebutech</span>
        <span>LEARN SLOWLY. REMEMBER MORE.</span>
        <span>Built for independent study.</span>
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

function ArticleCard({ article, index, onOpen }) {
  return (
    <button className={`article-card card-${index % 4}`} onClick={onOpen}>
      <div className="card-art">
        <span>NO. {String(index + 1).padStart(2, "0")}</span>
        <b>{article.title?.slice(0, 1)}</b>
      </div>
      <div className="card-content">
        <div>
          <p className="card-kicker">
            {article.is_premium ? "PREMIUM NOTE" : "OPEN ACCESS"}
          </p>
          <h3>{article.title}</h3>
        </div>
        <strong>{money(article.price_kobo)}</strong>
      </div>
    </button>
  );
}
function ArticleDetail({ article, onBack, onBuy, onDownload, owned }) {
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
          <p className="eyebrow">
            {article.is_premium ? "PREMIUM NOTE" : "OPEN ACCESS"}
          </p>
          <h1>{article.title}</h1>
          <p className="detail-description">
            {article.description ||
              article.preview_text ||
              "A considered piece of study material for curious minds."}
          </p>
          <div className="rule" />
          <p className="preview">
            {article.preview_text ||
              "Read, reflect, and return to the ideas that stay with you."}
          </p>
          {owned || !article.is_premium ? (
            <button className="button button-accent" onClick={onDownload}>
              {owned ? "Download your copy" : "Download free"} ↗
            </button>
          ) : (
            <button className="button button-dark" onClick={onBuy}>
              {article.is_premium
                ? `Get the note · ${money(article.price_kobo)}`
                : "Read for free"}{" "}
              <span>↗</span>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
function Library({ purchases, onDownload }) {
  return (
    <main className="library">
      <p className="eyebrow">YOUR READING ROOM</p>
      <h1>
        My <em>library.</em>
      </h1>
      <p className="subhead">The ideas you chose to keep.</p>
      <div className="library-list">
        {purchases.length ? (
          purchases.map((purchase) => (
            <div className="library-item" key={purchase.id}>
              <div className="mini-art">{purchase.title?.slice(0, 1)}</div>
              <div>
                <p className="card-kicker">ADDED TO YOUR LIBRARY</p>
                <h3>{purchase.title}</h3>
                <p>{purchase.description}</p>
              </div>
              <button
                className="button button-outline"
                onClick={() => onDownload(purchase.article_id)}
              >
                Download ↗
              </button>
            </div>
          ))
        ) : (
          <div className="empty">
            Your library is quiet for now. Find something worth bringing home.
          </div>
        )}
      </div>
    </main>
  );
}
function AuthModal({ mode, onClose, onSubmit, onSwitch }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  return (
    <div className="modal-backdrop">
      <form
        className="auth-modal"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(form, mode === "login" ? "login" : "signup");
        }}
      >
        <button type="button" className="close" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">EBUTECH LIBRARY</p>
        <h2>{mode === "login" ? "Welcome back." : "Make an account."}</h2>
        {mode === "signup" && (
          <label>
            Name
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </label>
        )}
        <label>
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
          />
        </label>
        <label>
          Password
          <input
            required
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
          />
        </label>
        <button className="button button-dark">
          {mode === "login" ? "Sign in" : "Create account"} ↗
        </button>
        <button type="button" className="text-button" onClick={onSwitch}>
          {mode === "login"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
function Callback({ onDone, onError }) {
  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get(
      "reference",
    );
    if (reference)
      api(`/payments/verify/${reference}`)
        .then(onDone)
        .catch((error) => onError(error.message));
  }, [onDone, onError]);
  return (
    <main className="callback">
      <div className="loader" />
      <p className="eyebrow">PAYMENT RECEIVED</p>
      <h1>
        Making room
        <br />
        <em>in your library.</em>
      </h1>
      <p>We’re confirming your purchase now.</p>
    </main>
  );
}

export default App;
