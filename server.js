// Imports
const express = require('express');
const webRoutes = require('./routes/web');

// Session imports
let cookieParser = require('cookie-parser');
let session = require('express-session');
let flash = require('express-flash');
let passport = require('passport');

// Express app creation
const app = express();

//Socket.io
const server = require('http').Server(app);
const io = require('socket.io')(server);

// Configurations
const appConfig = require('./configs/app');

// View engine configs
const exphbs = require('express-handlebars');
const hbshelpers = require("handlebars-helpers");
const multihelpers = hbshelpers();
const extNameHbs = 'hbs';
const hbs = exphbs.create({
  extname: extNameHbs,
  helpers: multihelpers
});
app.engine(extNameHbs, hbs.engine);
app.set('view engine', extNameHbs);

// Session configurations
let sessionStore = new session.MemoryStore;
app.use(cookieParser());
app.use(session({
  cookie: { maxAge: 60000 },
  store: sessionStore,
  saveUninitialized: true,
  resave: 'true',
  secret: appConfig.secret
}));
app.use(flash());

// Configuraciones de passport
require('./configs/passport');
app.use(passport.initialize());
app.use(passport.session());

// Receive parameters from the Form requests
app.use(express.urlencoded({ extended: true }))

app.use('/', express.static(__dirname + '/public'));
// Routes
app.use('/', webRoutes);


//Clase de juego
class Game {

  constructor() {
      this.players = [];
      this.waitList = [];
      this.randomLetter = null;
      this.hasFinished = false;
  }

  //Agregar jugadores
  addPlayer(player) {
    //Si no hay dos jugaores activos, se manda el jugador a la lista de activos
    if (this.players.length < 2) {
      this.players.push(player);
      //Si tenemos dos jugadores activos se indica cual es su oponente
      if(this.players.length == 2) {
        this.players[0].opponent = this.players[1];
        this.players[1].opponent = this.players[0];
        console.log("Opponent of player " + this.players[0].id + " is " + this.players[0].opponent.id);
        console.log("Opponent of player " + this.players[1].id + " is " + this.players[1].opponent.id);
      }
    }
    //Si ya hay dos jugadores activos se envía al jugador a la lista de espera
    else
    {
      this.waitList.push(player);
    }
    
  }

  //Terminar el juego
  finishGame() {
    //Sacamos a los jugadores activos de la lista
    for(var i = 1; i >= 0; i--) {
      this.players[i].opponent = 'unmatched';
      this.players[i].points = 0;
      this.players[i].status = 'undefined';
      this.players.pop();
    }

    //Indicamos que el juego ya termino
    this.hasFinished = false;
    //Checamos la lista de espera
    this.checkWaitList();
  }

  //Checamos la lista de espera
  checkWaitList() {
    var limit = this.waitList.length;
    for(var i = 0; i < limit; i++) {
      //Si no hay dos jugadores activos, se manda al primer jugador de la lista de espera a la lista de jugadores activos
      if (this.players.length < 2) {
        this.addPlayer(this.waitList[0]);
        this.waitList.splice(0, 1);
        console.log("New active player: " + this.players.length);
        console.log("Updated waitlist: " + this.waitList.length);
      }
    }
  }

  //Ver cuantos jugadores hay en cada lista
  showPlayers() {
    console.log("Active players: " + this.players.length);
    console.log("Wait List: " + this.waitList.length);
  }

  //Eliminamos a un jugador a partir de su id de una lista
  deletePlayer(id) {
    for(var i = 0; i < this.players.length; i++) {
      if(this.players[i].id == id) {
        this.players.splice(i, 1);
        console.log("Active player deleted " + this.players.length);
        this.checkWaitList();
        return;
      }
    }

    for(var i = 0; i < this.waitList.length; i++) {
      if(this.waitList[i].id == id) {
        this.waitList.splice(i, 1);
        console.log("Wait list player deleted " + this.waitList.length);
        return;
      }
    }
  }

  //Definimos con que letra se va a jugar
  calculateLetter(){
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWYXZ';
    this.randomLetter = letters.charAt(Math.floor(Math.random() * letters.length));
    console.log(this.randomLetter);
    return this.randomLetter;
  }

  //Se evaluan las respuestas del usuario
  //Si empiezan con la letra escogido, se obtienen 10 puntos
  evalAnswers(nombre, color, fruto, numPlayer){
    var nombrePoints = 0;
    var colorPoints = 0;
    var frutoPoints = 0;
    var totalPoints;

    if (nombre.charAt(0) == this.randomLetter) {
      nombrePoints = 10;
    }

    if (color.charAt(0) == this.randomLetter) {
      colorPoints = 10;
    }

    if (fruto.charAt(0) == this.randomLetter) {
      frutoPoints = 10;
    }

    //asignamos los puntos al jugador
    totalPoints = nombrePoints + colorPoints + frutoPoints;
    this.players[numPlayer].points = totalPoints;
    console.log(this.players[numPlayer].points);
    
  }

