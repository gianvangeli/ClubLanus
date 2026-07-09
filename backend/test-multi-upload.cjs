const fs = require('fs');
const path = require('path');

const base = 'C:\\Users\\gianv\\AppData\\Local\\Temp\\claude\\C--Users-gianv\\78086843-f61a-4651-9f37-555363671c9d\\scratchpad';

(async () => {
  const token = process.argv[2];
  const jugadorId = process.argv[3];

  const form = new FormData();
  form.append('descripcion', 'Lote de prueba (fetch)');
  form.append('videos', new Blob([fs.readFileSync(path.join(base, 'clip1.mp4'))], { type: 'video/mp4' }), 'clip1.mp4');
  form.append('videos', new Blob([fs.readFileSync(path.join(base, 'clip2.mov'))], { type: 'video/quicktime' }), 'clip2.mov');

  const res = await fetch(`http://localhost:3000/api/jugadores/${jugadorId}/videos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  console.log('status:', res.status);
  console.log(await res.text());
})();
