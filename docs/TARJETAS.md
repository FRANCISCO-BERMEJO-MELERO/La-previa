# Tarjetas

Tarjetas de Palabras prohibidas para revisar y podar. La fuente es la migración `supabase/migrations/20261011110100_palabras_prohibidas_cards.sql`; para cambiarlas hace falta una migración nueva (desactivar con `active = false` o añadir tarjetas).

Criterios (docs/JUEGOS-2.md §8 y docs/JUEGOS.md §10): español de España, tono de grupo de amigos, nada que señale físico, salud, dinero, orientación, origen o creencias, ni que empuje a beber o a hacer algo arriesgado. Las cinco prohibidas son las pistas más obvias; la base de datos comprueba que son cinco, distintas entre sí y de la palabra, sin contar mayúsculas, tildes ni espacios.

Cada línea es la palabra y, detrás, sus cinco prohibidas.

## Comida (15)

- **Pizza**: Italia, Queso, Masa, Horno, Tomate
- **Paella**: Arroz, Valencia, Marisco, Sartén, Domingo
- **Tortilla**: Patata, Huevo, Cebolla, Sartén, Pincho
- **Churros**: Chocolate, Desayuno, Masa, Azúcar, Freír
- **Gazpacho**: Tomate, Frío, Verano, Andalucía, Sopa
- **Croqueta**: Bechamel, Jamón, Frita, Rebozada, Abuela
- **Helado**: Frío, Cucurucho, Verano, Bola, Chocolate
- **Palomitas**: Cine, Maíz, Mantequilla, Sal, Microondas
- **Sushi**: Japón, Arroz, Pescado, Palillos, Crudo
- **Hamburguesa**: Pan, Carne, Queso, Ketchup, Patatas
- **Café**: Taza, Cafeína, Leche, Desayuno, Despertar
- **Turrón**: Navidad, Almendra, Duro, Blando, Dulce
- **Bocadillo**: Pan, Barra, Jamón, Merienda, Relleno
- **Ensalada**: Lechuga, Tomate, Aliño, Verde, Aceite
- **Chocolate**: Cacao, Tableta, Dulce, Negro, Leche

## Casa (15)

- **Sofá**: Sentarse, Salón, Cojín, Tele, Siesta
- **Nevera**: Frío, Cocina, Comida, Congelador, Puerta
- **Ducha**: Agua, Baño, Jabón, Champú, Grifo
- **Almohada**: Cama, Dormir, Cabeza, Funda, Pluma
- **Lavadora**: Ropa, Agua, Jabón, Centrifugado, Tender
- **Microondas**: Calentar, Cocina, Minuto, Pitido, Plato
- **Escoba**: Barrer, Suelo, Bruja, Recogedor, Polvo
- **Espejo**: Reflejo, Mirarse, Cristal, Baño, Imagen
- **Llave**: Puerta, Cerradura, Abrir, Llavero, Casa
- **Ventana**: Cristal, Abrir, Persiana, Luz, Cortina
- **Despertador**: Alarma, Mañana, Sonar, Hora, Madrugar
- **Mando**: Tele, Botón, Canal, Pilas, Sofá
- **Escalera**: Subir, Bajar, Escalón, Piso, Ascensor
- **Bañera**: Agua, Espuma, Baño, Relajarse, Patito
- **Cortina**: Ventana, Tela, Correr, Luz, Ducha

## Ocio y fiesta (15)

- **Karaoke**: Cantar, Micrófono, Canción, Letra, Pantalla
- **Cumpleaños**: Tarta, Velas, Regalo, Fiesta, Años
- **Disfraz**: Carnaval, Halloween, Vestirse, Máscara, Fiesta
- **Discoteca**: Bailar, Música, Noche, Pista, Portero
- **Concierto**: Música, Escenario, Entradas, Grupo, Cantante
- **Piscina**: Agua, Nadar, Verano, Bañador, Toalla
- **Cine**: Película, Pantalla, Palomitas, Butaca, Entrada
- **Videojuego**: Consola, Mando, Jugar, Pantalla, Nivel
- **Parchís**: Fichas, Dado, Tablero, Casa, Comer
- **Nochevieja**: Uvas, Campanadas, Año, Diciembre, Fiesta
- **Barbacoa**: Carne, Fuego, Parrilla, Carbón, Verano
- **Feria**: Caseta, Farolillos, Atracciones, Sevillanas, Algodón
- **Selfi**: Foto, Móvil, Cara, Palo, Redes
- **Serie**: Capítulo, Temporada, Tele, Maratón, Personaje
- **Baile**: Bailar, Música, Pareja, Pista, Pasos

