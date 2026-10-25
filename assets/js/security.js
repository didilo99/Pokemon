/**
 * Pokédex Security Suite
 * - Bloqueo de clic derecho (Menú contextual)
 * - Protección de imágenes (evita arrastrar y guardar imágenes fácilmente)
 */

(function () {
  'use strict';

  // 1. Deshabilitar clic derecho (Menú contextual)
  document.addEventListener(
    'contextmenu',
    function (e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    },
    true
  );

  // 2. Prevenir arrastre de imágenes
  document.addEventListener(
    'dragstart',
    function (e) {
      if (e.target && (e.target.nodeName === 'IMG' || e.target.closest('img'))) {
        e.preventDefault();
        return false;
      }
    },
    false
  );

  // 3. Inyectar estilos para evitar selección y arrastre nativo de imágenes
  const style = document.createElement('style');
  style.textContent = `
    img {
      -webkit-user-drag: none;
      -khtml-user-drag: none;
      -moz-user-drag: none;
      -o-user-drag: none;
      user-drag: none;
      -webkit-touch-callout: none;
    }
  `;
  if (document.head) {
    document.head.appendChild(style);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      document.head.appendChild(style);
    });
  }
})();
