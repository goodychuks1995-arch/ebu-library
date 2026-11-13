import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const LEVELS = ["ALL CLASSES", "JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];
const money = (kobo) => `₦${(Number(kobo || 0) / 100).toLocaleString("en-NG")}`;

function getArticleLevel(article = {}) {
  const [level] = (article.description || "").split(" - ");
  const match = (level || "").trim().match(/^(JSS|SS)\s*([123])$/i);
  return match ? `${match[1].toUpperCase()} ${match[2]}` : "General";
}

function getArticleSubject(article = {}) {
  const parts = (article.description || "").split(" - ").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return "General";
  const subject = parts.slice(1).join(" - ").replace(/_/g, " ");
  return subject.length <= 4
    ? subject
    : subject.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}function getArticleWeek(article = {}) {
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
  const data = await api(`/downloads/${articleId}`);
  window.location.href = data.url;
}

  
function App() {
  const [articles, setArticles] = useState([]);
  const [news, setNews] = useState([]);
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
  if (view === "news")
    api("/news").then(setNews).catch((error) => setNotice(error.message));
}, [view]);
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
          <span className="brand-mark">B</span>
          <span>
            BINARY THINKER'S
            <br />
            <small>ACADEMY</small>
          </span>
        </button>
               <nav>
          <button
            className={view === "catalog" ? "active" : ""}
            onClick={goCatalog}
          >
            Explore
          </button>
          <button
            className={view === "news" ? "active" : ""}
            onClick={() => { setSelected(null); setView("news"); }}
          >
            News
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
                            <ul className="trust">
                <li>JSS 1 – SS 3</li>
                <li>Weekly lesson notes</li>
                <li>Instant download</li>
              </ul>
            </div>
                <div className="hero-art">
              <img src="/BinaryThinker Academy Student Success.png" alt="Binarythinker Academy"/>
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
       function ArticleDetail({ article, onBack, onBuy, onDownload, onRead, owned }) {
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
            <button className="button button-dark" onClick={onBuy}>
              {`Get the note · ${money(article.price_kobo)}`} <span>↗</span>
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
              <button className="reader-link" onClick={onDownload}>Download</button>
              <button className="reader-link" onClick={() => setReaderUrl("")}>Close</button>
            </div>
          </div>
          <iframe className="reader-frame" src={readerUrl} title={article.title} />
        </section>
      )}
    </main>
  );
}
      )}
      {view === "library" && (
        <Library
          purchases={purchases}
          onDownload={(id) =>
            downloadFile(id).catch((error) => setNotice(error.message))
          }
        />
      )}
      {view === "news" && (
  <News items={news} isAdmin={user?.role === "admin"} onChange={setNews} setNotice={setNotice} />
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
        <span>© 2026 BINARY THINKERS</span>
        <span>LEARN SLOWLY. REMEMBER MORE.</span>
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
        <p className="eyebrow">BINARY THINKERS</p>
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
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
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

function News({ items, isAdmin, onChange, setNotice }) {
  const [form, setForm] = useState({ title: "", body: "", image: null });
  const [fileKey, setFileKey] = useState(0);
  const [openId, setOpenId] = useState(null);
  const story = items.find((item) => item.id === openId);

  const formatDate = (item) =>
    new Date(item.created_at).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

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
          {story.image_url && <img className="news-image" src={story.image_url} alt="" />}
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
      <p className="news-intro">
        JAMB, WAEC, admissions and school updates, explained clearly.
      </p>
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
        {items.length ? (
        <>
          {items.slice(0, 1).map((item) => (
            <article
              className={`news-featured${item.image_url ? "" : " no-img"}`}
              key={item.id}
            >
              {item.image_url && (
                <img className="news-featured-img" src={item.image_url} alt={item.title} />
              )}
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
