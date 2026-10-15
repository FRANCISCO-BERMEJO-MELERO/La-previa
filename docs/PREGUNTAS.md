# Preguntas

Listas iniciales para revisar y podar. La fuente son las migraciones de datos; para cambiarlas hace falta una migración nueva (desactivar con `active = false` o añadir preguntas).

Criterios (docs/JUEGOS.md §10): español de España, tono de grupo de amigos de veintitantos, con picante suave. Nada que señale físico, salud, dinero, orientación, origen o creencias, ni que empuje a beber o a hacer algo arriesgado. Las frases evitan el género gramatical de quien sale elegido ("se duerma" y no "se quede dormido"), porque la app no lo sabe.

## ¿Quién es más probable que…? (150)

Migración: `supabase/migrations/20261009110100_probable_prompts.sql`. Cada texto completa la frase "¿Quién es más probable que…?".

### Fiesta (30)

- se duerma antes que nadie en una fiesta
- acabe cantando en un karaoke sin que nadie se lo pida
- llegue tarde a su propia fiesta de cumpleaños
- se sepa entera la coreografía de la canción del verano
- pida la misma canción tres veces seguidas
- acabe conociendo a todos los invitados de una boda
- desaparezca de una fiesta sin despedirse
- termine pinchando música aunque nadie se lo haya pedido
- proponga un juego de mesa a las tres de la mañana
- lleve el disfraz más currado en carnaval
- se pase la fiesta entera jugando con el perro de la casa
- cierre todas las fiestas a las que va
- confunda el nombre de alguien que acaba de conocer
- monte una conga en una boda
- se deje la chaqueta en casa de alguien
- mande audios de cinco minutos para contar la noche
- pase toda la fiesta charlando en la cocina
- se apunte a cualquier plan sin preguntar de qué va
- proponga ir a otro sitio cuando todos quieren irse a casa
- haga fotos de todo y no las comparta nunca
- se invente un baile y consiga que lo imite todo el mundo
- se presente sin disfraz en una fiesta de disfraces
- se quede sin batería justo cuando hay que volver a casa
- acabe poniendo la música en el coche
- se aprenda los nombres de todos los camareros
- cuente la misma anécdota en cada cena
- pierda las llaves al volver de fiesta
- diga "la última y nos vamos" cuatro veces
- acabe organizando la siguiente quedada
- salga en todas las fotos haciendo la misma pose

### Viajes (30)

- pierda un avión por estar mirando el móvil
- lleve la maleta más grande para un fin de semana
- acabe charlando con un desconocido durante todo el viaje en tren
- se pierda siguiendo el GPS
- haga una lista de todo lo que hay que visitar y no visite nada
- se deje el cargador en el hotel
- pida lo más raro de la carta en el extranjero
- pregunte el camino aunque lleve el mapa en la mano
- se duerma en el autobús y se pase de parada
- vuelva de cada viaje con un imán para la nevera
- organice un viaje entero en una tarde
- llegue al aeropuerto con cuatro horas de antelación
- se apunte a un viaje sorpresa sin saber el destino
- intente hablar el idioma local sabiendo solo tres palabras
- haga mil fotos al mismo monumento
- pierda la tarjeta de embarque en la cola
- viaje con una guía de papel
- se apunte a todas las excursiones del hotel
- se duerma en la playa toda la tarde
- convenza al grupo para subir a cualquier mirador
- compre los recuerdos para toda la familia el último día
- se equivoque de tren y acabe en otra ciudad
- se sepa la historia de cada sitio que visita
- se vaya de viaje a la otra punta del mundo sin compañía
- deshaga la maleta un mes después de volver
- acabe haciendo de guía para el resto del grupo
- se lleve la almohada de casa de viaje
- pida siempre la ventanilla
- se pierda dentro de un museo
- llegue a la estación cuando el tren ya se ha ido

### Trabajo y estudios (30)

