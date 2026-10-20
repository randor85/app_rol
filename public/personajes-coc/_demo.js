/* Personaje de prueba de la ficha de Call of Cthulhu (no se publica: ver firebase.json → ignore). */
window.PERSONAJES_COC = window.PERSONAJES_COC || {};
PERSONAJES_COC._demo = {
  id: '_demo', nombre: 'Ada Prueba', sistema: 'coc', paleta: 'ascua',
  info: { jugador: 'Tester', ocupacion: 'Periodista', edad: '32', residencia: 'Arkham', nacimiento: 'Boston', genero: 'Femenino', movimiento: '8', credito: '30', descripcion: 'Alta y de mirada inquieta.' },
  caracteristicas: { str: 50, con: 60, siz: 55, dex: 70, app: 65, int: 75, pow: 60, edu: 80 },
  suerte: 55, pv: { max: 11, actual: 11 }, pm: { max: 12, actual: 12 }, san: { max: 60, actual: 60 },
  habilidades: [
    { id: 'archaeology', nombre: 'Arqueología', en: 'Archaeology', val: 70, ocup: true },
    { id: 'dodge', nombre: 'Esquivar', en: 'Dodge', val: 35 },
    { id: 'firearms_handgun', nombre: 'Armas de fuego: Pistola', en: 'Firearms: Handgun', val: 40 },
    { id: 'cthulhu_mythos', nombre: 'Mitos de Cthulhu', en: 'Cthulhu Mythos', val: 10 },
    { id: 'credit_rating', nombre: 'Nivel de Crédito', en: 'Credit Rating', val: 30 },
    { id: 'occult', nombre: 'Ocultismo', en: 'Occult', val: 45 },
  ],
  armas: [
    { nombre: 'Revólver .38', habilidad: 'firearms_handgun', dano: '1d10', alcance: '15 yardas', ataques: '1', bono: '', empala: true, notas: '6 balas' },
    { nombre: 'Puñetazo', habilidad: 'fighting_brawl', objetivo: 50, dano: '1d3', alcance: 'Contacto', ataques: '1', bono: 'completo', empala: false, notas: '' },
  ],
  capacidades: [
    { id: 'cap_chispa', nombre: 'Chispa', tipo: 'hechizo', meta: 'Coste: 2 PM', texto: 'Un destello de fuego.', coste: { pm: 2, dadoEfecto: '1d6' } },
    { id: 'cap_ojo', nombre: 'Ojo curioso', tipo: 'pasiva', meta: 'Pasiva', texto: 'Bonificación narrativa.' },
  ],
  equipamiento: 'Cámara, libreta.', finanzas: 'Efectivo: 40 USD',
  trasfondo: { ideologia: 'Escéptica.' },
  descanso: { pv: 'max', pm: 'max', san: 'max' },
};
