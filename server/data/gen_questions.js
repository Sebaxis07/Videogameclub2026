const fs = require('fs');
const q = [];
let id = 21;
const add = (cat, dif, preg, ops, cor) => {
  q.push({ id: id++, tipo_pregunta: 'alternativas', categoria: cat, tipo_dificultad: dif, pregunta: preg, opciones: ops, respuesta_correcta: cor });
};

// League of Legends
add('League of Legends','Casual','Cuantos jugadores hay en cada equipo en una partida estandar de LoL?',['3','4','5','6'],2);
add('League of Legends','Casual','Como se llama la moneda principal de League of Legends?',['Puntos Azules','Esencias Azules','Puntos de Influencia','Riot Points'],1);
add('League of Legends','Casual','Cual es el objetivo principal que otorga mas ventaja al matarlo en LoL?',['Baron Nashor','Dragon','Heraldo del Abismo','Centinela'],0);
add('League of Legends','Competitiva','Que campeon tiene la habilidad llamada Remembrance y llora a sus aliados muertos?',['Thresh','Senna','Kayn','Yorick'],1);
add('League of Legends','Casual','En que carril suele ir el ADC?',['Top','Jungla','Mid','Bot'],3);
add('League of Legends','Competitiva','Cuantos dragones elementales existen en el juego base sin contar Elder?',['3','4','5','6'],1);
add('League of Legends','Casual','Que dice el Teemo cuando se queda quieto?',['Capitan Teemo en posicion!','Teemo al ataque!','Un paso mas!','Cuidado!'],0);
add('League of Legends','Competitiva','Que campeon fue el primero en ser lanzado en LoL?',['Ryze','Ashe','Annie','Sivir'],0);
add('League of Legends','Casual','Como se llama la tienda donde compras objetos en LoL?',['El Nexo','La Tienda Magica','La Tiendecilla','La Taberna'],2);
add('League of Legends','Competitiva','Cuantas torres hay en total en Summoner Rift sin contar inhibidores?',['9','11','12','14'],2);

// Mortal Kombat XL
add('Mortal Kombat XL','Casual','Cual es el movimiento mas iconico al final de una pelea en Mortal Kombat?',['Ultra Combo','X-Ray','Fatality','Brutality'],2);
add('Mortal Kombat XL','Casual','Quien es el dios del trueno en Mortal Kombat?',['Shao Kahn','Raiden','Liu Kang','Shinnok'],1);
add('Mortal Kombat XL','Competitiva','Cual es el nombre de la hija de Johnny Cage y Sonya Blade?',['Kitana','Cassie Cage','Jade','Mileena'],1);
add('Mortal Kombat XL','Casual','Que personaje tiene un sombrero de aro con pinchos como arma principal?',['Shang Tsung','Kung Lao','Sub-Zero','Scorpion'],1);
add('Mortal Kombat XL','Casual','Que frase grita Scorpion al lanzar su kunai?',['Come here!','Get over here!','You will die!','Face me!'],1);
add('Mortal Kombat XL','Competitiva','Que DLC de Mortal Kombat XL incluye al Alien de la pelicula?',['Kombat Pack 1','Kombat Pack 2','XL Pack','Horror Pack'],1);
add('Mortal Kombat XL','Casual','En que reino vive Shao Kahn?',['Outworld','Netherrealm','Edenia','Earthrealm'],0);
add('Mortal Kombat XL','Competitiva','Cuantas rondas se deben ganar para vencer en una pelea estandar?',['1','2','3','4'],1);
add('Mortal Kombat XL','Casual','Que personaje tiene el poder de congelar a sus oponentes?',['Scorpion','Raiden','Sub-Zero','Kitana'],2);
add('Mortal Kombat XL','Competitiva','Como se llama el modo historia principal de MKX?',['Living Towers','The Krypt','Story Mode','Faction War'],2);