- conteste un correo del trabajo un domingo
- estudie todo el temario la noche antes del examen
- entre en una videollamada con la cámara encendida sin saberlo
- tenga la mesa más desordenada de la oficina
- se duerma en clase
- haga los apuntes más bonitos de la clase
- organice la cena de empresa
- ponga quince alarmas para levantarse
- deje un mensaje en visto y no conteste nunca
- se apunte a un curso y no pase de la primera clase
- lleve tápers preparados para toda la semana
- hable en una reunión sin quitar el silencio
- acabe de charla con el conserje cada mañana
- cambie de carrera a mitad de curso
- entregue un trabajo un minuto antes del plazo
- se ofrezca a presentar delante de todo el mundo
- tenga veinte pestañas abiertas en el navegador
- se invente una palabra en mitad de una presentación
- acabe montando su propia empresa
- llame "mamá" a una profesora sin querer
- se aprenda el nombre de todo el mundo el primer día
- haga una hoja de cálculo para organizar las vacaciones
- lleve una libreta a todas partes
- se escape a por café en mitad de una reunión
- tenga el récord de cafés en un día
- corrija las faltas de ortografía en el grupo de clase
- se olvide de que tenía un examen
- mande un mensaje al grupo equivocado
- acabe dando clases de lo que estudió
- se lleve trabajo a la playa

### Vida cotidiana (30)

- tenga la casa llena de plantas
- vea una serie entera en un fin de semana
- se olvide de dónde ha aparcado
- vaya hablando en voz alta por la calle
- deje el móvil en la nevera sin darse cuenta
- tenga el armario ordenado por colores
- pida comida a domicilio tres veces en una semana
- se enganche a un deporte que no había visto nunca
- se sepa la letra de todas las canciones de la radio
- devuelva un saludo que no era para su persona
- se pase media hora eligiendo qué ver y luego no vea nada
- tenga un grupo de WhatsApp para cada cosa
- compruebe una noticia antes de reenviarla
- cocine para veinte cuando vienen cuatro
- lleve paraguas aunque haga sol
- se compre algo de la teletienda
- tenga más de mil fotos de su mascota
- se olvide de un cumpleaños importante
- ponga nombre a sus plantas
- monte un mueble sin mirar las instrucciones
- se ría en el momento más serio
- tenga el móvil siempre en silencio
- se apunte a clases de baile y no vaya nunca
- llame por teléfono en vez de mandar un mensaje
- haga la lista de la compra y se la deje en casa
- empiece una afición nueva cada mes
- se ponga a limpiar la casa a medianoche
- se cruce con alguien famoso y no lo reconozca
- dé de comer a todos los gatos del barrio
- se queje del frío en pleno agosto

### Absurdas (30)

- sobreviva a un apocalipsis zombi
- haga buenas migas con un extraterrestre
- gane un concurso de imitar animales
- hable con las plantas y espere respuesta
- viaje en el tiempo y lo cuente en el grupo
- tenga un doble secreto
- encuentre un tesoro en la playa
- acabe en un programa de la tele por casualidad
- salga en las noticias por algo absurdo
- adopte una llama
- se haga influencer de la noche a la mañana
- escriba un libro sobre este grupo
- triunfe con un baile viral
- acabe viajando a Marte
- monte un grupo de música con sus vecinos
- aprenda a hablar con los pájaros
- le ponga a su gato un nombre de persona
- invente algo que acabe usando todo el mundo
- gane un concurso de la tele
- tenga un robot que le haga las tareas
- se pierda en un laberinto de maíz
- se presente a un concurso de talentos con un truco de magia
- acabe en la alcaldía de su pueblo
- resuelva una sala de escape antes que nadie
- abra un restaurante temático
- sea capaz de dormir de pie
- se vaya a vivir a un barco
- se aprenda un idioma inventado
- protagonice una película sobre su vida
- salve el mundo sin que nadie se entere

## ¿Quién lo dijo? (80)

Migración: `supabase/migrations/20261009130100_quien_lo_dijo_prompts.sql`. Preguntas abiertas que se contestan en una línea (hasta 80 caracteres).

### Gustos (16)

