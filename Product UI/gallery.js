import { collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "../js/firebase.js";
import { DEFAULT_GALLERY } from "../js/gallery-defaults.js";

const grid = document.getElementById("gallery-grid");
const menuBtn = document.getElementById("menu-btn");
const navbar = document.querySelector(".navbar");

menuBtn?.addEventListener("click", () => {
  navbar.classList.toggle("active");
  menuBtn.classList.toggle("fa-times");
  menuBtn.setAttribute("aria-expanded", navbar.classList.contains("active"));
});


function render(items) {
  if (!items.length) {
    grid.innerHTML = '<div class="gallery-error">There are no gallery pieces to display yet.</div>';
    return;
  }

  grid.innerHTML = items.map(item => `
    <article class="gallery-card">
      <div class="gallery-card-image">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy">
      </div>
      <div class="gallery-card-content">
        <span>${escapeHtml(item.category || "Collection")}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description || "")}</p>
      </div>
    </article>
  `).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
}

async function loadGallery() {
  try {
    const snapshot = await getDocs(query(collection(db, "gallery"), orderBy("order", "asc")));
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render(items.length ? items : DEFAULT_GALLERY);
  } catch (error) {
    console.warn("Firebase gallery unavailable; showing the built-in gallery.", error);
    render(DEFAULT_GALLERY);
  }
}

loadGallery();