// Ultrakill
add('Ultrakill','Casual','Que tipo de entidad es el protagonista de ULTRAKILL?',['Un angel caido','Una maquina robotica','Un demonio','Un humano cyborg'],1);
add('Ultrakill','Casual','Cual es el recurso principal que usa V1 para recargarse en ULTRAKILL?',['Energia Solar','Aceite de motor','Sangre','Baterias'],2);
add('Ultrakill','Casual','Donde esta ambientado ULTRAKILL?',['El espacio','El Infierno','Una ciudad futurista','El Purgatorio'],1);
add('Ultrakill','Competitiva','Cual es la calificacion maxima que puedes obtener en un nivel de ULTRAKILL?',['S','SS','SSS','P'],3);
add('Ultrakill','Casual','Quien desarrollo ULTRAKILL?',['Devolver Digital','Arsi Patala (Hakita)','Double Fine','id Software'],1);
add('Ultrakill','Competitiva','Como se llama el jefe final del Acto 1 de ULTRAKILL?',['Gabriel','V2','Minos Prime','Leviathan'],0);
add('Ultrakill','Casual','Que estilo de juego define mejor a ULTRAKILL?',['Battle Royale','FPS de accion frenetica','MMORPG','Roguelike'],1);
add('Ultrakill','Competitiva','Cual de estas armas NO existe en ULTRAKILL?',['Revolver','Escopeta','Fusil de Francotirador','Lanzacohetes'],2);
add('Ultrakill','Casual','Cuantas capas del infierno tiene el juego completo planeadas?',['7','9','10','12'],1);
add('Ultrakill','Competitiva','Que mecanismo permite a V1 recuperar salud activamente durante el combate?',['Recoger kits medicos','Estar cerca de enemigos','Golpear enemigos con sangre reciente','Permanecer quieto'],2);

// Mobile Legends
add('Mobile Legends','Casual','Cuantos jugadores componen cada equipo en Mobile Legends Bang Bang?',['3','4','5','6'],2);
add('Mobile Legends','Casual','Cual es el monstruo principal del mapa en Mobile Legends equivalente al Baron Nashor?',['Lord','Turtle','Crab','Savage'],0);
add('Mobile Legends','Casual','Como se llama la moneda premium de Mobile Legends?',['Tickets','BP Battle Points','Diamonds','Tokens'],2);
add('Mobile Legends','Competitiva','Que heroe de Mobile Legends tiene la habilidad pasiva que le permite acumular poder con cada muertes de enemigos?',['Layla','Aldous','Miya','Moskov'],1);
add('Mobile Legends','Casual','Cuantos carriles tiene el mapa estandar de Mobile Legends?',['2','3','4','5'],1);
add('Mobile Legends','Competitiva','Que rol en Mobile Legends se encarga principalmente de absorber dano?',['Mage','Marksman','Tank','Support'],2);
add('Mobile Legends','Casual','Cual es el nombre del torneo oficial mas importante de Mobile Legends?',['M-Series World Championship','Bang Bang Cup','MLBB Finals','Global Clash'],0);
add('Mobile Legends','Casual','Que heroe es famoso por ser Assassin con alto dano y muchos dashes desde el inicio del juego?',['Tigreal','Gusion','Eudora','Nana'],1);
add('Mobile Legends','Competitiva','Cuantas habilidades activas tiene un heroe estandar en Mobile Legends?',['2','3','4','5'],1);
add('Mobile Legends','Casual','Que continente o region desarrollo Mobile Legends Bang Bang?',['Japon','Corea del Sur','China Moonton','Estados Unidos'],2);

// Overwatch
add('Overwatch','Casual','Que heroe de Overwatch dice la frase The world could always use more heroes?',['McCree','Soldier 76','Tracer','Reaper'],2);
add('Overwatch','Casual','Cuantos jugadores hay en cada equipo en una partida estandar de Overwatch?',['4','5','6','8'],2);
add('Overwatch','Casual','Que rol de Overwatch se enfoca en curar y proteger a los companeros?',['Damage','Tank','Support','Flex'],2);
add('Overwatch','Competitiva','Cual es el nombre real de Reaper en Overwatch?',['Jack Morrison','Gabriel Reyes','Jesse McCree','Genji Shimada'],1);
add('Overwatch','Casual','Que pais defiende Pharah en la historia de Overwatch?',['Arabia Saudita','Israel','Egipto','Turquia'],2);
add('Overwatch','Competitiva','Cuantas habilidades Ultimate puede activar un jugador por partida?',['1','Ilimitadas','Solo 2','3 maximo'],1);
add('Overwatch','Casual','Cual es el mapa de Overwatch basado en Japon?',['Hanamura','Dorado','Numbani','Hollywood'],0);
add('Overwatch','Casual','Que heroe puede crear paredes de hielo y usa un escudo de energia?',['Mei','Moira','Symmetra','Brigitte'],2);
add('Overwatch','Competitiva','Quien desarrollo Overwatch?',['Riot Games','Valve','Blizzard Entertainment','Bungie'],2);
add('Overwatch','Casual','Como se llama la organizacion villana principal en la historia de Overwatch?',['Blackwatch','Talon','Null Sector','LumeriCo'],1);