- ¿Qué canción pondrías para empezar una fiesta?
- ¿Cuál es tu comida favorita para un domingo?
- ¿Qué serie verías otra vez desde el principio?
- ¿Qué película has visto más veces?
- ¿Cuál es tu plan perfecto para un sábado?
- ¿Qué emoji usas más?
- ¿Qué olor te recuerda a tu infancia?
- ¿Cuál es tu palabra favorita?
- ¿Qué canción te sabes entera sin querer?
- ¿Qué juego de mesa nunca te cansa?
- ¿Cuál es tu sitio favorito de tu ciudad?
- ¿Qué estación del año prefieres y por qué?
- ¿Qué desayuno te alegra el día?
- ¿Qué te pides siempre en una cafetería?
- ¿Qué asignatura del cole te gustaba más?
- ¿Qué personaje de dibujos animados te caía mejor?

### Imagina (16)

- ¿Qué harías con un día entero sin móvil?
- ¿A qué época viajarías si pudieras?
- ¿Qué superpoder elegirías?
- ¿Qué animal te gustaría ser durante un día?
- ¿Con qué personaje de ficción te irías de vacaciones?
- ¿Qué inventarías para no volver a hacer una tarea de casa?
- ¿Qué te llevarías a una isla desierta?
- ¿A qué te dedicarías en otra vida?
- ¿Qué nombre le pondrías a un barco?
- ¿Qué harías si nadie pudiera verte durante una tarde?
- ¿Qué título tendría la película de tu vida?
- ¿Qué plato cocinarías para impresionar a alguien?
- ¿A qué famoso invitarías a cenar?
- ¿Qué idioma te gustaría hablar sin estudiarlo?
- ¿Qué norma pondrías si mandaras en el mundo por un día?
- ¿Qué harías mañana si te dieran el día libre por sorpresa?

### Confesiones suaves (16)

- ¿Cuál es tu manía más rara?
- ¿Qué es lo más raro que has buscado en internet?
- ¿Qué canción te da vergüenza que te guste?
- ¿Cuál es la peor excusa que has puesto?
- ¿Qué es lo último que te ha hecho reír a carcajadas?
- ¿Qué palabra decías mal cuando eras peque?
- ¿Qué mentira piadosa dices a menudo?
- ¿Qué tarea de casa evitas siempre?
- ¿Qué es lo más inútil que sabes hacer?
- ¿Qué travesura hiciste de peque que nadie descubrió?
- ¿Cuál es tu placer culpable en la tele?
- ¿Qué app abres nada más despertarte?
- ¿Qué es lo más raro que has comido?
- ¿Qué frase dices demasiado?
- ¿Cuál ha sido el peor regalo que te han hecho?
- ¿Qué haces cuando nadie te ve en casa?

### Recuerdos (16)

- ¿Cuál es tu mejor recuerdo de un verano?
- ¿Cuál fue tu primer concierto?
- ¿Cuál es el mejor disfraz que has llevado?
- ¿Cuál fue tu primer móvil?
- ¿Qué es lo más bonito que te han dicho?
- ¿Cuál es el mejor viaje que has hecho?
- ¿Qué juguete no soltabas de peque?
- ¿Cuál ha sido tu mejor cumpleaños?
- ¿Qué es lo más valiente que has hecho?
- ¿Cuál es la anécdota que más cuentas?
- ¿Qué profe te marcó en el cole?
- ¿Cuál fue tu primer trabajo?
- ¿Qué es lo más espontáneo que has hecho?
- ¿Qué canción te recuerda a tus amigos?
- ¿Cuál es el mejor consejo que te han dado?
- ¿Qué querías ser de mayor cuando eras peque?

### Este grupo (16)

- ¿Qué plan propondrías para la próxima quedada?
- ¿Qué canción sería el himno de este grupo?
- ¿Qué nombre le pondrías a este grupo?
- ¿Qué recuerdo de este grupo no olvidarás nunca?
- ¿Qué tradición inventarías para este grupo?
- ¿Qué viaje haríais todos juntos?
- ¿Qué serie de televisión sería este grupo?
- ¿Qué plato llevarías a una cena del grupo?
- ¿A qué jugaríais en una noche sin luz?
- ¿Qué foto del grupo enmarcarías?
- ¿Qué le regalarías al grupo entero?
- ¿Qué norma pondrías en las quedadas?
- ¿Qué superpoder tendría este grupo?
- ¿Qué película veríais todos juntos?
- ¿Qué palabra describe mejor a este grupo?
- ¿Qué canción no puede faltar en una fiesta del grupo?

