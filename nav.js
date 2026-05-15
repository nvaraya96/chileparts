(function(){
  var pages = [
    {href:'index.html',    icon:'🏠', label:'Inicio'},
    {href:'historia.html', icon:'📖', label:'Historia'},
    {href:'como-funciona.html', icon:'⚙️', label:'Cómo Funciona'},
    {href:'medios-de-pago.html', icon:'💳', label:'Medios de Pago'},
    {href:'condiciones.html', icon:'📋', label:'Condiciones'},
    {href:'garantias.html', icon:'🛡️', label:'Garantías'},
    {href:'compromiso.html', icon:'🤝', label:'Compromiso'},
    {href:'asesoria.html', icon:'🔧', label:'Asesoría'},
    {href:'cotizacion.html', icon:'💬', label:'Cotizar', cls:'cotizar'}
  ];

  var current = window.location.pathname.split('/').pop() || 'index.html';
  if(current === '') current = 'index.html';

  var navItems = pages.map(function(p){
    var isActive = current === p.href;
    var itemCls = p.cls ? ' ' + p.cls : '';
    var linkCls = isActive ? ' class="active"' : '';
    return '<div class="nav-banner-item' + itemCls + '">' +
      '<a href="' + p.href + '"' + linkCls + '>' +
      '<span class="nav-icon">' + p.icon + '</span>' +
      '<span>' + p.label + '</span>' +
      '</a></div>';
  }).join('');

  var html =
    '<div class="topbar">' +
      '<a href="https://wa.me/56927176437">📱 +56 9 2717 6437</a>' +
      '<a href="mailto:contacto@chileparts.cl">✉️ contacto@chileparts.cl</a>' +
    '</div>' +
    '<header>' +
      '<div class="header-logo">' +
        '<a href="index.html" style="text-decoration:none;display:flex;align-items:center;gap:10px;">' +
          '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:32px;letter-spacing:3px;color:#fff;line-height:1;">CHILE<span style="color:#CC0000;">PARTS</span></span>' +
          '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#666;border-left:1px solid #333;padding-left:10px;line-height:1.4;">Importación<br>de Repuestos</span>' +
        '</a>' +
      '</div>' +
      '<button class="hamburger" id="hamburger" aria-label="Abrir menú">' +
        '<span></span><span></span><span></span>' +
      '</button>' +
    '</header>' +
    '<nav class="nav-banner" id="nav-banner">' +
      '<div class="nav-banner-inner">' + navItems + '</div>' +
    '</nav>';

  var container = document.getElementById('site-nav');
  if(container) container.innerHTML = html;

  var btn = document.getElementById('hamburger');
  var nav = document.getElementById('nav-banner');
  if(btn && nav){
    btn.addEventListener('click', function(){
      btn.classList.toggle('open');
      nav.classList.toggle('open');
    });
    document.addEventListener('click', function(e){
      if(!btn.contains(e.target) && !nav.contains(e.target)){
        btn.classList.remove('open');
        nav.classList.remove('open');
      }
    });
  }
})();
