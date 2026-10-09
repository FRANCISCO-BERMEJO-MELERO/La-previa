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
