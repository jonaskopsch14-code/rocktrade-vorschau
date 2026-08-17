/* =============================================================
   Rocktrade GmbH — script.js

   Klassisches Script, kein Modul: sonst scheitert das Öffnen
   per file:// an der CORS-Prüfung.
   Kein fetch zu fremden Servern, nichts wird im Browser
   gespeichert — keine Cookies, kein localStorage.

   Alles hier ist Zugabe. Ohne JavaScript bleibt die Seite
   vollständig lesbar und bedienbar, Formulare inklusive.
   ============================================================= */

(function () {
  "use strict";

  var wurzel = document.documentElement;
  wurzel.classList.add("js-an");

  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", function () {
    jahrSetzen();
    menueSteuern();
    einblenden();
    aktiveSeiteMarkieren();
    formulareAbsichern();
    fahrzeugeWechseln();
  });

  /* ---------- Jahreszahl im Fuß ---------- */
  function jahrSetzen() {
    var el = document.getElementById("jahr");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ---------- Menü auf dem Handy ---------- */
  function menueSteuern() {
    var knopf = document.getElementById("burger");
    var nav = document.getElementById("nav");
    if (!knopf || !nav) return;

    knopf.addEventListener("click", function () {
      var offen = nav.classList.toggle("offen");
      knopf.setAttribute("aria-expanded", offen ? "true" : "false");
      knopf.setAttribute("aria-label", offen ? "Menü schließen" : "Menü öffnen");
    });

    // Nach einem Klick auf einen Menüpunkt wieder schließen
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a") && nav.classList.contains("offen")) {
        nav.classList.remove("offen");
        knopf.setAttribute("aria-expanded", "false");
        knopf.setAttribute("aria-label", "Menü öffnen");
      }
    });

    // Escape schließt das Menü
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("offen")) {
        nav.classList.remove("offen");
        knopf.setAttribute("aria-expanded", "false");
        knopf.focus();
      }
    });
  }

  /* ---------- Einblenden beim Scrollen ---------- */
  function einblenden() {
    var elemente = document.querySelectorAll(".zeig");
    var i;

    if (ruhig || !("IntersectionObserver" in window)) {
      for (i = 0; i < elemente.length; i++) elemente[i].classList.add("da");
      return;
    }

    var beobachter = new IntersectionObserver(function (eintraege) {
      for (var k = 0; k < eintraege.length; k++) {
        if (eintraege[k].isIntersecting) {
          eintraege[k].target.classList.add("da");
          beobachter.unobserve(eintraege[k].target);
        }
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    for (i = 0; i < elemente.length; i++) beobachter.observe(elemente[i]);
  }

  /* ---------- Fahrzeugkacheln durchwechseln ----------
     Im Quelltext stehen sechs feste Kacheln. Die bleiben stehen, wenn
     JavaScript aus ist oder die Datei per file:// geöffnet wird — dann
     verbietet der Browser das Nachladen der JSON-Datei.

     Läuft die Seite auf einem Webserver, holt sie assets/fahrzeuge.json
     und zeigt sechs andere Wagen aus dem Bestand. Welche, hängt vom
     Datum ab: jeden Tag rückt die Auswahl um sechs Fahrzeuge weiter.
     So steht nicht monatelang derselbe Wagen vorn.

     Verkauft? Den Eintrag aus fahrzeuge.json löschen, dann rückt von
     selbst ein anderer nach. Die Datei ist die einzige Stelle, die
     gepflegt werden muss.

     Geladen wird ausschließlich von der eigenen Domain. Die Bilder
     liegen lokal unter bilder/fahrzeuge/, kein fremder Server. */
  function fahrzeugeWechseln() {
    var gitter = document.getElementById("auto-gitter");
    if (!gitter || !window.fetch) return;

    fetch("assets/fahrzeuge.json", { cache: "no-cache" })
      .then(function (a) { return a.ok ? a.json() : null; })
      .then(function (liste) {
        if (!liste || !liste.length) return;

        var brauchbar = liste.filter(function (w) {
          return w && w.bild_lokal && w.mobile && w.titel && w.preis;
        });
        if (brauchbar.length < 6) return;

        // Tagesnummer seit 1970 — wechselt um Mitternacht
        var tag = Math.floor(Date.now() / 86400000);
        var start = (tag * 6) % brauchbar.length;

        var teile = [];
        for (var k = 0; k < 6; k++) {
          teile.push(kachel(brauchbar[(start + k) % brauchbar.length], k));
        }
        gitter.innerHTML = teile.join("");

        // Die neuen Kacheln sollen genauso einblenden wie der Rest
        var neue = gitter.querySelectorAll(".zeig");
        for (var i = 0; i < neue.length; i++) neue[i].classList.add("da");
      })
      .catch(function () { /* Grundzustand bleibt stehen */ });
  }

  function sicher(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function kachel(w, nr) {
    var daten = [];
    if (w.leistung)  daten.push("<span>" + sicher(w.leistung) + "</span>");
    if (w.kilometer) daten.push("<span>" + sicher(w.kilometer) + "</span>");
    if (w.zustand)   daten.push("<span>" + sicher(w.zustand) + "</span>");

    return '' +
      '<article class="auto zeig" style="--i:' + (nr % 3) + '">' +
        '<div class="auto__bild">' +
          '<img src="' + sicher(w.bild_lokal) + '" alt="' + sicher(w.titel) +
            ' aus dem Bestand der Rocktrade GmbH" width="1600" height="1067" loading="lazy" decoding="async">' +
          '<span class="auto__typ">' + sicher(w.zustand || "Gebrauchtwagen") + '</span>' +
        '</div>' +
        '<div class="auto__inhalt">' +
          '<h3>' + sicher(w.titel) + '</h3>' +
          '<p class="auto__beschreibung">' + sicher(w.beschreibung) + '</p>' +
          '<p class="auto__daten">' + daten.join("") + '</p>' +
          '<div class="auto__fuss">' +
            '<p class="auto__preis">' + sicher(w.preis) + ' €<small>Bruttopreis</small></p>' +
            '<a class="textlink" href="' + sicher(w.mobile) + '" target="_blank" rel="noopener">' +
              'Details' +
              '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
              '<path d="M5 11L11 5M11 5H6M11 5v5" stroke="currentColor" stroke-width="1.7" ' +
              'stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</a>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* ---------- Aktuellen Menüpunkt markieren ---------- */
  function aktiveSeiteMarkieren() {
    var datei = window.location.pathname.split("/").pop() || "index.html";
    var links = document.querySelectorAll(".nav a[href]");
    for (var i = 0; i < links.length; i++) {
      var ziel = links[i].getAttribute("href");
      if (ziel === datei) links[i].setAttribute("aria-current", "page");
    }
  }

  /* ---------- Formulare ----------
     Abgeschickt wird ganz normal per POST an das PHP-Skript.
     JavaScript macht hier nur zwei Dinge: doppeltes Absenden
     verhindern und im Buchungsformular den gewählten Wagen
     in die Betreffzeile schreiben. Ohne JS funktioniert alles
     genauso, nur ohne diese Bequemlichkeit. */
  function formulareAbsichern() {
    var formulare = document.querySelectorAll("form[data-schutz]");

    for (var i = 0; i < formulare.length; i++) {
      (function (f) {
        f.addEventListener("submit", function () {
          var knopf = f.querySelector('button[type="submit"]');
          if (knopf) {
            // erst nach dem Absenden sperren, sonst geht der Wert verloren
            window.setTimeout(function () {
              knopf.disabled = true;
              knopf.textContent = "Wird gesendet …";
            }, 0);
          }
        });
      })(formulare[i]);
    }

    // Buchungsformular: Auswahl sichtbar zusammenfassen
    var wahl = document.querySelectorAll('input[name="fahrzeug"]');
    var anzeige = document.getElementById("gewaehlt");
    if (!wahl.length || !anzeige) return;

    function aktualisieren() {
      for (var k = 0; k < wahl.length; k++) {
        if (wahl[k].checked) {
          anzeige.textContent = wahl[k].getAttribute("data-name") || "";
          return;
        }
      }
      anzeige.textContent = "noch keins";
    }

    for (var j = 0; j < wahl.length; j++) {
      wahl[j].addEventListener("change", aktualisieren);
    }
    aktualisieren();
  }
})();
