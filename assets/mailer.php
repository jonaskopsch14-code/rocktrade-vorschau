<?php
/* =============================================================
   Rocktrade GmbH — gemeinsame Hilfsfunktionen für die Formulare

   Wird von kontakt.php und buchung.php eingebunden.
   Kein Fremdanbieter, keine Bibliothek: die Mail geht über die
   PHP-Funktion mail() direkt vom eigenen Server raus.
   ============================================================= */

/* ---------- EINSTELLUNGEN — hier anpassen ---------- */

// Wohin die Anfragen gehen sollen
const EMPFAENGER = 'kontakt@rocktrade.de';

// Absenderadresse. WICHTIG: Muss eine Adresse der eigenen Domain sein,
// sonst stufen viele Mailserver die Nachricht als Spam ein oder lehnen
// sie ab. Beim Hoster ggf. vorher anlegen.
const ABSENDER = 'website@rocktrade.de';
const ABSENDER_NAME = 'Rocktrade Website';

// Seite, auf die nach erfolgreichem Versand weitergeleitet wird
const DANKE_SEITE = 'danke.html';


/* ---------- Hilfsfunktionen ---------- */

/** Holt ein Feld aus $_POST, entfernt Steuerzeichen und kürzt es. */
function feld(string $name, int $max = 2000): string
{
    $wert = $_POST[$name] ?? '';
    if (!is_string($wert)) {
        return '';
    }
    $wert = trim($wert);
    // Steuerzeichen raus, Zeilenumbrüche bei mehrzeiligen Feldern behalten
    $wert = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $wert);
    if (mb_strlen($wert) > $max) {
        $wert = mb_substr($wert, 0, $max);
    }
    return $wert;
}

/**
 * Entfernt alles, was in einem Mail-Header eine neue Zeile öffnen könnte.
 * Ohne das könnte jemand über das Formular fremde Empfänger einschleusen
 * (Header-Injection).
 */
function kopfzeile_sicher(string $wert): string
{
    return trim(str_replace(["\r", "\n", "%0a", "%0d", "\t"], ' ', $wert));
}

/** Prüft, ob die Spamfalle ausgefüllt wurde. Menschen sehen das Feld nie. */
function ist_spam(): bool
{
    return feld('webseite') !== '';
}

/** Baut eine Liste von Mehrfachauswahlen zu einem Text zusammen. */
function mehrfach(string $name): string
{
    $werte = $_POST[$name] ?? [];
    if (!is_array($werte) || count($werte) === 0) {
        return 'keine';
    }
    $sauber = [];
    foreach ($werte as $w) {
        if (is_string($w)) {
            $sauber[] = preg_replace('/[\x00-\x1F\x7F]/u', '', trim($w));
        }
    }
    return implode(', ', array_slice($sauber, 0, 20));
}

/** Bricht ab und leitet mit einer Fehlermeldung zurück. */
function zurueck_mit_fehler(string $seite, string $grund): void
{
    header('Location: ' . $seite . '?fehler=' . rawurlencode($grund), true, 303);
    exit;
}

/**
 * Verschickt die Anfrage.
 * $zeilen ist ein Feld aus Beschriftung => Wert.
 */
function anfrage_senden(string $betreff, array $zeilen, string $antwortAn, string $antwortName): bool
{
    $text = "Neue Anfrage über die Website\r\n";
    $text .= str_repeat('=', 46) . "\r\n\r\n";

    foreach ($zeilen as $label => $wert) {
        if ($wert === '' || $wert === null) {
            continue;
        }
        $text .= $label . ":\r\n" . $wert . "\r\n\r\n";
    }

    $text .= str_repeat('-', 46) . "\r\n";
    $text .= 'Gesendet am ' . date('d.m.Y \u\m H:i') . " Uhr\r\n";
    $text .= 'IP-Adresse: ' . ($_SERVER['REMOTE_ADDR'] ?? 'unbekannt') . "\r\n";

    $absenderName = kopfzeile_sicher(ABSENDER_NAME);
    $kopf   = 'From: =?UTF-8?B?' . base64_encode($absenderName) . '?= <' . ABSENDER . ">\r\n";
    $kopf  .= 'Content-Type: text/plain; charset=UTF-8' . "\r\n";
    $kopf  .= 'Content-Transfer-Encoding: 8bit' . "\r\n";
    $kopf  .= 'X-Mailer: Rocktrade-Website' . "\r\n";

    // Antwortadresse nur setzen, wenn sie wirklich eine gültige Mailadresse ist
    if (filter_var($antwortAn, FILTER_VALIDATE_EMAIL)) {
        $name = kopfzeile_sicher($antwortName);
        $kopf .= 'Reply-To: =?UTF-8?B?' . base64_encode($name) . '?= <' . $antwortAn . ">\r\n";
    }

    $betreffKodiert = '=?UTF-8?B?' . base64_encode(kopfzeile_sicher($betreff)) . '?=';

    return @mail(EMPFAENGER, $betreffKodiert, $text, $kopf, '-f' . ABSENDER);
}