// Minecraft
add('Minecraft','Casual','Cual es el primer objeto recomendado a craftear en Minecraft para sobrevivir?',['Una espada','Una cama','Una mesa de trabajo','Un horno'],2);
add('Minecraft','Casual','Que material necesitas para crear herramientas del nivel mas alto en Minecraft estandar?',['Hierro','Oro','Diamante','Netherita'],2);
add('Minecraft','Casual','Como se llama el jefe final de Minecraft que vive en The End?',['El Wither','El Guardian','Ender Dragon','El Golem'],2);
add('Minecraft','Competitiva','Que arbol en Minecraft crece sin necesitar tierra normal?',['Abedul','Acacia','Hongo gigante','Roble'],2);
add('Minecraft','Casual','Que sucede si duermes en una cama en el Nether?',['Descansas normalmente','Te teletransporta al Overworld','La cama explota','Invocas un fantasma'],2);
add('Minecraft','Casual','Cual de estos mobs NO aparece de noche en Minecraft?',['Zombie','Esqueleto','Creeper','Ghast'],3);
add('Minecraft','Competitiva','Cuantos bloques de obsidiana se necesitan para construir un portal al Nether?',['8','10','12','14'],1);
add('Minecraft','Casual','Como se llama la moneda de Minecraft usada para comerciar con aldeanos?',['Oro','Esmeraldas','Diamantes','Rubies'],1);
add('Minecraft','Competitiva','Que animal de Minecraft NO deja drop util al morir?',['Vaca','Cerdo','Murcielago','Oveja'],2);
add('Minecraft','Casual','Que bloque emite mas luz en Minecraft?',['Antorcha','Glowstone','Sea Lantern','Lava'],1);

// Valorant
add('Valorant','Casual','Cuantos jugadores componen cada equipo en Valorant?',['4','5','6','8'],1);
add('Valorant','Casual','Como se llama el dispositivo que deben plantar los atacantes en Valorant?',['Bomba','Spike','Orbe','Detonador'],1);
add('Valorant','Casual','Que compania desarrollo Valorant?',['Blizzard','Valve','Riot Games','Epic Games'],2);
add('Valorant','Competitiva','Que agente de Valorant puede crear paredes de hielo y tiene habilidades de curar?',['Sage','Viper','Brimstone','Omen'],0);
add('Valorant','Casual','Cuantas rondas son necesarias para ganar un mapa en Valorant modo estandar?',['10','13','16','20'],1);
add('Valorant','Casual','Que tipo de elemento hace unico a los agentes en Valorant ademas de armas?',['Solo armas','Habilidades unicas','Solo granadas','Poderes magicos'],1);
add('Valorant','Competitiva','Cuantos creditos tienen los jugadores en la primera ronda pistol round?',['0','500','800','1000'],2);
add('Valorant','Casual','Como se llama el agente de Valorant con poderes de teletransporte y sombras?',['Reyna','Omen','Yoru','Neon'],1);
add('Valorant','Competitiva','Cual es el arma tipo rifle de largo alcance mas cara del juego?',['Vandal','Phantom','Operator','Odin'],2);
add('Valorant','Casual','Que mapa de Valorant esta ambientado en Venecia Italia?',['Bind','Haven','Ascent','Split'],2);