## ¿Qué prefieres? (120)

Migración: `supabase/migrations/20261011100100_que_prefieres_prompts.sql`. Cada línea es un dilema: la opción A, un punto medio y la opción B. Se pintan como dos botones bajo "¿Qué prefieres?", así que ninguna pasa de 50 caracteres.

### Fiesta (20)

- Poner la música toda la noche · Elegir dónde se cena
- Bailar en el centro de la pista · Hablar toda la noche en un rincón
- Una fiesta de disfraces · Una fiesta en pijama
- Un concierto en primera fila · Un concierto al fondo con sitio para bailar
- Organizar la fiesta · Llegar cuando ya está montada
- Karaoke con público · Karaoke solo con tu grupo
- Fiesta en la playa · Fiesta en una azotea
- Que suene siempre tu canción favorita · No volver a oír la canción que más odias
- Una fiesta sorpresa para ti · Preparar una fiesta sorpresa a otra persona
- Cenar en casa con amigos · Salir a cenar fuera
- Una boda de día en el campo · Una boda de noche en la ciudad
- Ser la última persona en irse · Ser la primera persona en llegar
- Bailar sin saberte la coreografía · Saberte la coreografía y no poder bailarla
- Un festival de tres días · Tres conciertos en tres noches
- Juegos de mesa toda la noche · Discoteca toda la noche
- Nochevieja en casa · Nochevieja en la plaza del pueblo
- Hacer tú todas las fotos de la fiesta · Salir en todas las fotos de la fiesta
- Ir con la misma ropa que otra persona · Ir con disfraz a una fiesta sin disfraces
- Que te canten el cumpleaños en un restaurante · Que nadie se acuerde de tu cumpleaños
- Elegir la película de la noche · Elegir la pizza de la noche

### Viajes (20)

- Vacaciones en la playa · Vacaciones en la montaña
- Un viaje sin ningún plan · Un viaje con todo organizado
- Viajar siempre en tren · Viajar siempre en avión
- Dormir en una tienda de campaña · Dormir en un hotel sin ventanas
- Recorrer Europa en furgoneta · Pasar un mes en una isla
- Viajar con amigos · Viajar sin compañía
- Diez ciudades en diez días · Diez días en una sola ciudad
- Perder la maleta a la ida · Perder el móvil a la vuelta
- Ir siempre en ventanilla · Ir siempre en pasillo
- Un crucero · Una ruta en bici
- Ver una aurora boreal · Ver un eclipse total
- Un fin de semana en París · Un fin de semana en Roma
- Vacaciones solo en invierno · Vacaciones solo en verano
- Probar todo lo típico del sitio · Comer solo lo que ya conoces
- Hacer el Camino de Santiago · Hacer una ruta en coche por la costa
- Madrugar para ver el amanecer · Trasnochar para ver las estrellas
- Perderte en una ciudad sin mapa · Seguir una guía minuto a minuto
- Ir detrás todo el viaje · Conducir todo el viaje
- Visitar Japón · Visitar México
- Hacer fotos de todo · No sacar el móvil en todo el viaje

### Comida (20)

- Tortilla con cebolla · Tortilla sin cebolla
- Pizza con piña · Pizza sin queso
- Comer solo dulce · Comer solo salado
- Desayunar churros · Desayunar tostadas
- Paella todos los domingos · Cocido todos los domingos
- Renunciar al chocolate · Renunciar al queso
- Cocinar para todos · Fregar después
- Comer siempre frío · Comer siempre picante
- Croquetas de jamón · Croquetas de pollo
- Helado en invierno · Sopa en verano
- No volver a tomar café · No volver a comer pan
- Comer siempre con palillos · Comer siempre con las manos
- Probar insectos fritos · Probar una fruta que huele fatal
- Un bocadillo perfecto · Un menú de diez platos normalito
- Elegir siempre el postre · Elegir siempre el primer plato
- Ketchup en todo · Mayonesa en todo
- Brunch el domingo · Cena tardía el sábado
- Una hamburguesa · Un kebab
- Comer siempre tu plato favorito · Probar un plato nuevo cada día
- Quedarte sin aceitunas para siempre · Quedarte sin patatas fritas para siempre

