import { wedding } from "./config/wedding.js";
import { theme } from "./config/theme.js";

 
// =============================
// APPLY SELECTED EDITION THEME
// =============================

const root = document.documentElement;

const themeVariables = {
    "--background": theme.colors.background,
    "--card": theme.colors.card,

    "--text": theme.colors.text,
    "--muted": theme.colors.muted,
    "--light": theme.colors.light,

    "--primary": theme.colors.primary,
    "--primary-hover": theme.colors.primaryHover,
    "--primary-light": theme.colors.primaryLight,
    "--primary-soft": theme.colors.primarySoft,

    "--border": theme.colors.border,

    "--body-font": theme.fonts.body,
    "--heading-font": theme.fonts.heading,
    "--script-font": theme.fonts.script
};

Object.entries(themeVariables).forEach(([property, value]) => {
    if (value) {
        root.style.setProperty(property, value);
    }
});


// =============================
// LOAD WEDDING CONTENT
// =============================

document.title = wedding.pageTitle;

const initials = wedding.coupleInitials.split("+");

const firstInitial = initials[0]?.trim() || "";
const secondInitial = initials[1]?.trim() || "";

document.getElementById("coupleInitials").innerHTML = `
    <span class="initial">${escapeHtml(firstInitial)}</span>
    <span class="plus">+</span>
    <span class="initial">${escapeHtml(secondInitial)}</span>
`;

document.getElementById("weddingDate").textContent =
    wedding.weddingDate;

document.getElementById("welcomeTitle").textContent =
    wedding.welcome.title;

document.getElementById("welcomeSubtitle").textContent =
    wedding.welcome.subtitle;

document.getElementById("searchLabel").textContent =
    wedding.search.label;

document.getElementById("guestName").placeholder =
    wedding.search.placeholder;

document.getElementById("searchButton").textContent =
    wedding.buttons.default;


// =============================
// CONFIGURATION
// =============================

const API_URL = wedding.apiUrl;

console.log(
    `${wedding.coupleNames} Wedding Seating Finder Loaded — ${theme.name}`
);


// =============================
// DOM REFERENCES
// =============================

const input = document.getElementById("guestName");
const form = document.getElementById("searchArea");
const searchButton = document.getElementById("searchButton");
const result = document.querySelector(".result");

let selectedGuest = "";
let searchTimer = null;


// =============================
// FORM SUBMIT
// =============================

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstSuggestion =
        document.querySelector(".suggestions div");

    if (!selectedGuest && firstSuggestion) {
        selectedGuest = firstSuggestion.textContent.trim();
        input.value = selectedGuest;
    }

    if (!selectedGuest && input.value.trim()) {
        selectedGuest = input.value.trim();
    }

    if (!selectedGuest) {
        alert(wedding.messages.emptyName);
        input.focus();
        return;
    }

    removeSuggestions();

    await findTable();
});


// =============================
// AUTOCOMPLETE SEARCH
// =============================

input.addEventListener("input", () => {
    const search = input.value.trim().toLowerCase();

    selectedGuest = "";

    removeSuggestions();
    clearTimeout(searchTimer);

    if (search.length < 3) {
        return;
    }

    searchTimer = setTimeout(async () => {
        try {
            const response = await fetch(
                `${API_URL}?search=${encodeURIComponent(search)}`
            );

            if (!response.ok) {
                throw new Error(
                    `Search request failed with status ${response.status}`
                );
            }

            const results = await response.json();

            showSuggestions(
                Array.isArray(results) ? results : []
            );
        } catch (error) {
            console.error("Search error:", error);
        }
    }, 400);
});


// =============================
// KEYBOARD SUPPORT
// =============================

input.addEventListener("keydown", (event) => {
    const suggestions =
        Array.from(document.querySelectorAll(".suggestions div"));

    if (!suggestions.length) {
        return;
    }

    const activeIndex = suggestions.findIndex(
        (item) => item.classList.contains("active")
    );

    if (event.key === "ArrowDown") {
        event.preventDefault();

        const nextIndex =
            activeIndex < suggestions.length - 1
                ? activeIndex + 1
                : 0;

        setActiveSuggestion(suggestions, nextIndex);
    }

    if (event.key === "ArrowUp") {
        event.preventDefault();

        const nextIndex =
            activeIndex > 0
                ? activeIndex - 1
                : suggestions.length - 1;

        setActiveSuggestion(suggestions, nextIndex);
    }

    if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        suggestions[activeIndex].click();
    }

    if (event.key === "Escape") {
        removeSuggestions();
    }
});


