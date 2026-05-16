var telInput = document.getElementById('f-tel');
if(telInput){
  telInput.addEventListener('input', function(){
    this.value = this.value.replace(/\D/g,'').slice(0,8);
  });
}

var rep = document.getElementById('f-repuesto');
var cc = document.getElementById('char-count');
if(rep && cc){
  rep.addEventListener('input', function(){
    cc.textContent = this.value.length+'/300';
    cc.style.color = this.value.length >= 280 ? '#ff9800' : 'var(--texto-gris)';
  });
}

function validarTelefono(v){
  return /^\d{8}$/.test(v.trim());
}
function validarEmail(v){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

var form = document.getElementById('cotizacion-form');
if(form) {
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    var telVal = document.getElementById('f-tel').value.trim();
    var telErr = document.getElementById('tel-err');
    if(!validarTelefono(telVal)){
      telErr.textContent = 'Ingresa los 8 dígitos de tu número. Ej: 12345678';
      telErr.style.display = 'block';
      document.getElementById('f-tel').focus();
      return;
    } else { telErr.style.display = 'none'; }

    var emailVal = document.getElementById('f-email').value.trim();
    var emailErr = document.getElementById('email-err');
    if(!validarEmail(emailVal)){
      emailErr.textContent = 'Ingresa un email válido. Ej: nombre@correo.com';
      emailErr.style.display = 'block';
      document.getElementById('f-email').focus();
      return;
    } else { emailErr.style.display = 'none'; }

    const token = document.querySelector('[name="cf-turnstile-response"]')?.value;
    if(!token){alert('Por favor completa la verificación de seguridad.');return;}
    const btn = form.querySelector('.submit-btn');
    btn.textContent = 'Enviando...';
    btn.disabled = true;

    const inputs = form.querySelectorAll('input, select, textarea');
    const vals = {};
    inputs.forEach(i => { if(i.name) vals[i.name] = i.value.trim(); });

    const body = {
      nombre: vals.nombre || '',
      telefono: vals.telefono ? '+569' + vals.telefono : '',
      email: vals.email || '',
      marca: vals.marca || '',
      modelo: vals.modelo || '',
      anio: vals.anio || '',
      vin: vals.vin || '',
      tipo_vehiculo: vals.tipo_vehiculo || '',
      repuesto: vals.repuesto || ''
    };

    try {
      const r = await fetch('https://cgsbrbwfsenidwrjekyk.supabase.co/functions/v1/smart-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...body })
      });

      if(r.ok || r.status === 201) {
        document.getElementById('success').style.display = 'block';
        form.reset();
        setTimeout(() => { document.getElementById('success').style.display = 'none'; }, 7000);
      } else {
        throw new Error('Error ' + r.status);
      }
    } catch(err) {
      alert('Hubo un problema al enviar. Por favor escríbenos por WhatsApp.');
    }

    btn.textContent = '🔍 Enviar Solicitud de Cotización';
    btn.disabled = false;
  });
}