// Pokemon
add('Pokemon','Casual','Cual es el numero de Pikachu en la Pokedex Nacional?',['023','025','035','027'],1);
add('Pokemon','Casual','Cual es el Pokemon legendario de 1ra generacion que puede clonar a otros Pokemon?',['Mew','Mewtwo','Ditto','Arceus'],1);
add('Pokemon','Casual','Que tipos de Pokemon son efectivos contra el tipo Agua?',['Fuego','Planta y Electrico','Roca','Tierra'],1);
add('Pokemon','Competitiva','Como se llama la evolucion final de Charmander?',['Charizard','Charmeleon','Charcoal','Blaziken'],0);
add('Pokemon','Casual','Cuantas generaciones de Pokemon existian hasta 2023?',['7','8','9','10'],2);
add('Pokemon','Casual','Que objeto se necesita para evolucionar a Eevee en Flareon?',['Piedra Agua','Piedra Fuego','Piedra Rayo','Piedra Hoja'],1);
add('Pokemon','Competitiva','Cual es el movimiento de tipo Normal con buena potencia y 100 de precision?',['Hiperrayo','Doble Filo','Triataque','Rapidez'],1);
add('Pokemon','Casual','Cual es el Pokemon de tipo Normal que puede transformarse en cualquier otro Pokemon?',['Castform','Rotom','Ditto','Smeargle'],2);
add('Pokemon','Casual','Que organizacion malvada aparece en la primera generacion de Pokemon?',['Team Aqua','Team Magma','Team Rocket','Team Plasma'],2);
add('Pokemon','Competitiva','Que Pokemon tiene el stat de Velocidad mas alto del juego hasta la Gen 9?',['Deoxys','Ninjask','Regieleki','Electrode'],2);

// Team Fortress 2
add('Team Fortress 2','Casual','Cuantas clases tiene Team Fortress 2?',['7','8','9','10'],2);
add('Team Fortress 2','Casual','Que clase de TF2 tiene un lanzacohetes como arma principal?',['Demoman','Soldier','Heavy','Pyro'],1);
add('Team Fortress 2','Casual','Cuales son los dos equipos que se enfrentan en TF2?',['RED vs BLUE','Allied vs Axis','Mercs vs Robots','Alpha vs Beta'],0);
add('Team Fortress 2','Competitiva','Que clase en TF2 puede volverse invisible usando un reloj?',['Spy','Scout','Medic','Engineer'],0);
add('Team Fortress 2','Casual','Que clase de TF2 usa una ballesta y puede curar a distancia?',['Heavy','Medic','Sniper','Engineer'],1);
add('Team Fortress 2','Casual','Que compania desarrollo Team Fortress 2?',['Blizzard','Valve','EA','Riot'],1);
add('Team Fortress 2','Competitiva','Como se llama el arma iconica del Scout en TF2?',['Pistola','Scatter Gun','Pistola de Luz','Escopeta de Mano'],1);
add('Team Fortress 2','Casual','En que modo de juego deben empujar un carro hasta la meta en TF2?',['Capture the Flag','Payload','King of the Hill','Attack Defend'],1);
add('Team Fortress 2','Competitiva','Que clase tiene la mayor cantidad de puntos de vida en TF2?',['Soldier','Demoman','Heavy','Engineer'],2);
add('Team Fortress 2','Casual','Como se llama el robot jefe que aparece en el modo Mann vs Machine?',['Giant Soldier','Tank','Giant Heavy','Bomb Bot'],1);

// Terraria
add('Terraria','Casual','Como se llama el jefe final de la version estandar de Terraria?',['Eye of Cthulhu','Moon Lord','Wall of Flesh','Skeletron'],1);
add('Terraria','Casual','Que NPC aparece primero al iniciar una partida de Terraria?',['Goblin','Guia Guide','Comerciante','Enfermera'],1);
add('Terraria','Casual','Cuantos modos de dificultad tiene Terraria para el personaje?',['2','3','4','5'],1);
add('Terraria','Competitiva','Que bioma es la alternativa a la Corruption en Terraria?',['Hallow','Crimson','Jungle','Desert'],1);
add('Terraria','Casual','Cual es el mineral mas poderoso de Terraria en la capa del inframundo?',['Obsidiana','Hellstone','Meteorite','Lihzahrd Brick'],1);
add('Terraria','Casual','Que evento nocturno puede invocar de forma natural al Eye of Cthulhu?',['Lluvia','Aparece solo al azar','Blood Moon','Solar Eclipse'],1);
add('Terraria','Competitiva','Cuantos jefes mecanicos hay en Terraria?',['2','3','4','5'],1);
add('Terraria','Casual','Que debes hacer para activar el modo Hardmode en Terraria?',['Matar al Eye of Cthulhu','Matar al Wall of Flesh','Encontrar una llave','Construir un altar'],1);
add('Terraria','Competitiva','Como se llama la actualizacion mas grande de contenido de Terraria lanzada gratis?',['Journey Mode Update','Journeys End 1.4','Hardmode Update','Blood and Iron'],1);
add('Terraria','Casual','Que tipo de juego es Terraria?',['FPS','MOBA','Sandbox 2D de aventura','Battle Royale'],2);

