import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, writeBatch, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { auth, db } from "../js/firebase.js";
import { DEFAULT_GALLERY } from "../js/gallery-defaults.js";

const loginPanel = document.getElementById("login-panel");
const editorPanel = document.getElementById("editor-panel");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const addBtn = document.getElementById("add-btn");
const importBtn = document.getElementById("import-btn");
const galleryList = document.getElementById("gallery-list");
const status = document.getElementById("status");
const modal = document.getElementById("editor-modal");
const itemForm = document.getElementById("item-form");
const closeModal = document.getElementById("close-modal");
const cancelBtn = document.getElementById("cancel-btn");
const saveBtn = document.getElementById("save-btn");
const formError = document.getElementById("form-error");
const imageFile = document.getElementById("image-file");
const imagePreview = document.getElementById("image-preview");
const dropzonePlaceholder = document.getElementById("dropzone-placeholder");

let galleryItems = [];
let hasFirestoreGallery = false;

onAuthStateChanged(auth, async user => {
  if (user) {
    loginPanel.classList.add("hidden");
    editorPanel.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    await loadGallery();
  } else {
    loginPanel.classList.remove("hidden");
    editorPanel.classList.add("hidden");
    logoutBtn.classList.add("hidden");
  }
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  hide(loginError);
  try {
    await signInWithEmailAndPassword(auth, value("email"), value("password"));
    loginForm.reset();
  } catch (error) {
    loginError.textContent = friendlyAuthError(error);
    show(loginError);
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));
addBtn.addEventListener("click", () => openEditor());
importBtn.addEventListener("click", importOriginalGallery);
closeModal.addEventListener("click", closeEditor);
cancelBtn.addEventListener("click", closeEditor);
modal.addEventListener("click", event => { if (event.target === modal) closeEditor(); });
imageFile.addEventListener("change", previewSelectedImage);
itemForm.addEventListener("submit", saveItem);

async function loadGallery() {
  showStatus("Loading your gallery...", "info");
  try {
    const snapshot = await getDocs(query(collection(db, "gallery"), orderBy("order", "asc")));
    galleryItems = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    hasFirestoreGallery = galleryItems.length > 0;
    if (!hasFirestoreGallery) {
      galleryItems = DEFAULT_GALLERY.map((item, index) => ({ ...item, order: index }));
      importBtn.classList.remove("hidden");
    } else {
      importBtn.classList.add("hidden");
    }
    renderGallery();
    hide(status);
  } catch (error) {
    console.error(error);
    showStatus("We couldn't load the gallery. Check your Firebase setup and try again.", "error");
    galleryList.innerHTML = "";
  }
}

function renderGallery() {
  if (!galleryItems.length) {
    galleryList.innerHTML = '<div class="empty-state"><i class="fas fa-images"></i><h2>Your gallery is empty</h2><p>Click “Add Gallery Item” to add your first piece.</p></div>';
    return;
  }

  galleryList.innerHTML = galleryItems.map((item, index) => `
    <article class="gallery-admin-card">
      <div class="admin-card-image"><img src="${escapeHtml(item.image || "../images/example.png")}" alt="${escapeHtml(item.title)}"></div>
      <div class="admin-card-body">
        <span class="category">${escapeHtml(item.category || "Collection")}</span>
        <h2>${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.description || "No description yet.")}</p>
        <div class="card-actions">
          <button class="secondary-btn" data-action="edit" data-id="${escapeHtml(item.id)}"><i class="fas fa-edit"></i> Edit</button>
          <button class="danger-btn" data-action="delete" data-id="${escapeHtml(item.id)}"><i class="fas fa-trash"></i> Delete</button>
        </div>
        <div class="card-actions" style="margin-top:.7rem">
          <button class="secondary-btn" data-action="up" data-id="${escapeHtml(item.id)}" ${index === 0 ? "disabled" : ""}><i class="fas fa-arrow-up"></i> Move Up</button>
          <button class="secondary-btn" data-action="down" data-id="${escapeHtml(item.id)}" ${index === galleryItems.length - 1 ? "disabled" : ""}><i class="fas fa-arrow-down"></i> Move Down</button>
        </div>
      </div>
    </article>
  `).join("");

  galleryList.querySelectorAll("button[data-action]").forEach(button => {
    button.addEventListener("click", () => handleCardAction(button.dataset.action, button.dataset.id));
  });
}

async function handleCardAction(action, id) {
  const index = galleryItems.findIndex(item => item.id === id);
  if (index < 0) return;

  if (action === "edit") openEditor(galleryItems[index]);
  if (action === "delete") await deleteItem(galleryItems[index]);
  if (action === "up" && index > 0) await moveItem(index, index - 1);
  if (action === "down" && index < galleryItems.length - 1) await moveItem(index, index + 1);
}

function openEditor(item = null) {
  itemForm.reset();
  hide(formError);
  document.getElementById("item-id").value = item?.id || "";
  document.getElementById("existing-image-url").value = item?.image || "";
  document.getElementById("category").value = item?.category || "";
  document.getElementById("title").value = item?.title || "";
  document.getElementById("description").value = item?.description || "";
  document.getElementById("modal-title").textContent = item ? "Edit Gallery Item" : "Add Gallery Item";
  saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Item';

  if (item?.image) {
    imagePreview.src = item.image;
    imagePreview.classList.remove("hidden");
    dropzonePlaceholder.classList.add("hidden");
  } else {
    imagePreview.removeAttribute("src");
    imagePreview.classList.add("hidden");
    dropzonePlaceholder.classList.remove("hidden");
  }
  modal.classList.remove("hidden");
  setTimeout(() => document.getElementById("category").focus(), 50);
}

function closeEditor() {
  modal.classList.add("hidden");
  itemForm.reset();
  hide(formError);
}

function previewSelectedImage() {
  const file = imageFile.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    formError.textContent = "That photo is larger than 10 MB. Please choose a smaller image.";
    show(formError);
    imageFile.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = event => {
    imagePreview.src = event.target.result;
    imagePreview.classList.remove("hidden");
    dropzonePlaceholder.classList.add("hidden");
  };
  reader.readAsDataURL(file);
}

async function importOriginalGallery() {
  if (hasFirestoreGallery) return;
  if (!confirm("Add the original Lazy Cat gallery pieces to your editable gallery?")) return;
  importBtn.disabled = true;
  importBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...';
  try {
    const batch = writeBatch(db);
    DEFAULT_GALLERY.forEach((item, index) => {
      const newRef = doc(collection(db, "gallery"));
      batch.set(newRef, {
        title: item.title, category: item.category, description: item.description,
        image: item.image, order: index,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
    });
    await batch.commit();
    await loadGallery();
    showStatus("The original gallery has been imported. You can now edit each item.", "success");
    setTimeout(() => hide(status), 5000);
  } catch (error) {
    console.error(error);
    showStatus("We couldn't import the original gallery. Please check your Firebase rules and try again.", "error");
  } finally {
    importBtn.disabled = false;
    importBtn.innerHTML = '<i class="fas fa-magic"></i> Import Original Gallery';
  }
}

async function saveItem(event) {
  event.preventDefault();
  hide(formError);
  const user = auth.currentUser;
  if (!user) return;

  const id = value("item-id");
  const title = value("title").trim();
  const category = value("category").trim();
  const description = value("description").trim();
  const file = imageFile.files[0];

  if (!title || !category) {
    formError.textContent = "Please enter both a title and category.";
    show(formError);
    return;
  }

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    const existing = galleryItems.find(item => item.id === id);
    let image = existing?.image || "";

    if (file) {
      if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
      image = `../images/${safeName}`;
      await downloadForGitHub(file, safeName);
    }

    if (!image) throw new Error("Please choose a photo for this gallery item.");

    if (id) {
      await updateDoc(doc(db, "gallery", id), { title, category, description, image, updatedAt: serverTimestamp() });
      const index = galleryItems.findIndex(item => item.id === id);
      galleryItems[index] = { ...galleryItems[index], title, category, description, image };
    } else {
      const newOrder = galleryItems.length ? Math.max(...galleryItems.map(item => Number(item.order) || 0)) + 1 : 0;
      const newDoc = await addDoc(collection(db, "gallery"), { title, category, description, image, order: newOrder, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      galleryItems.push({ id: newDoc.id, title, category, description, image, order: newOrder });
    }

    galleryItems.sort((a,b) => (Number(a.order)||0) - (Number(b.order)||0));
    closeEditor();
    renderGallery();
    showStatus("Saved! The public gallery will now show the updated item.", "success");
    setTimeout(() => hide(status), 4000);
  } catch (error) {
    console.error(error);
    formError.textContent = error.message || "We couldn't save that item. Please try again.";
    show(formError);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Item';
  }
}

async function deleteItem(item) {
  if (!confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db, "gallery", item.id));
    galleryItems = galleryItems.filter(entry => entry.id !== item.id);
    await saveOrder();
    renderGallery();
    showStatus("Gallery item deleted.", "success");
    setTimeout(() => hide(status), 3000);
  } catch (error) {
    console.error(error);
    showStatus("We couldn't delete that item. Please try again.", "error");
  }
}

async function moveItem(from, to) {
  const [item] = galleryItems.splice(from, 1);
  galleryItems.splice(to, 0, item);
  try {
    await saveOrder();
    renderGallery();
  } catch (error) {
    console.error(error);
    await loadGallery();
    showStatus("We couldn't change the order. Please try again.", "error");
  }
}

async function saveOrder() {
  const batch = writeBatch(db);
  galleryItems.forEach((item, index) => batch.update(doc(db, "gallery", item.id), { order: index, updatedAt: serverTimestamp() }));
  await batch.commit();
  galleryItems.forEach((item, index) => item.order = index);
}

async function downloadForGitHub(file, safeName) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function friendlyAuthError(error) {
  const messages = {
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please wait a little while and try again."
  };
  return messages[error.code] || "We couldn't sign you in. Please check your information and try again.";
}

function value(id) { return document.getElementById(id).value; }
function show(element) { element.classList.remove("hidden"); }
function hide(element) { element.classList.add("hidden"); }
function showStatus(message, type) { status.textContent = message; status.className = `message ${type}`; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char])); }
