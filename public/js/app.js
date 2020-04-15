window.socket = null;
var numJugador;

//Conexión con el servidor
let server = window.location.protocol + "//" + window.location.host;
window.socket = io.connect(server);

//Mandar nombre del jugador
window.socket.on('toast', function(data){
    showToast(data.message);
    document.getElementById('playerName').innerHTML = data.message;
});

//Indicar con que letra se va a jugar
window.socket.on('iniciarJuego', function(data) {
    letter = data.letter;
    numJugador = data.number;
    console.log("La letra sera: " + letter);
    document.getElementById('msg').innerHTML = "La letra es: " + letter;
    document.getElementById('msg').style.color = "blue";
    document.getElementById('btn').disabled = false;
});

//Oponente desconectado
window.socket.on('opponentGone', function() {
    document.getElementById('msg').innerHTML = "El oponente se ha ido de la partida.";
    console.log("El oponente se ha desconectado");
    document.getElementById('reload').hidden = false;
});

//Iniciar contador de basta
window.socket.on('startCount', function() {
    showCount();    
});

function showToast(msg) {
    $.toast({
        text: msg,
        position: 'top-right'
    })
}

//Indicarle al servidor que alguien puso basta
function declareBasta(){
    document.getElementById('btn').disabled = true;
    window.socket.emit('activarBasta');
}

//Empezar cuenta regresiva
function showCount() {
    document.getElementById('note').hidden = false;
    var i = 10;
    var time = setInterval(function() {
        showToast(i);
        i--;
        if(i < 0){
            clearInterval(time);
            document.getElementById('note').hidden = true;
            document.getElementById('msg').innerHTML = "¡Basta!";
            sendAnswers();
        }
    }, 1000);
}

//Enviar respuestas al servidor
function sendAnswers(){
    nombre = document.getElementById('nombre').value.toUpperCase();
    color = document.getElementById('color').value.toUpperCase();
    fruto = document.getElementById('fruto').value.toUpperCase();

    window.socket.emit('answers-to-server', {
        nombre: nombre, 
        color: color,
        fruto: fruto,
        jugador: numJugador
    });
}

//Desplegar los resultados de la partida
window.socket.on('showResults', function(data) {
    status = data.status;
    puntaje = data.puntaje;
    oponente = data.oponente;
    
    document.getElementById('msg').innerHTML = status + " Tu puntaje fue de " + puntaje + " y el de tu oponente fue de " + oponente + ".";
    document.getElementById('msg').style.color = "red";
    document.getElementById('reload').hidden = false;
});

