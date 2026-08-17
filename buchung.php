<?php
/* Nimmt die Terminanfrage für die Performance Experience entgegen. */

declare(strict_types=1);
require __DIR__ . '/assets/mailer.php';

$zurueck = 'performance-experience.html#buchen';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: performance-experience.html', true, 303);
    exit;
}

if (ist_spam()) {
    header('Location: ' . DANKE_SEITE, true, 303);
    exit;
}

$fahrzeug  = feld('fahrzeug', 200);
$datum     = feld('datum', 20);
$zeit      = feld('zeit', 60);
$extras    = mehrfach('extras');
$name      = feld('name', 120);
$email     = feld('email', 190);
$telefon   = feld('telefon', 60);
$nachricht = feld('nachricht', 5000);
$ok        = feld('einwilligung', 10) !== '';

if ($fahrzeug === '' || $datum === '' || $name === '' || $telefon === '') {
    zurueck_mit_fehler($zurueck, 'Bitte füllen Sie die Pflichtfelder aus.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    zurueck_mit_fehler($zurueck, 'Bitte prüfen Sie Ihre E-Mail-Adresse.');
}
if (!$ok) {
    zurueck_mit_fehler($zurueck, 'Ohne Einwilligung dürfen wir die Anfrage nicht verarbeiten.');
}

// Datum in deutscher Schreibweise, falls es ein gültiges Datum ist
$datumLesbar = $datum;
$d = DateTime::createFromFormat('Y-m-d', $datum);
if ($d instanceof DateTime) {
    $datumLesbar = $d->format('d.m.Y');
}

$gesendet = anfrage_senden(
    'Performance Experience: ' . $fahrzeug,
    [
        'Fahrzeug'      => $fahrzeug,
        'Wunschtermin'  => $datumLesbar . ($zeit !== '' ? ' (' . $zeit . ')' : ''),
        'Zusatzwünsche' => $extras,
        'Name'          => $name,
        'Telefon'       => $telefon,
        'E-Mail'        => $email,
        'Nachricht'     => $nachricht,
    ],
    $email,
    $name
);

if (!$gesendet) {
    zurueck_mit_fehler($zurueck, 'Der Versand hat nicht geklappt. Bitte rufen Sie uns an: 0341 22802620.');
}

header('Location: ' . DANKE_SEITE, true, 303);
exit;
