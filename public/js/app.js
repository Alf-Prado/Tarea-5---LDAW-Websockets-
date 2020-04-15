window.socket = null;
var numJugador;

//Conexión con el servidor
let server = window.location.protocol + "//" + window.location.host;
window.socket = io.connect(server);

window.socket.on('toast', function(data){
    showToast(data.message);
});

//Indicar con que letra se va a jugar
window.socket.on('iniciarJuego', function(data) {
    letter = data.letter;
    numJugador = data.number;
    console.log("La letra sera: " + letter);
    document.getElementById('msg').innerHTML = letter;
});

//Oponente desconectado
window.socket.on('opponentGone', function() {
    document.getElementById('msg').innerHTML = "El oponente se ha ido de la partida.";
    console.log("El oponente se ha desconectado");
});

//Iniciar contador de basta
window.socket.on('startCount', function() {
    showCount();    
});


function messageToServer(msg) {
    window.socket.emit('message-to-server', {message: msg});
}

function showToast(msg) {
    console.log("El mensaje es: " + msg);
    $.toast({
        text: msg,
        position: 'top-right'
    })
}

function declareBasta(){
    window.socket.emit('activarBasta');
}

function showCount() {
    var i = 2;
    var time = setInterval(function() {
        showToast(i);
        i--;
        if(i < 0){
            clearInterval(time);
            document.getElementById('msg').innerHTML = "¡Basta!";
            sendAnswers();
        }
    }, 1000);
}

function sendAnswers(){
    nombre = document.getElementById('nombre').value;
    color = document.getElementById('color').value;
    fruto = document.getElementById('fruto').value;

    window.socket.emit('answers-to-server', {
        nombre: nombre, 
        color: color,
        fruto: fruto,
        jugador: numJugador
    });
}
window.socket.on('showResults', function(data) {
    status = data.status;
    puntaje = data.puntaje;
    oponente = data.oponente;
    
    console.log(status + " Tu puntaje fue de " + puntaje + " y el de tu oponente fue de " + oponente);
});