// Marvel Rivals
add('Marvel Rivals','Casual','Que tipo de juego es Marvel Rivals?',['Battle Royale','Hero Shooter 6v6','MOBA','Juego de peleas'],1);
add('Marvel Rivals','Casual','Que compania desarrollo Marvel Rivals?',['Riot Games','NetEase Games','Blizzard','Marvel Studios'],1);
add('Marvel Rivals','Casual','Cuantos jugadores hay en cada equipo en Marvel Rivals?',['4','5','6','8'],2);
add('Marvel Rivals','Competitiva','Que heroe de Marvel Rivals tiene la habilidad de convertirse en Hulk?',['Thor','Iron Man','Bruce Banner','Spider-Man'],2);
add('Marvel Rivals','Casual','Cuales son los tres roles de heroes en Marvel Rivals?',['Attacker Defender Healer','Vanguard Duelist Strategist','Tank DPS Support','Hero Villain Neutral'],1);
add('Marvel Rivals','Casual','En que ano fue lanzado Marvel Rivals?',['2022','2023','2024','2025'],2);
add('Marvel Rivals','Competitiva','Que personaje de Marvel Rivals usa escudos de energia y rayos repulsores?',['Thor','Iron Man','Captain America','Black Panther'],1);
add('Marvel Rivals','Casual','Que supervillano de los X-Men es jugable en Marvel Rivals?',['Thanos','Magneto','Doctor Doom','Loki'],1);
add('Marvel Rivals','Competitiva','Cual es el modo de juego principal competitivo en Marvel Rivals?',['Deathmatch','Domination y Convoy','Capture the Flag','Battle Royale'],1);
add('Marvel Rivals','Casual','Que heroe de Marvel Rivals puede lanzar telaranas para desplazarse?',['Daredevil','Venom','Spider-Man','Black Cat'],2);

// Dragon Ball FighterZ
add('Dragon Ball FighterZ','Casual','Cuantos personajes componen un equipo en Dragon Ball FighterZ?',['2','3','4','5'],1);
add('Dragon Ball FighterZ','Casual','Que compania desarrollo Dragon Ball FighterZ?',['Capcom','Arc System Works','Bandai Namco','SNK'],1);
add('Dragon Ball FighterZ','Casual','Que personaje es el antagonista principal de la historia de Dragon Ball FighterZ?',['Freezer','Cell','Android 21','Majin Buu'],2);
add('Dragon Ball FighterZ','Competitiva','Como se llama la mecanica de llamar a companeros para atacar mientras juegas?',['Tag Cancel','Assist','Sparking','Dragon Rush'],1);
add('Dragon Ball FighterZ','Casual','Cuantas Dragon Balls debes coleccionar durante la partida para invocar ayuda especial?',['5','6','7','8'],2);
add('Dragon Ball FighterZ','Casual','Que tecnica iconica usa Goku que tambien esta en el juego?',['Galick Gun','Kamehameha','Big Bang Attack','Final Flash'],1);
add('Dragon Ball FighterZ','Competitiva','Cual de estas versiones de Vegeta es jugable en FighterZ?',['Vegeta SSJ4','Vegeta SSJ Blue','Vegeta Ultra Ego','Vegeta GT'],1);
add('Dragon Ball FighterZ','Casual','Que tipo de juego es Dragon Ball FighterZ?',['RPG de turno','Juego de peleas 2D','Battle Royale','Shooter'],1);
add('Dragon Ball FighterZ','Competitiva','Que personaje tiene el movimiento Photon Flash en Dragon Ball FighterZ?',['Gohan','Freezer','Android 16','Beerus'],3);
add('Dragon Ball FighterZ','Casual','En que ano fue lanzado Dragon Ball FighterZ?',['2016','2017','2018','2019'],2);

const existing = JSON.parse(fs.readFileSync('trivia_questions.json', 'utf-8'));
const combined = [...existing, ...q];
fs.writeFileSync('trivia_questions.json', JSON.stringify(combined, null, 2), 'utf-8');
console.log('Done. Total questions: ' + combined.length);
