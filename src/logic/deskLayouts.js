export const PHYSICAL_SEATS_BY_LOCATION = {
  WEWORK: [
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17',
    '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32',
    '148', '149', '150', '151', '152', '153', '154',
  ],
  OFICINA_93: ['39', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', 'NN'],
}

export const DESK_PLAN_META = {
  WEWORK: {
    title: 'Plano general WeWork',
    subtitle: 'Referencia visual de puestos sobre el corredor principal.',
    markers: ['Ventanas', 'Pasillo central', 'Ingreso'],
    corridorLabel: 'Circulacion principal',
  },
  OFICINA_93: {
    title: 'Plano Oficina 93',
    subtitle: 'Distribucion compacta de puestos para personal fijo y flotante.',
    markers: ['Archivo', 'Mesa de apoyo', 'Ingreso'],
    corridorLabel: 'Paso lateral',
  },
}

export const DESK_LAYOUTS = {
  WEWORK: [
    {
      title: 'Frente de ventanas',
      note: 'Bloque principal con puestos 1 al 17.',
      rows: [
        ['17', null, '2', '1'],
        ['16', null, '3', '4'],
        ['15', null, '6', '5'],
        ['14', null, '7', '8'],
        ['13', null, '10', '9'],
        [null, null, '11', '12'],
      ],
    },
    {
      title: 'Corredor lateral',
      note: 'Bloque intermedio con puestos 18 al 32.',
      rows: [
        ['32', null, '18'],
        ['31', null, '19'],
        ['30', null, '20'],
        ['29', null, '21'],
        ['28', null, '22'],
        ['27', null, '23'],
        ['26', null, '24'],
        [null, '25', null],
      ],
    },
    {
      title: 'Bloque posterior',
      note: 'Zona posterior de puestos altos 148 a 154.',
      rows: [
        ['150', null, '151'],
        ['149', null, '152'],
        ['148', null, '153'],
        [null, null, '154'],
      ],
    },
  ],
  OFICINA_93: [
    {
      title: 'Bloque operativo',
      note: 'Puestos alrededor del nucleo de circulacion.',
      rows: [
        ['48', '49', null],
        ['47', null, '51'],
        ['46', null, '41'],
        ['45', '44', '43'],
        ['39', null, 'NN'],
        [null, null, '42'],
      ],
    },
  ],
}