  //Definimos que jugador fue quien gano
  findWinner(){
    //Jugador 0 tiene más puntos
    if(this.players[0].points > this.players[1].points){
      this.players[0].status = "¡Ganaste, felicidades!";
      this.players[1].status = "Perdiste, más suerte para la próxima.";
    }
    
    //Jugador 1 tiene más puntos
    if(this.players[0].points < this.players[1].points){
      this.players[1].status = "¡Ganaste, felicidades!";
      this.players[0].status = "Perdiste, más suerte para la próxima.";
    }
    
    //Ambos jugadores tienen los mismos puntos
    if (this.players[0].points == this.players[1].points) {
      this.players[0].status = "¡Empate!";
      this.players[1].status = "¡Empate!";    
    }

    //Indicamos que termino la partida
    this.hasFinished = true;

  }
}

//Clase del jugador
class Player {

  constructor(socket) {
      this.socket = socket;
      this.id = socket.id;
      this.opponent = 'unmatched';
      this.points = 0;
      this.status = 'undefined';
  }

  //Se indica el oponente del jugador
  defineOpponent(player) {
    this.opponent = player;
  }

}

//Conexión de jugadores
let game = new Game();
var cont = 0;

io.on('connection', (socket) => {

  console.log("Client connected: " + socket.id);
  player = new Player(socket);

  game.addPlayer(player);  

  socket.emit('toast', {message: `Bienvenido al juego jugador ${player.id}.`});

  //Desconexión de un jugador
  socket.on("disconnect", () => {
    console.log("Client disconnected: ", socket.id);
    socket.broadcast.emit("clientdisconnect", socket.id);
  });

  //Informar al oponente del jugador activo que se desconecto
  socket.on("disconnect", function() {
    if(game.players.length == 2){
      if(game.players[0].socket == socket && game.players[0].opponent != null) {
        game.players[0].opponent.socket.emit("opponentGone");
        console.log("El oponente de 0 se ha ido");
      }
      else if(game.players[1].socket == socket && game.players[1].opponent != null) {
        game.players[1].opponent.socket.emit("opponentGone");
        console.log("El oponente de 1 se ha ido");
      }
    }

    //Eliminamos al jugador de las listas
    game.deletePlayer(socket.id);

  });

  //Si hay dos jugadores el juego puede comenzar
  if (game.players.length == 2) {
    var letter = game.calculateLetter();
    //Le decimos a los jugadores que letra toco

    game.players[0].socket.emit("iniciarJuego", {
      letter: letter,
      number: 0
    });

    game.players[1].socket.emit("iniciarJuego", {
      letter: letter,
      number: 1
    });
  }

  //Indicar que se activo el basta
  socket.on("activarBasta", function() {
    console.log("Se activo el basta");
    //Le decimos a los clientes que activen su cuenta atrás
    game.players[0].socket.emit("startCount");
    game.players[1].socket.emit("startCount");
  });

  //Recibir respuestas del cliente
  socket.on('answers-to-server', (data) => {
    console.log('Respuestas del jugador: ' + data.jugador + ' es: ', data);
    //Se revisan las respuestas del jugador 
    game.evalAnswers(data.nombre, data.color, data.fruto, data.jugador);
    cont++;

    //Si todos los jugadores mandaron sus respuestas y fueron evaluadas
    //se busca al ganador
    if (cont == 2) {
      game.findWinner();

      //Mandarle los resultados al jugador
      if (game.hasFinished == true) {
        console.log("GAME OVER");
        for(i = 0; i < game.players.length; i++){
          game.players[i].socket.emit("showResults", {
            status: game.players[i].status,
            puntaje: game.players[i].points,
            oponente: game.players[i].opponent.points
          });
        }

        //Terminar el juego
        game.finishGame();
        cont = 0;

        //Iniciar un nuevo juego en caso de que hubiera gente esperando
        if (game.players.length == 2) {
          var letter = game.calculateLetter();
          game.players[0].socket.emit("iniciarJuego", {
            letter: letter,
            number: 0
          });

          game.players[1].socket.emit("iniciarJuego", {
            letter: letter,
            number: 1
          });
        }
      } 
    }

  });

    game.showPlayers();
})

// App init
server.listen(appConfig.expressPort, () => {
  console.log(`Server is listenning on ${appConfig.expressPort}! (http://localhost:${appConfig.expressPort})`);
});
