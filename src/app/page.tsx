"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

type User = { id: string; name: string; email: string };
type Doc = { id: string; title: string; content: string; ownerId: string; ownerName: string; updatedAt: string; sharedWith: User[] };
type Version = { id: string; title: string; content: string; createdAt: string; createdBy: string };

export default function Home() {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [active, setActive] = useState<Doc | null>(null);
  const [title, setTitle] = useState("");
  const [saved, setSaved] = useState(true);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authUsers, setAuthUsers] = useState<User[]>([]);
  const [authError, setAuthError] = useState("");
  const [selectedShareUser, setSelectedShareUser] = useState("");
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<Version[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const editor = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth").then(async (response) => {
      const auth = await response.json();
      if (!response.ok) throw new Error(auth.error ?? "PostgreSQL is unavailable.");
      return auth;
    }).then((auth) => {
      if (cancelled) return;
      setAuthUsers(auth.users ?? []);
      if (!auth.user) { setLoading(false); return; }
      setUser(auth.user);
      return fetch("/api/documents");
    }).then((response) => response?.json()).then((data) => {
      if (cancelled) return;
      if (!data) return;
      if (data.error) { setToast(data.error); setLoading(false); return; }
      setDocuments(data.documents);
      setUsers(data.users);
      setLoading(false);
      if (data.documents[0]) {
        setActive(data.documents[0]);
        setTitle(data.documents[0].title);
        setTimeout(() => { if (editor.current) editor.current.innerHTML = data.documents[0].content; }, 0);
      }
    }).catch((error: unknown) => { const message = error instanceof Error ? error.message : "Could not connect to PostgreSQL."; setAuthError(message); setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function select(doc: Doc) {
    setActive(doc);
    setTitle(doc.title);
    setSaved(true);
    setTimeout(() => { if (editor.current) editor.current.innerHTML = doc.content; }, 0);
  }

  async function create() {
    notify("Creating document…");
    const response = await fetch("/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Untitled document", content: "<p>Start writing here...</p>" }) });
    if (!response.ok) { notify("Could not create document."); return; }
    const doc = await response.json();
    setDocuments((current) => [doc, ...current]);
    select(doc);
    notify("New document created");
  }

  async function save() {
    if (!active || !editor.current) return;
    const response = await fetch(`/api/documents/${active.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim() || "Untitled document", content: editor.current.innerHTML }) });
    if (!response.ok) { notify("Could not save this document."); return; }
    const doc = await response.json();
    setDocuments((current) => current.map((item) => item.id === doc.id ? doc : item));
    setActive(doc);
    setSaved(true);
    notify("Saved just now");
  }

  async function loadHistory() {
    if (!active) return;
    const response = await fetch(`/api/documents/${active.id}/versions`);
    const data = await response.json();
    if (!response.ok) { notify(data.error ?? "Could not load history."); return; }
    setVersions(data.versions);
    setShowHistory(true);
  }

  async function restore(version: Version) {
    if (!active) return;
    const response = await fetch(`/api/documents/${active.id}/versions/${version.id}/restore`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) { notify(data.error ?? "Could not restore version."); return; }
    setActive(data);
    setTitle(data.title);
    if (editor.current) editor.current.innerHTML = data.content;
    setShowHistory(false);
    notify("Version restored");
  }

  function format(command: string, value?: string) {
    document.execCommand(command, false, value);
    editor.current?.focus();
    setSaved(false);
    const labels: Record<string, string> = { bold: "Bold applied", italic: "Italic applied", underline: "Underline applied", formatBlock: "Text style changed", insertUnorderedList: "Bulleted list applied", insertOrderedList: "Numbered list applied" };
    notify(labels[command] ?? "Formatting applied");
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !active) return;
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`/api/documents/${active.id}/upload`, { method: "POST", body: form });
    const doc = await response.json();
    if (!response.ok) { notify(doc.error ?? "Upload failed."); return; }
    setActive(doc);
    setDocuments((current) => current.map((item) => item.id === doc.id ? doc : item));
    if (editor.current) editor.current.innerHTML = doc.content;
    setSaved(true);
    notify("File imported and saved");
  }

  function exportMarkdown() {
    if (!active || !editor.current) return;
    const root = editor.current.cloneNode(true) as HTMLElement;
    const markdown = root.innerHTML
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
      .replace(/<strong[^>]*>(.*?)<\/strong>|<b[^>]*>(.*?)<\/b>/gi, "**$1$2**")
      .replace(/<em[^>]*>(.*?)<\/em>|<i[^>]*>(.*?)<\/i>/gi, "*$1$2*")
      .replace(/<u[^>]*>(.*?)<\/u>/gi, "$1")
      .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
      .replace(/<\/(p|div|ul|ol)>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const blob = new Blob([`# ${title || active.title}\n\n${markdown}\n`], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(title || active.title).replace(/[^\w\s-]/g, "").trim() || "document"}.md`;
    link.click();
    URL.revokeObjectURL(url);
    notify("Markdown export downloaded");
  }

  function exportPdf() {
    if (!active) return;
    window.print();
    notify("Choose “Save as PDF” in the print dialog");
  }

  async function share(userId: string) {
    if (!active || !userId) return;
    const response = await fetch(`/api/documents/${active.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shareWith: userId }) });
    const doc = await response.json();
    setActive(doc);
    setDocuments((current) => current.map((item) => item.id === doc.id ? doc : item));
    setSelectedShareUser("");
    notify(`Shared with ${doc.sharedWith.find((candidate: User) => candidate.id === userId)?.name ?? "user"}`);
  }

  async function signIn(userId: string) {
    notify("Switching user…");
    const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
    if (!response.ok) return;
    window.location.reload();
  }

  async function signOut() {
    notify("Signing out…");
    await fetch("/api/auth", { method: "DELETE" });
    window.location.reload();
  }

  async function deleteActiveDocument() {
    if (!active || !user || active.ownerId !== user.id) return;
    if (!window.confirm(`Delete "${active.title}" permanently?`)) return;
    const response = await fetch(`/api/documents/${active.id}/delete`, { method: "DELETE" });
    if (!response.ok) { notify("Could not delete document."); return; }
    const remaining = documents.filter((document) => document.id !== active.id);
    setDocuments(remaining);
    setActive(remaining[0] ?? null);
    setShowMore(false);
    notify("Document deleted");
  }

  async function copyDocumentLink() {
    if (!active) return;
    await navigator.clipboard.writeText(`${window.location.origin}/?document=${active.id}`);
    setShowMore(false);
    notify("Document link copied");
  }

  if (loading) return <main className={styles.empty}><h2>Connecting to Ajaia Docs…</h2><p>Loading your PostgreSQL workspace.</p></main>;
  if (!user) return <main className={styles.login}><div className={styles.loginCard}><div className={styles.logo}>A</div><h1>Welcome to Ajaia Docs</h1>{authError ? <><p className={styles.error}>{authError}</p><p>Set DATABASE_URL in <code>.env.local</code>, restart the server, and refresh this page.</p></> : <><p>Choose a seeded workspace user to continue.</p>{authUsers.map((candidate) => <button key={candidate.id} className={styles.loginUser} onClick={() => void signIn(candidate.id)}><span className={styles.avatar}>{candidate.name.split(" ").map((part) => part[0]).join("")}</span><span><b>{candidate.name}</b><small>{candidate.email}</small></span><strong>→</strong></button>)}</>}</div></main>;

  const owned = documents.filter((doc) => doc.ownerId === user.id);
  const shared = documents.filter((doc) => doc.ownerId !== user.id);

  return (
    <main className={styles.app}>
      {toast && <div className={styles.toast} role="status">{toast}</div>}
      <header className={styles.header}>
        <div className={styles.brand}><div className={styles.logo}>A</div><span>Ajaia <b>Docs</b></span></div>
        <div className={styles.headerActions}><span className={styles.saved}>{saved ? "✓ All changes saved" : "Unsaved changes"}</span><span className={styles.currentUser}>{user.name}</span><button className={styles.switchButton} onClick={() => void signOut()}>Switch user</button><button className={styles.avatar}>{user.name.split(" ").map((part) => part[0]).join("")}</button></div>
      </header>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <button className={styles.newButton} onClick={create}><span>+</span> New document</button>
          <nav>
            <p className={styles.sectionLabel}>MY WORKSPACE</p>
            <button className={styles.navItem}>⌂ <span>All documents</span><em>{documents.length}</em></button>
            <button className={styles.navItem}>☆ <span>Starred</span></button>
            <p className={styles.sectionLabel}>DOCUMENTS</p>
            <p className={styles.listLabel}>Owned by me</p>
            {owned.map((doc) => <button key={doc.id} className={`${styles.docItem} ${active?.id === doc.id ? styles.activeDoc : ""}`} onClick={() => select(doc)}><span className={styles.docIcon}>▤</span>{doc.title}</button>)}
            <p className={styles.listLabel}>Shared with me</p>
            {shared.map((doc) => <button key={doc.id} className={`${styles.docItem} ${active?.id === doc.id ? styles.activeDoc : ""}`} onClick={() => select(doc)}><span className={styles.docIcon}>▤</span>{doc.title}<small>{doc.ownerName.split(" ")[0]}</small></button>)}
          </nav>
          <div className={styles.sidebarFoot}><span className={styles.storageIcon}>◌</span><div><b>Workspace storage</b><small>12% used</small></div></div>
        </aside>
        <section className={styles.workspace}>
          {active ? <><div className={styles.docHeader}><div className={styles.titleWrap}><span className={styles.fileMark}>▤</span><input value={title} onChange={(e) => { setTitle(e.target.value); setSaved(false); }} onBlur={save} aria-label="Document title" /><span className={styles.private}>{active.ownerId === user.id ? "Owned by you" : `Shared by ${active.ownerName}`}</span></div><div className={styles.docActions}><label className={styles.upload}><span>↑</span> Import <input type="file" accept=".txt,.md" onChange={upload} hidden /></label><button className={styles.exportButton} onClick={exportMarkdown}>↓ Export .md</button><button className={styles.exportButton} onClick={exportPdf}>↓ Export PDF</button>{active.ownerId === user.id && <><select value={selectedShareUser} onChange={(e) => setSelectedShareUser(e.target.value)} aria-label="Choose a user to share with"><option value="">Choose person…</option>{users.filter((candidate) => !active.sharedWith.some((sharedUser) => sharedUser.id === candidate.id) && candidate.id !== active.ownerId).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select><button className={styles.shareButton} disabled={!selectedShareUser} onClick={() => void share(selectedShareUser)}>Share</button></>}<div className={styles.moreWrap}><button className={styles.more} onClick={() => setShowMore((visible) => !visible)} aria-label="More document actions">•••</button>{showMore && <div className={styles.moreMenu}><button onClick={() => void copyDocumentLink()}>Copy document link</button>{active.ownerId === user.id && <button className={styles.dangerAction} onClick={() => void deleteActiveDocument()}>Delete document</button>}</div>}</div></div></div>
            <div className={styles.editorArea}><div className={styles.toolbar}><button onClick={() => format("bold")}><b>B</b></button><button onClick={() => format("italic")}><i>I</i></button><button onClick={() => format("underline")}><u>U</u></button><span className={styles.divider} /><select defaultValue="p" onChange={(e) => format("formatBlock", e.target.value)}><option value="p">Normal text</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option></select><span className={styles.divider} /><button onClick={() => format("insertUnorderedList")}>• List</button><button onClick={() => format("insertOrderedList")}>1. List</button><button className={styles.historyButton} onClick={() => void loadHistory()}>History</button><button className={styles.saveButton} onClick={save}>Save</button></div><div ref={editor} className={styles.editor} contentEditable suppressContentEditableWarning onInput={() => setSaved(false)} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); void save(); } }} /></div>
            <div className={styles.statusBar}><span>Edited by you · {saved ? "Saved" : "Editing"}</span><span>{toast || "⌘ S to save"}</span></div></> : <div className={styles.empty}><h2>Your workspace is ready</h2><p>Create a document to get started.</p><button className={styles.newButton} onClick={create}>+ New document</button></div>}
        </section>
      </div>
      {showHistory && <div className={styles.modalBackdrop} onClick={() => setShowHistory(false)}><section className={styles.historyPanel} onClick={(event) => event.stopPropagation()}><div className={styles.historyHeading}><div><h2>Version history</h2><p>Previous saved versions of this document</p></div><button onClick={() => setShowHistory(false)}>×</button></div>{versions.length === 0 ? <p className={styles.emptyHistory}>No previous versions yet. Save an edit to create one.</p> : versions.map((version) => <div className={styles.versionRow} key={version.id}><div><b>{version.title}</b><small>{new Date(version.createdAt).toLocaleString()} · {version.createdBy}</small></div>{active?.ownerId === user.id && <button onClick={() => void restore(version)}>Restore</button>}</div>)}</section></div>}
    </main>
  );
}
