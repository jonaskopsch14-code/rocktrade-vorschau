/* =============================================================
   Rocktrade — kino.js
   Die Bewegungen, die beim Scrollen passieren.

   Klassisches Script, kein Modul. Kein fetch, keine fremden
   Server, nichts wird gespeichert.

   Enthält
     1. Drehplatte  — Fahrzeug dreht sich beim Scrollen (Canvas)
     2. Standbild   — Bild wächst und wandert beim Scrollen
     3. Wortweise   — Überschriften erscheinen Wort für Wort
     4. Zähler      — Zahlen laufen einmal hoch

   Alles ist Zugabe. Ohne JavaScript bleibt jeder Inhalt lesbar:
   die Drehplatte zeigt dann einfach ihr Standbild.
   ============================================================= */

(function () {
  "use strict";

  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", function () {
    standbilder();
    wortweise();
    zaehler();
  });

  /* Hilfsmittel: einmal pro Bild rechnen, nicht bei jedem Scroll-Ereignis */
  function beiScroll(fn) {
    var geplant = false;
    function ausloesen() {
      if (geplant) return;
      geplant = true;
      window.requestAnimationFrame(function () { geplant = false; fn(); });
    }
    window.addEventListener("scroll", ausloesen, { passive: true });
    window.addEventListener("resize", ausloesen, { passive: true });
    ausloesen();
  }

  function klemmen(x, min, max) { return x < min ? min : (x > max ? max : x); }

  /* -----------------------------------------------------------
     1. DREHPLATTE
     Eine hohe Sektion, in der eine Bühne klebt. Wie weit man in
     der Sektion gescrollt hat, bestimmt, welches Einzelbild der
     Aufnahmeserie gezeigt wird. Ergebnis: das Auto dreht sich.
     ----------------------------------------------------------- */
  function drehplatten() {
    var alle = document.querySelectorAll("[data-dreh]");

    for (var i = 0; i < alle.length; i++) {
      (function (sektion) {
        var leinwand = sektion.querySelector(".dreh__leinwand");
        var ersatz   = sektion.querySelector(".dreh__ersatz");
        if (!leinwand) return;

        var anzahl = parseInt(sektion.getAttribute("data-bilder"), 10) || 0;
        var pfad   = sektion.getAttribute("data-pfad") || "";
        if (anzahl < 2) return;

        var stift = leinwand.getContext("2d", { alpha: false });
        var bilder = new Array(anzahl);
        var geladen = 0;
        var gestartet = false;
        var aktuell = -1;

        /* Erst laden, wenn die Sektion in die Nähe kommt.
           Sonst zahlt jeder Besucher für Bilder, die er nie sieht. */
        function laden() {
          if (gestartet) return;
          gestartet = true;

          for (var k = 0; k < anzahl; k++) {
            (function (index) {
              var bild = new Image();
              bild.decoding = "async";
              bild.onload = function () {
                geladen++;
                if (index === 0) zeichnen(0);
                if (geladen === anzahl) {
                  sektion.classList.add("dreh--bereit");
                  if (ersatz) ersatz.style.opacity = "0";
                }
              };
              bild.onerror = function () { geladen++; };
              bild.src = pfad + (index + 1 < 10 ? "0" : "") + (index + 1) + ".jpg";
              bilder[index] = bild;
            })(k);
          }
        }

        function zeichnen(index) {
          var bild = bilder[index];
          if (!bild || !bild.complete || !bild.naturalWidth) return;
          if (index === aktuell) return;
          aktuell = index;

          /* Bild formatfüllend einpassen, ohne es zu verzerren */
          var lb = leinwand.width, lh = leinwand.height;
          var f = Math.max(lb / bild.naturalWidth, lh / bild.naturalHeight);
          var b = bild.naturalWidth * f, h = bild.naturalHeight * f;
          stift.drawImage(bild, (lb - b) / 2, (lh - h) / 2, b, h);
        }

        function leinwandGroesse() {
          var kasten = leinwand.getBoundingClientRect();
          var dpr = Math.min(window.devicePixelRatio || 1, 2);
          var b = Math.round(kasten.width * dpr);
          var h = Math.round(kasten.height * dpr);
          if (b > 0 && h > 0 && (leinwand.width !== b || leinwand.height !== h)) {
            leinwand.width = b;
            leinwand.height = h;
            var merk = aktuell;
            aktuell = -1;
            if (merk >= 0) zeichnen(merk);
          }
        }

        if (ruhig) {
          /* Bei reduzierter Bewegung nur ein einziges Bild laden */
          var einzel = new Image();
          einzel.onload = function () {
            bilder[0] = einzel;
            leinwandGroesse();
            zeichnen(0);
            if (ersatz) ersatz.style.opacity = "0";
            sektion.classList.add("dreh--bereit");
          };
          einzel.src = pfad + "01.jpg";
          return;
        }

        beiScroll(function () {
          var kasten = sektion.getBoundingClientRect();
          var fensterH = window.innerHeight;

          /* Nah genug? Dann Bilder holen. */
          if (kasten.top < fensterH * 1.5 && kasten.bottom > -fensterH) laden();
          if (kasten.bottom < 0 || kasten.top > fensterH) return;

          leinwandGroesse();

          var weg = sektion.offsetHeight - fensterH;
          if (weg <= 0) return;
          var fortschritt = klemmen(-kasten.top / weg, 0, 1);
          zeichnen(Math.round(fortschritt * (anzahl - 1)));

          /* Text in der Bühne ein- und wieder ausblenden */
          var texte = sektion.querySelectorAll("[data-dreh-text]");
          for (var t = 0; t < texte.length; t++) {
            var von = parseFloat(texte[t].getAttribute("data-von")) || 0;
            var bis = parseFloat(texte[t].getAttribute("data-bis")) || 1;
            var drin = fortschritt >= von && fortschritt <= bis;
            texte[t].classList.toggle("da", drin);
          }
        });
      })(alle[i]);
    }
  }

  /* -----------------------------------------------------------
     2. STANDBILD
     Ein Bild, das beim Durchscrollen langsam größer wird.
     Nur transform — nie width oder height, das würde ruckeln.
     ----------------------------------------------------------- */
  function standbilder() {
    if (ruhig) return;
    var alle = document.querySelectorAll("[data-zoom]");
    if (!alle.length) return;

    beiScroll(function () {
      var fensterH = window.innerHeight;
      for (var i = 0; i < alle.length; i++) {
        var kasten = alle[i].getBoundingClientRect();
        if (kasten.bottom < -200 || kasten.top > fensterH + 200) continue;

        var mitte = kasten.top + kasten.height / 2;
        var lauf = klemmen(1 - mitte / (fensterH + kasten.height / 2), 0, 1);
        var bild = alle[i].querySelector("img");
        if (bild) {
          var skala = 1.16 - lauf * 0.16;
          bild.style.transform = "scale(" + skala.toFixed(4) + ")";
        }
      }
    });
  }

  /* -----------------------------------------------------------
     3. WORTWEISE
     Überschriften mit data-worte erscheinen Wort für Wort,
     sobald sie ins Bild kommen.
     ----------------------------------------------------------- */
  function wortweise() {
    var alle = document.querySelectorAll("[data-worte]");
    if (!alle.length) return;

    for (var i = 0; i < alle.length; i++) {
      var el = alle[i];
      if (ruhig) { el.classList.add("da"); continue; }

      var teile = el.textContent.trim().split(/\s+/);
      el.textContent = "";
      for (var w = 0; w < teile.length; w++) {
        var aussen = document.createElement("span");
        aussen.className = "wort";
        var innen = document.createElement("span");
        innen.textContent = teile[w];
        innen.style.transitionDelay = (w * 55) + "ms";
        aussen.appendChild(innen);
        el.appendChild(aussen);
        if (w < teile.length - 1) el.appendChild(document.createTextNode(" "));
      }
    }

    if (ruhig || !("IntersectionObserver" in window)) return;

    var beobachter = new IntersectionObserver(function (eintraege) {
      for (var k = 0; k < eintraege.length; k++) {
        if (eintraege[k].isIntersecting) {
          eintraege[k].target.classList.add("da");
          beobachter.unobserve(eintraege[k].target);
        }
      }
    }, { threshold: 0.4 });

    for (var j = 0; j < alle.length; j++) beobachter.observe(alle[j]);
  }

  /* -----------------------------------------------------------
     4. ZÄHLER
     Zahlen laufen einmal hoch, wenn sie sichtbar werden.
     Der Endwert steht im HTML — ohne JavaScript steht er sofort da.
     ----------------------------------------------------------- */
  function zaehler() {
    var alle = document.querySelectorAll("[data-zaehler]");
    if (!alle.length || ruhig || !("IntersectionObserver" in window)) return;

    var beobachter = new IntersectionObserver(function (eintraege) {
      for (var k = 0; k < eintraege.length; k++) {
        if (!eintraege[k].isIntersecting) continue;
        var el = eintraege[k].target;
        beobachter.unobserve(el);

        var ziel = parseInt(el.getAttribute("data-zaehler"), 10);
        if (isNaN(ziel)) continue;
        var anhang = el.getAttribute("data-anhang") || "";
        var start = performance.now();
        var dauer = 1100;

        (function (element, endwert, zusatz) {
          function schritt(jetzt) {
            var p = klemmen((jetzt - start) / dauer, 0, 1);
            var e = 1 - Math.pow(1 - p, 3);
            element.textContent = Math.round(endwert * e).toLocaleString("de-DE") + zusatz;
            if (p < 1) window.requestAnimationFrame(schritt);
          }
          window.requestAnimationFrame(schritt);
        })(el, ziel, anhang);
      }
    }, { threshold: 0.6 });

    for (var i = 0; i < alle.length; i++) beobachter.observe(alle[i]);
  }
})();