## Naturaleza (15)

- **Playa**: Arena, Mar, Toalla, Sol, Verano
- **Montaña**: Cima, Subir, Nieve, Senderismo, Alta
- **Arcoíris**: Colores, Lluvia, Cielo, Sol, Siete
- **Volcán**: Lava, Erupción, Fuego, Montaña, Ceniza
- **Nieve**: Blanca, Frío, Invierno, Copo, Esquiar
- **Tormenta**: Rayo, Trueno, Lluvia, Nube, Relámpago
- **Luna**: Noche, Llena, Cielo, Astronauta, Satélite
- **Sol**: Calor, Luz, Cielo, Día, Estrella
- **Bosque**: Árboles, Hojas, Verde, Senderismo, Lobo
- **Río**: Agua, Corriente, Puente, Pescar, Orilla
- **Desierto**: Arena, Calor, Camello, Oasis, Seco
- **Isla**: Mar, Agua, Rodeada, Playa, Náufrago
- **Flor**: Pétalo, Planta, Jardín, Ramo, Primavera
- **Cascada**: Agua, Caer, Río, Altura, Chorro
- **Otoño**: Hojas, Estación, Septiembre, Castañas, Caer

## Animales (15)

- **Perro**: Ladrar, Mascota, Hueso, Pasear, Correa
- **Gato**: Maullar, Mascota, Bigotes, Ratón, Siete vidas
- **Elefante**: Trompa, Grande, Orejas, Gris, Colmillos
- **Jirafa**: Cuello, Largo, Manchas, África, Alta
- **Pingüino**: Hielo, Frío, Pájaro, Nadar, Esmoquin
- **Tiburón**: Mar, Aleta, Dientes, Peligroso, Pez
- **Mono**: Plátano, Árbol, Selva, Saltar, Cola
- **Abeja**: Miel, Picar, Panal, Flor, Zumbido
- **Caracol**: Lento, Concha, Baba, Casa, Cuernos
- **Delfín**: Mar, Saltar, Listo, Aleta, Nadar
- **León**: Rey, Selva, Melena, Rugir, Felino
- **Murciélago**: Noche, Volar, Cueva, Vampiro, Ciego
- **Pulpo**: Tentáculos, Ocho, Mar, Tinta, Gallega
- **Vaca**: Leche, Mugir, Granja, Manchas, Campo
- **Hormiga**: Pequeña, Trabajadora, Hormiguero, Fila, Insecto

## Deportes (15)

- **Fútbol**: Balón, Gol, Portería, Equipo, Árbitro
- **Baloncesto**: Canasta, Balón, Botar, Altos, Triple
- **Tenis**: Raqueta, Pelota, Red, Pista, Saque
- **Natación**: Piscina, Agua, Nadar, Bañador, Largos
- **Ciclismo**: Bici, Pedalear, Tour, Carrera, Casco
- **Esquí**: Nieve, Montaña, Pista, Bastones, Invierno
- **Maratón**: Correr, Kilómetros, Carrera, Meta, Largo
- **Ajedrez**: Tablero, Rey, Reina, Jaque, Peón
- **Surf**: Tabla, Ola, Mar, Playa, Equilibrio
- **Boxeo**: Guantes, Puñetazo, Ring, Combate, Asalto
- **Golf**: Hoyo, Palo, Bola, Césped, Campo
- **Yoga**: Postura, Esterilla, Respirar, Estirar, Relajarse
- **Gimnasio**: Pesas, Ejercicio, Músculo, Máquinas, Entrenar
- **Penalti**: Fútbol, Portero, Gol, Punto, Tiro
- **Olimpiadas**: Medalla, Oro, Aros, Deportistas, Cuatro años

## Lugares (15)

