export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const required = ['Nom', 'Téléphone', 'Date', 'Heure'];
    for (const field of required) {
      if (!String(body[field] || '').trim()) {
        return res.status(400).json({ error: 'Informations de réservation manquantes.' });
      }
    }

    const reservation = {
      id: 'R-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      createdAt: new Date().toISOString(),
      nom: String(body.Nom).trim(),
      telephone: String(body['Téléphone']).trim(),
      date: String(body.Date).trim(),
      heure: String(body.Heure).trim(),
      personnes: String(body['Nombre de personnes'] || '2'),
      message: String(body.Message || '').trim(),
      status: 'nouvelle'
    };

    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) {
      return res.status(503).json({ error: 'Le stockage des réservations n’est pas encore connecté.' });
    }

    const key = 'reservations:all';
    const get = await fetch(url + '/get/' + encodeURIComponent(key), {
      headers: { Authorization: 'Bearer ' + token }
    });
    const existingData = await get.json();
    let reservations = [];
    if (existingData.result) {
      try { reservations = JSON.parse(existingData.result); } catch (_) {}
    }
    reservations.unshift(reservation);

    const save = await fetch(url + '/set/' + encodeURIComponent(key) + '/' + encodeURIComponent(JSON.stringify(reservations)), {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!save.ok) throw new Error('Storage error');

    try {
      const email = process.env.RESERVATION_EMAIL || 'Pauletpaulettedhoom@gmail.com';
      const subject = encodeURIComponent('Nouvelle réservation — Paul & Paulette');
      const message = [
        'Nouvelle réservation',
        '',
        'Nom : ' + reservation.nom,
        'Téléphone : ' + reservation.telephone,
        'Date : ' + reservation.date,
        'Heure : ' + reservation.heure,
        'Personnes : ' + reservation.personnes,
        'Message : ' + reservation.message,
        '',
        'ID : ' + reservation.id
      ].join('\n');
      await fetch('https://formsubmit.co/' + encodeURIComponent(email), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: '_subject=' + subject + '&message=' + encodeURIComponent(message) + '&_captcha=false'
      });
    } catch (_) {}

    return res.status(200).json({ ok: true, id: reservation.id });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible d’enregistrer la réservation.' });
  }
}
