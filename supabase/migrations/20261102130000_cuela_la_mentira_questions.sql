-- Banco de preguntas de Cuela la mentira (docs/PLAN-9.md §6). Listado legible en docs/MENTIRAS.md.
-- Para retirar una pregunta, una migración nueva con `active = false`; esta no se edita.

insert into public.cuela_questions (text, truth, accepted, explanation, source, distractors)
values
  (
    '¿Qué metal dio a conocer en Europa el marino español Antonio de Ulloa en 1748?',
    'El platino',
    array['La platina'],
    'Ulloa lo describió en su relato del viaje a América del Sur. En las minas de oro del Chocó lo llamaban «platina» y era un estorbo.',
    'https://technology.matthey.com/article/36/1/40-47',
    array['El níquel', 'El cobalto', 'El wolframio']
  ),
  (
    '¿Qué diseñó en 1935 el ingeniero granadino Emilio Herrera para subir a la estratosfera?',
    'Un traje espacial',
    array['Una escafandra', 'Una escafandra espacial', 'Un traje de astronauta', 'Un traje presurizado', 'Escafandra estratonáutica'],
    'Era la escafandra estratonáutica, un traje presurizado para volar en globo a más de 20 000 metros. Se considera uno de los precursores de los trajes de los astronautas.',
    'https://en.wikipedia.org/wiki/Stratonautical_space_suit',
    array['Un globo de helio', 'Un paracaídas de seda', 'Un cohete de pólvora']
  ),
  (
    '¿De dónde sale la rayita que lleva encima la ñ?',
    'De una segunda n',
    array['De otra n', 'Una n pequeña', 'Una segunda n', 'De dos enes', 'Dos enes', 'De una n', 'Es una n', 'De la doble n', 'De nn'],
    'Los copistas medievales escribían «nn» para ese sonido y, para ahorrar, ponían la segunda n pequeña encima de la primera. Con los siglos se quedó en una rayita.',
    'https://theconversation.com/where-does-the-n-come-from-the-history-of-a-very-special-spanish-letter-206628',
    array['De un acento griego', 'De una g tumbada', 'De una tilde musical']
  ),
  (
    '¿Qué se lanzan en la fiesta de Els Enfarinats de Ibi cada 28 de diciembre?',
    'Harina y huevos',
    array['Huevos y harina', 'Harina', 'Harina, huevos y petardos', 'Harina y huevo'],
    'El día de los Santos Inocentes, los enfarinats toman el pueblo y se libra una batalla con harina, huevos y petardos.',
    'https://alicanteplaza.es/alicanteplaza/ibi-bajo-el-poder-absurdo-de-els-enfarinats-por-un-dia',
    array['Tomates y agua', 'Naranjas', 'Confeti y vino']
  ),
  (
    '¿Entre qué dos ciudades circuló en 1848 el primer tren de la España peninsular?',
    'Barcelona y Mataró',
    array['Mataró y Barcelona', 'Barcelona-Mataró', 'De Barcelona a Mataró', 'Entre Barcelona y Mataró', 'Barcelona a Mataró'],
    'La línea se inauguró el 28 de octubre de 1848, con unos 30 kilómetros. La locomotora se llamaba precisamente «Mataró».',
    'https://museudelferrocarril.org/pdf/DosierHistorico_LocomotraMataro.pdf',
    array['Madrid y Aranjuez', 'Valencia y el Grao', 'Bilbao y Portugalete']
  ),
  (
    '¿En qué año se inauguró el metro de Madrid?',
    'En 1919',
    array['1919', 'El año 1919'],
    'Alfonso XIII lo inauguró el 17 de octubre de 1919, con un tramo de ocho estaciones entre Cuatro Caminos y Sol.',
    'https://www.comunidad.madrid/node/50450',
    array['En 1931', 'En 1908', 'En 1927']
  ),
  (
    '¿Qué probó Narcís Monturiol en el puerto de Barcelona en 1859?',
    'Un submarino',
    array['El Ictíneo', 'Un submarino de madera'],
    'Era el Ictíneo I, un submarino de madera movido a mano. Hizo decenas de inmersiones en el puerto.',
    'https://en.wikipedia.org/wiki/Ict%C3%ADneo_I',
    array['Un faro giratorio', 'Una grúa de vapor', 'Una campana de buzo']
  ),
  (
    '¿Qué aparato volador inventó el murciano Juan de la Cierva?',
    'El autogiro',
    '{}'::text[],
    'Voló por primera vez en Getafe en enero de 1923. Sus palas giran solas con el aire y fue un paso clave hacia el helicóptero.',
    'https://dbe.rah.es/biografias/12150/juan-de-la-cierva-y-codorniu',
    array['El ala delta', 'El paracaídas plegable', 'El dirigible rígido']
  ),
  (
    'Según Plinio el Viejo, ¿de qué animal toman su nombre las islas Canarias?',
    'De los perros',
    array['Perros', 'Del perro', 'Perro', 'De perros', 'De los canes'],
    'Plinio contó que la isla de Canaria tenía muchísimos perros enormes, y que dos se llevaron al rey Juba. De ahí, del latín canis.',
    'https://www.ull.es/revistas/index.php/fortvnatae/article/view/3752',
    array['De los canarios', 'De las cabras', 'De los lagartos']
  ),
  (
    '¿Qué se le derritió en el bolsillo al ingeniero que descubrió el horno microondas?',
    'Una chocolatina',
    array['Una barrita de chocolate', 'Chocolate', 'Una tableta de chocolate', 'Una barrita'],
    'Percy Spencer trabajaba con radares en 1945 y notó que se le había fundido la chocolatina que llevaba encima. Después probó con maíz y le salieron palomitas.',
    'https://en.wikipedia.org/wiki/Percy_Spencer',
    array['Un caramelo', 'Un trozo de queso', 'Una vela']
  ),
  (
    '¿Qué intentaba conseguir el químico Spencer Silver cuando creó el pegamento de los pósits?',
    'Un pegamento muy fuerte',
    array['Un adhesivo muy fuerte', 'Pegamento fuerte', 'Un superpegamento', 'Un adhesivo fuerte'],
    'En 1968 buscaba un adhesivo más fuerte y le salió uno que pegaba poco y se despegaba sin dejar marca. Años después se usó para las notas adhesivas.',
    'https://www.invent.org/inductees/spencer-silver',
    array['Una pintura magnética', 'Un papel antigrasa', 'Una tinta invisible']
  ),
  (
    '¿Para qué se inventó el plástico de burbujas?',
    'Como papel pintado',
    array['Papel pintado', 'Para empapelar paredes', 'Papel de pared', 'Para decorar paredes', 'Para papel pintado'],
    'En 1957, dos inventores sellaron dos cortinas de ducha para hacer un papel pintado con relieve. No se vendió, y acabó sirviendo para embalar.',
    'https://www.smithsonianmag.com/innovation/accidental-invention-bubble-wrap-180971325/',
    array['Para hacer colchones', 'Para flotar en piscinas', 'Para envolver bombillas']
  ),
  (
    '¿Qué significa «karaoke» en japonés?',
    'Orquesta vacía',
    array['Orquesta sin voz'],
    'Viene de «kara», vacío, y «oke», acortamiento de «okesutora», orquesta: la música está, pero falta quien cante.',
    'https://vitrinelinguistique.oqlf.gouv.qc.ca/fiche-gdt/fiche/8357261/karaoke',
    array['Canta conmigo', 'Voz prestada', 'Micrófono feliz']
  ),
  (
    '¿Qué significa «emoji» en japonés?',
    'Dibujo y letra',
    array['Imagen y letra', 'Dibujo y carácter', 'Imagen y carácter', 'Pictograma', 'Letra con dibujo', 'Carácter con imagen'],
    'Une «e», dibujo, y «moji», letra o carácter. Que se parezca a «emoción» es pura casualidad.',
    'https://www.etymonline.com/word/emoji',
    array['Emoción', 'Cara pequeña', 'Corazón escrito']
  ),
  (
    '¿Qué significa «vodka» en ruso?',
    'Agüita',
    array['Agua pequeña', 'Pequeña agua', 'Agüita pequeña', 'Poca agua', 'Un poco de agua'],
    'Es el diminutivo de «voda», agua. Literalmente, agüita.',
    'https://www.rae.es/dhle/vodka',
    array['Fuego blanco', 'Trigo', 'Invierno']
  ),
  (
    '¿De qué idioma viene la palabra «robot»?',
    'Del checo',
    array['Checo', 'De checo'],
    'La popularizó la obra de teatro «R.U.R.» de Karel Čapek, de 1920. Viene de «robota», trabajo forzado.',
    'https://thereader.mitpress.mit.edu/origin-word-robot-rur/',
    array['Del inglés', 'Del alemán', 'Del japonés']
  ),
  (
    '¿Qué significa «Guadalquivir» en árabe?',
    'Río grande',
    array['Gran río', 'Río mayor'],
    'Viene de «al-wadi al-kabir», el río grande. Los romanos lo llamaban Baetis.',
    'https://en.wikipedia.org/wiki/Guadalquivir',
    array['Río de plata', 'Agua dulce', 'Valle verde']
  ),
  (
    '¿Cómo se llamaba Madrid en la época andalusí?',
    'Mayrit',
    array['Magerit', 'Mayrid', 'Maŷrit', 'Majrit', 'Madjrit'],
    'El emir Muhammad I mandó levantar en el siglo IX una fortaleza junto al Manzanares, donde hoy está el Palacio Real. El lugar se llamaba Mayrit.',
    'https://madridislamico.org/wp-content/uploads/2022/01/MarinNinoUnaciudadMayrit-0241.pdf',
    array['Toletum', 'Emerita', 'Caesaraugusta']
  ),
  (
    '¿Cuántos corazones tiene un pulpo?',
    'Tres',
    array['3', 'Tres corazones', '3 corazones'],
    'Dos bombean la sangre a las branquias y uno al resto del cuerpo. Además, su sangre es azul.',
    'https://lapatilla.com/2023/03/10/cuantos-corazones-tiene-un-pulpo-y-como-los-utiliza/',
    array['Dos', 'Cuatro', 'Ninguno']
  ),
  (
    '¿A qué familia de animales pertenece la orca?',
    'A los delfines',
    array['Delfines', 'Delfín', 'Es un delfín', 'Delfínidos', 'A los delfínidos'],
    'Aunque la llamen ballena asesina, es el delfín más grande que existe: un macho puede pasar de nueve metros.',
    'https://www.guinnessworldrecords.com/world-records/360562-largest-dolphin-species',
    array['A los tiburones', 'A las focas', 'A los atunes']
  ),
  (
    'Además del ornitorrinco, ¿qué mamífero pone huevos?',
    'El equidna',
    array['Los equidnas'],
    'Los dos son monotremas, de Australia y Nueva Guinea. El equidna pone un solo huevo de cáscara blanda.',
    'https://espanol.libretexts.org/Bookshelves/Educacion_Basica/Biologia/12%3A_Vertebrados/12.23%3A_Monotremes',
    array['El armadillo', 'El pangolín', 'El perezoso']
  ),
  (
    '¿Qué estudia la vexilología?',
    'Las banderas',
    array['Las banderas y los estandartes', 'Banderas y estandartes'],
    'Viene del latín «vexillum», estandarte. Estudia banderas, pendones y estandartes.',
    'https://www.ecured.cu/Vexilolog%C3%ADa',
    array['Las campanas', 'Las veletas', 'Las cometas']
  ),
  (
    '¿Qué significan las raíces griegas de la palabra «dinosaurio»?',
    'Lagarto terrible',
    array['Lagarto temible', 'Reptil terrible', 'Lagarto terrorífico', 'Terrible lagarto'],
    'Richard Owen la formó en 1842 con «deinos», terrible, y «sauros», lagarto. Él quería decir que eran temibles por lo enormes.',
    'https://www.merriam-webster.com/dictionary/Dinosaur',
    array['Lagarto antiguo', 'Bestia de piedra', 'Gigante dormido']
  ),
  (
    '¿En honor de quién se llaman Filipinas las islas Filipinas?',
    'De Felipe II',
    array['Felipe II', 'Felipe segundo', 'Del rey Felipe II', 'De Felipe segundo', 'Del príncipe Felipe', 'Felipe 2'],
    'La expedición de Ruy López de Villalobos les puso el nombre en 1543 por el príncipe Felipe, que luego sería el rey Felipe II.',
    'https://revistas.um.es/analesderecho/article/download/56951/54901/240701',
    array['De Felipe V', 'De Felipe el Hermoso', 'De un marinero llamado Felipe']
  ),
  (
    '¿Qué parte de la flor del azafrán es la especia?',
    'Los estigmas',
    array['El estigma', 'Los estigmas de la flor'],
    'Cada flor tiene tres estigmas rojos que se quitan a mano y se secan. Hacen falta muchísimas flores para un kilo.',
    'https://www.mapa.gob.es/ministerio/pags/plataforma_conocimiento/alimentos/fichas%20de%20alimentos/condimentos/AZAFRAN.pdf',
    array['Los pétalos secos', 'El polen', 'Las semillas']
  ),
  (
    '¿Qué son, en la planta, los «arbolitos» verdes del brócoli?',
    'Flores sin abrir',
    array['Flores', 'Capullos de flor', 'Capullos', 'Flores cerradas'],
    'Son racimos de capullos de flor que se cosechan antes de abrirse. Si se dejan, salen flores amarillas.',
    'https://ipm.ucanr.edu/home-and-landscape/flowering-in-broccoli-heads/',
    array['Hojas enrolladas', 'Semillas tiernas', 'Raíces aéreas']
  ),
  (
    '¿De qué animal se saca el colorante rojo carmín, el E-120?',
    'De la cochinilla',
    array['Cochinilla', 'Cochinillas', 'De un insecto', 'Un insecto', 'De las cochinillas'],
    'Se obtiene de hembras secas de un insecto, la cochinilla del carmín, que vive en las chumberas.',
    'https://www.atamanchemicals.com/e120_u29410/?lang=EN',
    array['Del pulpo', 'De la sepia', 'Del cangrejo rojo']
  ),
  (
    '¿De qué están hechos sobre todo los palitos de cangrejo?',
    'De pescado blanco',
    array['Pescado', 'Surimi', 'De pescado', 'Pasta de pescado', 'De surimi', 'Pescado blanco'],
    'Son surimi, una pasta de pescado blanco como el abadejo, con almidón, sabor a marisco y colorante.',
    'https://servicio.mapama.gob.es/ca/ministerio/servicios/informacion/palitos%20cangrejo_tcm34-102843.pdf',
    array['De cangrejo', 'De gamba', 'De soja']
  ),
  (
    '¿Cómo se llama el olor a tierra mojada después de la lluvia?',
    'Petricor',
    '{}'::text[],
    'Lo bautizaron dos científicos australianos en 1964, con «petra», piedra, e «ichor», la sangre de los dioses griegos.',
    'https://maldita.es/malditaciencia/20221214/a-que-se-debe-olor-lluvia/',
    array['Lluviana', 'Humedina', 'Terralia']
  ),
  (
    '¿A qué deporte jugó un astronauta en la Luna en 1971?',
    'Al golf',
    array['Golf'],
    'Alan Shepard, en el Apolo 14, coló a escondidas una cabeza de hierro 6 y golpeó dos bolas con una sola mano.',
    'https://www.mentalfloss.com/science/space/day-1971-apollo-14-golfers-arrived-moon',
    array['Al béisbol', 'A la petanca', 'Al tenis']
  ),
  (
    'Hasta 1948, ¿qué otras competiciones, además de las deportivas, daban medallas en los Juegos Olímpicos?',
    'Las de arte',
    array['Arte', 'Competiciones de arte', 'Concursos de arte', 'Las artísticas', 'Las de arte y literatura'],
    'De 1912 a 1948 hubo medallas de pintura, escultura, arquitectura, literatura y música, siempre sobre el deporte.',
    'https://en.wikipedia.org/wiki/List_of_Olympic_medalists_in_art_competitions',
    array['Las de ajedrez', 'Las de cocina', 'Las de baile de salón']
  ),
  (
    'En los caballitos de mar, ¿quién lleva las crías hasta que nacen?',
    'El macho',
    array['El padre', 'Los machos', 'El caballito macho'],
    'La hembra deja los huevos en una bolsa del macho, que los lleva hasta que salen las crías ya formadas.',
    'https://unamglobal.unam.mx/global_revista/cinco-curiosidades-fascinantes-sobre-los-caballitos-de-mar/',
    array['La hembra', 'Los dos por turnos', 'Una cría mayor']
  ),
  (
    '¿Por qué son rosas los flamencos?',
    'Por lo que comen',
    array['Por la comida', 'Por su comida', 'Por su dieta', 'Por la dieta', 'Por la alimentación', 'Por su alimentación'],
    'Nacen grises y se vuelven rosas por los pigmentos de las algas y los pequeños crustáceos que comen.',
    'https://www.ecoticias.com/naturaleza/las-hembras-de-flamenco-mas-coloridas-ligan-mas',
    array['Por el sol', 'Por el agua salada', 'Por su sangre']
  ),
  (
    '¿Qué animal microscópico sobrevivió en 2007 al vacío del espacio, sin protección?',
    'El tardígrado',
    array['Los tardígrados', 'Osito de agua', 'Oso de agua', 'Ositos de agua'],
    'Viajaron secos fuera de una nave de la Agencia Espacial Europea durante diez días y la mayoría volvió con vida.',
    'https://www.space.com/5817-creature-survives-naked-space.html',
    array['La pulga de agua', 'El ácaro del polvo', 'La hormiga']
  ),
  (
    '¿Qué río pasa por más capitales de países?',
    'El Danubio',
    '{}'::text[],
    'Pasa por cuatro: Viena, Bratislava, Budapest y Belgrado.',
    'https://worldatlas.com/articles/which-river-passes-through-most-national-capital-cities.html',
    array['El Rin', 'El Nilo', 'El Volga']
  ),
  (
    '¿Entre qué dos localidades vizcaínas está el puente transbordador más antiguo del mundo?',
    'Portugalete y Getxo',
    array['Getxo y Portugalete', 'Portugalete y Las Arenas', 'Las Arenas y Portugalete', 'Portugalete-Getxo', 'Entre Portugalete y Getxo'],
    'Es el Puente de Vizcaya, de 1893. Cruza la ría con una barquilla colgada y es Patrimonio de la Humanidad.',
    'https://whc.unesco.org/document/152070',
    array['Bilbao y Barakaldo', 'Bermeo y Mundaka', 'Santurtzi y Sestao']
  ),
  (
    '¿Dónde está Babia, la de «estar en Babia»?',
    'En León',
    array['León', 'En la montaña de León', 'En la provincia de León', 'Provincia de León'],
    'Es una comarca de las montañas de León. La explicación más extendida dice que allí descansaban los reyes leoneses, ajenos a todo.',
    'https://www.rae.es/tdhle/babia',
    array['En Asturias', 'En Cantabria', 'En Huesca']
  ),
  (
    '¿Qué significa «hipopótamo» en griego?',
    'Caballo de río',
    array['Caballo del río', 'Caballo fluvial', 'Caballo de agua'],
    'Une «hippos», caballo, y «potamos», río.',
    'https://www.etymonline.com/es/word/potamo-',
    array['Cerdo gigante', 'Boca enorme', 'Toro del lago']
  ),
  (
    '¿De qué árbol sale el corcho?',
    'Del alcornoque',
    array['Alcornoque', 'Alcornoques'],
    'Es su corteza. Se le quita sin talar el árbol, más o menos cada nueve años.',
    'https://www.miteco.gob.es/es/biodiversidad/temas/inventarios-nacionales/iect_quercus_suber_tcm30-164094.pdf',
    array['Del roble', 'Del pino piñonero', 'De la encina']
  ),
  (
    '¿Qué era el Telekino que presentó Leonardo Torres Quevedo en 1903?',
    'Un mando a distancia',
    array['Un control remoto', 'Un mando por radio', 'Un mando a distancia por radio'],
    'Permitía dar órdenes por radio a una máquina y lo probó con una barca. Está entre los primeros mandos a distancia por radio.',
    'https://ethw.org/Milestones:Early_Developments_in_Remote-Control,_1901',
    array['Un teléfono sin hilos', 'Un radar', 'Un ascensor']
  );