- **Aeropuerto**: Avión, Maleta, Vuelo, Embarque, Pista
- **Biblioteca**: Libros, Silencio, Leer, Préstamo, Estudiar
- **Supermercado**: Compra, Carrito, Caja, Comida, Cola
- **Colegio**: Clase, Profesor, Niños, Recreo, Pupitre
- **Museo**: Cuadros, Arte, Exposición, Visita, Guía
- **Restaurante**: Comer, Camarero, Mesa, Carta, Cuenta
- **Hotel**: Habitación, Recepción, Dormir, Vacaciones, Llave
- **Estación**: Tren, Andén, Vía, Billete, Viajar
- **Zoo**: Animales, Jaula, Visitar, León, Elefante
- **Peluquería**: Pelo, Cortar, Tijeras, Secador, Tinte
- **Parque**: Árboles, Columpios, Bancos, Pasear, Niños
- **Castillo**: Rey, Princesa, Torre, Muralla, Medieval
- **Faro**: Luz, Mar, Barcos, Costa, Torre
- **Oficina**: Trabajo, Ordenador, Mesa, Jefe, Reunión
- **Mercado**: Puestos, Fruta, Comprar, Pescado, Plaza

## Objetos (15)

- **Paraguas**: Lluvia, Abrir, Mojarse, Varillas, Cerrar
- **Móvil**: Teléfono, Llamar, Pantalla, Mensaje, Batería
- **Gafas**: Ojos, Ver, Cristales, Sol, Nariz
- **Reloj**: Hora, Muñeca, Agujas, Tiempo, Minutos
- **Mochila**: Espalda, Colegio, Llevar, Cremallera, Excursión
- **Bolígrafo**: Escribir, Tinta, Papel, Tapa, Azul
- **Tijeras**: Cortar, Papel, Filo, Dedos, Afilado
- **Vela**: Fuego, Cera, Cumpleaños, Luz, Mecha
- **Globo**: Aire, Inflar, Fiesta, Explotar, Hinchar
- **Maleta**: Viaje, Ruedas, Ropa, Aeropuerto, Equipaje
- **Guitarra**: Cuerdas, Música, Tocar, Instrumento, Flamenco
- **Cámara**: Foto, Objetivo, Flash, Imagen, Disparar
- **Bombilla**: Luz, Lámpara, Encender, Idea, Cristal
- **Martillo**: Clavo, Golpear, Herramienta, Madera, Pared
- **Calcetín**: Pie, Par, Zapato, Lavadora, Desparejado

## Profesiones (15)

- **Bombero**: Fuego, Manguera, Camión, Apagar, Incendio
- **Cocinero**: Cocina, Restaurante, Chef, Gorro, Receta
- **Profesor**: Clase, Alumnos, Colegio, Enseñar, Pizarra
- **Policía**: Ladrón, Detener, Uniforme, Sirena, Comisaría
- **Piloto**: Avión, Volar, Cabina, Aeropuerto, Azafata
- **Camarero**: Bar, Bandeja, Servir, Propina, Mesa
- **Astronauta**: Espacio, Luna, Cohete, Nave, Gravedad
- **Peluquero**: Pelo, Cortar, Tijeras, Peinado, Secador
- **Cartero**: Cartas, Correo, Buzón, Paquete, Repartir
- **Payaso**: Circo, Nariz, Reír, Gracioso, Maquillaje
- **Fotógrafo**: Cámara, Foto, Flash, Boda, Retrato
- **Detective**: Pistas, Investigar, Misterio, Lupa, Caso
- **Jardinero**: Plantas, Flores, Regar, Césped, Jardín
- **Taxista**: Coche, Taxímetro, Llevar, Carrera, Conducir
- **Mago**: Truco, Chistera, Conejo, Varita, Magia

## Fantasía (15)

- **Fantasma**: Sábana, Susto, Muerto, Casa encantada, Invisible
- **Dragón**: Fuego, Volar, Alas, Escamas, Princesa
- **Sirena**: Mar, Cola, Pez, Mujer, Cantar
- **Robot**: Máquina, Metal, Inteligencia, Futuro, Androide
- **Vampiro**: Sangre, Colmillos, Noche, Drácula, Ajo
- **Unicornio**: Cuerno, Caballo, Arcoíris, Mágico, Blanco
- **Pirata**: Barco, Parche, Loro, Tesoro, Garfio
- **Extraterrestre**: Marciano, Ovni, Espacio, Planeta, Verde
- **Superhéroe**: Capa, Poderes, Salvar, Volar, Cómic
- **Bruja**: Escoba, Sombrero, Hechizo, Caldero, Verruga
- **Tesoro**: Cofre, Oro, Mapa, Pirata, Enterrado
- **Momia**: Vendas, Egipto, Pirámide, Faraón, Tumba
- **Hada**: Varita, Alas, Magia, Polvo, Pequeña
- **Zombi**: Muerto, Cerebro, Andar, Apocalipsis, Película
- **Gigante**: Grande, Alto, Cuento, Pisotón, Habichuelas
