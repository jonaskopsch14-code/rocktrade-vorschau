<?php
/* Nimmt das Kontaktformular entgegen und schickt es als Mail weiter. */

declare(strict_types=1);
require __DIR__ . '/assets/mailer.php';

$zurueck = 'kontakt.html';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: ' . $zurueck, true, 303);
    exit;
}

// Spamfalle: automatisch ausgefüllt heißt Bot. Wir tun so, als sei alles gut.
if (ist_spam()) {
    header('Location: ' . DANKE_SEITE, true, 303);
    exit;
}

$name      = feld('name', 120);
$email     = feld('email', 190);
$telefon   = feld('telefon', 60);
$anliegen  = feld('anliegen', 120);
$fahrzeug  = feld('fahrzeug', 200);
$nachricht = feld('nachricht', 5000);
$ok        = feld('einwilligung', 10) !== '';

if ($name === '' || $nachricht === '' || $anliegen === '') {
    zurueck_mit_fehler($zurueck, 'Bitte füllen Sie die Pflichtfelder aus.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    zurueck_mit_fehler($zurueck, 'Bitte prüfen Sie Ihre E-Mail-Adresse.');
}
if (!$ok) {
    zurueck_mit_fehler($zurueck, 'Ohne Einwilligung dürfen wir die Anfrage nicht verarbeiten.');
}

$gesendet = anfrage_senden(
    'Kontaktanfrage: ' . $anliegen,
    [
        'Anliegen'  => $anliegen,
        'Name'      => $name,
        'E-Mail'    => $email,
        'Telefon'   => $telefon,
        'Fahrzeug'  => $fahrzeug,
        'Nachricht' => $nachricht,
    ],
    $email,
    $name
);

if (!$gesendet) {
    zurueck_mit_fehler($zurueck, 'Der Versand hat nicht geklappt. Bitte rufen Sie uns an: 0341 22802620.');
}

header('Location: ' . DANKE_SEITE, true, 303);
exit;