### Vida cotidiana (20)

- Madrugar siempre · Trasnochar siempre
- Vivir sin música · Vivir sin series
- Una semana sin móvil · Una semana sin agua caliente
- Vivir en el centro · Vivir en el campo
- Tener un perro · Tener un gato
- Ducharte por la mañana · Ducharte por la noche
- Saber el final de todas las películas · No ver nunca el final de ninguna
- Trabajar desde casa · Trabajar en una oficina con amigos
- Solo mensajes de voz · Solo mensajes escritos
- Dormir con calor · Dormir con frío
- Un vecino que toca la batería · Un vecino que hace obras sin parar
- Lavar los platos · Tender la ropa
- La batería siempre al cien · El wifi siempre rapidísimo
- Ver una serie entera en un día · Ver un capítulo a la semana
- Llegar siempre diez minutos antes · Llegar siempre cinco minutos tarde
- Escuchar una sola canción toda la vida · Escuchar solo canciones que no conoces
- Que lean tus mensajes en voz alta · Que vean tu historial de búsqueda
- Domingo de sofá · Domingo de excursión
- Un día sin móvil · Un día sin hablar
- Hacer la cama todos los días · No hacerla nunca

### Superpoderes (20)

- Volar · Ser invisible
- Leer mentes · Ver el futuro
- Teletransportarte · Detener el tiempo
- Hablar con los animales · Hablar todos los idiomas
- No necesitar dormir · No necesitar comer
- Respirar bajo el agua · Saltar diez metros
- Recordarlo todo · Olvidar lo que quieras
- Viajar al pasado · Viajar al futuro
- Saber siempre dónde están tus llaves · Encontrar siempre aparcamiento
- Controlar el clima · Controlar el fuego
- Atravesar paredes · Mover cosas con la mente
- Cantar como nadie · Bailar como nadie
- Pausar una conversación para pensar · Rebobinar diez segundos
- Saber cocinar cualquier plato · Saber tocar cualquier instrumento
- Ver a través de las paredes · Oír lo que se dice en otra habitación
- Un clon que vaya a clase o al trabajo · Dormir dos horas y descansar como ocho
- Hacer reír a cualquiera · Convencer a cualquiera
- Correr como un coche · Nadar como un delfín
- Que no te piquen nunca los mosquitos · Que no te entre nunca sueño en el cine
- Acertar siempre con los regalos · Acertar siempre con la película

### Absurdos (20)

- Ser invisible solo cuando nadie mira · Volar solo a un palmo del suelo
- Que suene una trompeta al estornudar · Que suene un aplauso al reírte
- Hablar siempre rimando · Hablar siempre cantando
- Una banda sonora para tu vida · Un narrador que comenta lo que haces
- Un gato que habla solo para quejarse · Un perro que habla solo para decir verdades
- Llevar capa siempre · Llevar casco siempre
- Que llueva queso una vez al año · Que nieve azúcar una vez al año
- Vivir en una casa de chocolate · Vivir en un barco pirata
- Andar siempre hacia atrás · Hablar siempre al revés
- Que tu sombra tenga vida propia · Que tu reflejo te guiñe el ojo
- Un dinosaurio del tamaño de un gato · Un gato del tamaño de un dinosaurio
- Contestar siempre con una pregunta · Contestar siempre con un refrán
- Que todas las puertas chirríen · Que todas las sillas cojeen
- Bailar cada vez que suena un móvil · Aplaudir cada vez que oyes tu nombre
- Comer sopa con tenedor · Comer helado con cuchillo
- Ir a todas partes en patines · Ir a todas partes a caballo
- Un móvil que solo escribe emojis · Un móvil que solo escribe en mayúsculas
- Vivir en una película de miedo · Vivir en un musical
- Una pelea de almohadas cada lunes · Una guerra de agua cada viernes
- Una canción pegada en la cabeza un mes · Olvidar cada canción al terminar de oírla