// =============================
// CLOSE SUGGESTIONS OUTSIDE
// =============================

document.addEventListener("click", (event) => {
    if (!form.contains(event.target)) {
        removeSuggestions();
    }
});


// =============================
// SHOW NAME OPTIONS
// =============================

function showSuggestions(results) {
    removeSuggestions();

    if (!results.length) {
        return;
    }

    const list = document.createElement("div");

    list.className = "suggestions";
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", "Guest name suggestions");

    results.slice(0, 5).forEach((person) => {
        if (!person?.name) {
            return;
        }

        const item = document.createElement("div");

        item.textContent = person.name;
        item.setAttribute("role", "option");
        item.setAttribute("tabindex", "-1");

        item.addEventListener("click", () => {
            input.value = person.name;
            selectedGuest = person.name;

            removeSuggestions();
            input.focus();
        });

        list.appendChild(item);
    });

    if (list.children.length) {
        form.appendChild(list);
    }
}


// =============================
// ACTIVE AUTOCOMPLETE ITEM
// =============================

function setActiveSuggestion(suggestions, index) {
    suggestions.forEach((item) => {
        item.classList.remove("active");
        item.setAttribute("aria-selected", "false");
    });

    const activeItem = suggestions[index];

    activeItem.classList.add("active");
    activeItem.setAttribute("aria-selected", "true");
    activeItem.scrollIntoView({
        block: "nearest"
    });

    input.value = activeItem.textContent.trim();
}


// =============================
// REMOVE AUTOCOMPLETE
// =============================

function removeSuggestions() {
    const suggestionBox =
        document.querySelector(".suggestions");

    if (suggestionBox) {
        suggestionBox.remove();
    }
}


// =============================
// FIND TABLE
// =============================

async function findTable() {
    searchButton.textContent =
        wedding.buttons.searching;

    searchButton.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
                name: selectedGuest
            })
        });

        if (!response.ok) {
            throw new Error(
                `Lookup request failed with status ${response.status}`
            );
        }

        const data = await response.json();

        if (!data.found) {
            alert(wedding.messages.guestNotFound);
            return;
        }

        showResult(data);
    } catch (error) {
        console.error("Lookup error:", error);
        alert(wedding.messages.error);
    } finally {
        searchButton.textContent =
            wedding.buttons.default;

        searchButton.disabled = false;
    }
}


// =============================
// SHOW RESULT
// =============================

function showResult(data) {
    const party = Array.isArray(data.party)
        ? data.party
        : [];

    const sameTable = party.filter((person) => {
        return (
            person.name !== data.guest &&
            String(person.table) === String(data.table)
        );
    });

    const otherTables = party.filter((person) => {
        return (
            person.name !== data.guest &&
            String(person.table) !== String(data.table)
        );
    });

    result.classList.remove("hidden");

    result.style.animation = "none";

    window.requestAnimationFrame(() => {
        result.style.animation = "";
    });

    result.innerHTML = `
        <div class="guest-name">
            ${escapeHtml(data.guest)}
        </div>

        <div class="divider"></div>

        <div class="label">
            ${escapeHtml(wedding.labels.yourTable)}
        </div>

        <div class="number">
            ${escapeHtml(String(data.table))}
        </div>

        ${
            wedding.features.showSameTableGuests &&
            sameTable.length
                ? `
                    <div class="party-title">
                        ${escapeHtml(wedding.labels.seatedWith)}
                    </div>

                    <div class="party">
                        ${sameTable
                            .map((person) =>
                                escapeHtml(person.name)
                            )
                            .join("<br>")}
                    </div>
                `
                : ""
        }

        ${
            wedding.features.showOtherTables &&
            otherTables.length
                ? `
                    <div class="party-title family-title">
                        ${escapeHtml(wedding.labels.familyFriends)}
                    </div>

                    <div class="family-subtitle">
                        ${escapeHtml(wedding.labels.otherTables)}
                    </div>

                    <div class="party">
                        ${otherTables
                            .map((person) => {
                                const name =
                                    escapeHtml(person.name);

                                const table =
                                    escapeHtml(String(person.table));

                                return `${name} — Table ${table}`;
                            })
                            .join("<br>")}
                    </div>
                `
                : ""
        }

        <p class="closing">
            ${escapeHtml(wedding.labels.closing)}
        </p>
    `;

    result.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


// =============================
// BASIC HTML SAFETY
// =============================

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
