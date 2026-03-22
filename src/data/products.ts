export interface Product {
  id: string;
  name: string;
  description: string;
  size: string;
  price: number;
  image: string;
  category: string;
}

export const products: Product[] = [
  {
    id: '1',
    name: 'Cepillo Dental Colgate Encias Therapy x 2 Und',
    description: 'Su diseño innovador incluye un mango ergonómico y cerdas súper densas.',
    size: '2 und',
    price: 7.00,
    image: 'https://drive.google.com/thumbnail?id=1nLrYxDicaiaLuN2GRVvo9AcBPiroisPZ&sz=w1000',
    category: 'Cuidado Personal'
  },
  {
    id: '2',
    name: 'Crema Dental Colgate Total Whitening x 150 ml',
    description: 'Protección contra caries, prevención placa, prevención gingivitis, alivio de sensibilidad, aliento fresco, blanqueamiento y neutraliza olor.',
    size: '150 ml',
    price: 8.00,
    image: 'https://drive.google.com/thumbnail?id=1EFsdakKPvxF-VJ8LP9eodZ823G9tWLcm&sz=w1000',
    category: 'Cuidado Personal'
  },
  {
    id: '3',
    name: 'Crema Dental Colgate Triple Accion x 60 ml',
    description: 'Obtén triple beneficio: Protección, Blancura, y Frescura, con tu crema dental Colgate Triple Acción.',
    size: '60 ml',
    price: 2.00,
    image: 'https://drive.google.com/thumbnail?id=1Yv2eNgG6dYBpeJs6w6JUkwkhuQI4kNDs&sz=w1000',
    category: 'Cuidado Personal'
  },
  {
    id: '4',
    name: 'Desinfectante Ajax Multisuperficies x 1 lt',
    description: 'Ajax multiuso antibacterial con fórmula reforzada que remueve la suciedad de tus pisos y arranca la grasa fácilmente.',
    size: '1 Litro',
    price: 5.00,
    image: 'https://drive.google.com/thumbnail?id=1i78OKpULFknQZvBtC13f_MuI-MPxupyB&sz=w1000',
    category: 'Limpieza del Hogar'
  },
  {
    id: '5',
    name: 'Desinfectante Ajax Multisuperficies x 500 ml',
    description: 'Diseñado para eliminar la suciedad y las bacterias en diversas áreas del hogar sin dañar los acabados.',
    size: '500 ml',
    price: 3.00,
    image: 'https://drive.google.com/thumbnail?id=1i78OKpULFknQZvBtC13f_MuI-MPxupyB&sz=w1000',
    category: 'Limpieza del Hogar'
  },
  {
    id: '6',
    name: 'Desinfectante Fabuloso Antibacterial Lavanda x 1 lt',
    description: 'Antibacterial y Antiviral neutraliza malos olores, limpia efectivamente, elimina virus y bacterias y deja una duradera fragancia.',
    size: '1 Litro',
    price: 4.50,
    image: 'https://drive.google.com/thumbnail?id=1Ofgp9gAPpxLWV5POpLY99sfbnBy2VQIJ&sz=w1000',
    category: 'Limpieza del Hogar'
  },
  {
    id: '7',
    name: 'Desodorante Speed Stick Stainguard Spray x 91 gr',
    description: 'Hasta 72 horas de protección gracias a su Tecnología Termo Activada que regula el sudor, el mal olor y se activa al elevar la temperatura de tu piel.',
    size: '91 gr',
    price: 6.00,
    image: 'https://drive.google.com/thumbnail?id=1qi30oczzzl3WnImG-p9UEG4PgCV1Md8W&sz=w1000',
    category: 'Cuidado Personal'
  },
  {
    id: '8',
    name: 'Desodorante Spray Lady Speed Stick Derma Omega 3 x 91 gr',
    description: 'Protección efectiva y soluciones para diferentes necesidades de la piel, escoge la ideal para ti: aclara tu piel y cuida tu piel.',
    size: '91 gr',
    price: 6.00,
    image: 'https://drive.google.com/thumbnail?id=14bD15btFezIH8B9HP1Q42qLXxMk6uhVf&sz=w1000',
    category: 'Cuidado Personal'
  },
  {
    id: '9',
    name: 'Detergente Liquido Vel Rosita x 1 lt',
    description: 'Detergente líquido. Conserva los colores originales de las prendas y las mantiene como nuevas por mucho más tiempo.',
    size: '1 Litro',
    price: 5.00,
    image: 'https://drive.google.com/thumbnail?id=11xIpXvuntnECL77Yn7K0Vg0dQOSdtPC1&sz=w1000',
    category: 'Limpieza del Hogar'
  },
  {
    id: '10',
    name: 'Jabón En Barra Palmolive Naturals Avena y Azúcar Morena x 110 gr',
    description: 'Fabricado responsablemente con humectante natural y fragancia con ingredientes naturales para una piel suave y hermosa.',
    size: '110 gr',
    price: 1.40,
    image: 'https://drive.google.com/thumbnail?id=1an5QzlwPPb-4OyX7Bh7VwSriIjowm2P7&sz=w1000',
    category: 'Cuidado Personal'
  },
  {
    id: '11',
    name: 'Jabón En Barra Protex Avena x 110 gr',
    description: 'Jabón Protex Avena elimina 99.9% de las bacterias naturalmente.',
    size: '110 gr',
    price: 1.40,
    image: 'https://drive.google.com/thumbnail?id=15oQrTSE57tImxSYGe3isSusEGKzCy7tO&sz=w1000',
    category: 'Cuidado Personal'
  },
  {
    id: '12',
    name: 'Jabón En Barra Protex Fresh 110 gr x 3 und',
    description: 'Fortalece las defensas naturales de la piel para mantenerla saludable de adentro hacia afuera. Protección Antibacterial hasta por 12 horas.',
    size: '110 gr x 3 und',
    price: 4.00,
    image: 'https://drive.google.com/thumbnail?id=1J20ZJuUx-3wPXUHpQGmgh7je7AHpP0Qw&sz=w1000',
    category: 'Cuidado Personal'
  },
  {
    id: '13',
    name: 'Jabón En Barra Protex Fresh x 110 gr',
    description: 'Jabón Protex elimina 99.9% de las bacterias naturalmente.',
    size: '110 gr',
    price: 1.40,
    image: 'https://drive.google.com/thumbnail?id=1_r851MWngErsL9CkvvrqZg858o0XAJpZ&sz=w1000',
    category: 'Cuidado Personal'
  },
  {
    id: '14',
    name: 'Jabón En Barra Protex Nutri Protect Macadamia 110 gr x 3 und',
    description: 'El jabón antibacterial Protex Nutri Protect Glicerina Omega 3 elimina el 99.9 de las bacterias naturalmente.',
    size: '110 gr x 3 und',
    price: 4.00,
    image: 'https://drive.google.com/thumbnail?id=1SlUvrfT0m9uMQJDtJIHf23xubwm2DgHZ&sz=w1000',
    category: 'Cuidado Personal'
  },
  {
    id: '15',
    name: 'Lavaplatos Brisol Multiuso x 825 ml',
    description: 'Su fórmula concentrada corta la grasa y la suciedad más pegada de manera rápida y eficiente, dejando tus platos, ollas y sartenes relucientes.',
    size: '825 ml',
    price: 6.00,
    image: 'https://drive.google.com/thumbnail?id=1chJm4aK5FafKVaLL1aE75q6haEAlJUBU&sz=w1000',
    category: 'Limpieza del Hogar'
  },
  {
    id: '16',
    name: 'Lavaplatos En Crema Axion Aloe Y Vitamina E x 450 gr',
    description: 'Limpiador de vajillas diseñado para ofrecer un equilibrio entre un alto poder desengrasante y el cuidado de la piel.',
    size: '450 gr',
    price: 4.50,
    image: 'https://drive.google.com/thumbnail?id=1Y0tFzmn3fZWSbqr9SkBb3VadnCgliccm&sz=w1000',
    category: 'Limpieza del Hogar'
  },
  {
    id: '17',
    name: 'Lavaplatos En Crema Axion Blue 7 En 1 x 450 gr',
    description: 'Es conocido por su distintivo color azul y su potente fórmula antibacterial.',
    size: '450 gr',
    price: 5.00,
    image: 'https://drive.google.com/thumbnail?id=1xQ92oX8ymh68i4I2tqYQiqlRm7ASF_qs&sz=w1000',
    category: 'Limpieza del Hogar'
  },
  {
    id: '18',
    name: 'Lavaplatos En Crema Axion Multiuso x 235 gr',
    description: 'Axion el verdadero arranca grasa.',
    size: '235 gr',
    price: 2.00,
    image: 'https://drive.google.com/thumbnail?id=1mMRvEnM9jl-OYMSHzHFxGVrYeXnh4zIL&sz=w1000',
    category: 'Limpieza del Hogar'
  },
  {
    id: '19',
    name: 'Lavaplatos Líquido Axion Limón x 750 ml',
    description: 'Su fórmula concentrada con el poder natural del limón ataca y elimina la grasa más difícil de tus platos y utensilios.',
    size: '750 ml',
    price: 6.00,
    image: 'https://drive.google.com/thumbnail?id=16AzLmpZfM4hQFF6NLmW2PRXXzOcdGACf&sz=w1000',
    category: 'Limpieza del Hogar'
  },
  {
    id: '20',
    name: 'Suavizante Suavitel Fresca Primavera x 1 lt',
    description: 'Deliciosamente suave y de cuidado superior. Suavitel ofrece una suavidad irresistible a su ropa acompañada de un agradable aroma.',
    size: '1 Litro',
    price: 5.00,
    image: 'https://drive.google.com/thumbnail?id=13eKv4IKvTrT_bh5ahdA7dD25Q9qGkb6l&sz=w1000',
    category: 'Limpieza del Hogar'
  }
];
