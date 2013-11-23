var canvas = document.createElement('canvas');
var ctx = canvas.getContext('2d');
canvas.width = 640;
canvas.height = 480;
document.body.appendChild(canvas);

// TODO: Load images at some point...
var player = {
    speed: 100,
    x: 0,
    y: 0
}

var keysPressed = {};
addEventListener("keydown", function (e) {
    keysPressed[e.keyCode] = true;
}, false);

addEventListener("keyup", function (e) {
    delete keysPressed[e.keyCode];
}, false);

function reset() {
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
}

var keyNameToCode = {
    backspace: 8,
    tab: 9,
    enter: 13,
    escape: 27,
    space: 32,
    left: 37,
    up: 38,
    right: 39,
    down: 40
};

function update(delta) {
    if (keyNameToCode.up in keysPressed) {
        player.y -= player.speed * delta;
    }

    if (keyNameToCode.down in keysPressed) {
        player.y += player.speed * delta;
    }

    if (keyNameToCode.left in keysPressed) {
        player.x -= player.speed * delta;
    }

    if (keyNameToCode.right in keysPressed) {
        player.x += player.speed * delta;
    }
}

function drawFrame() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'green';
    ctx.fillRect(player.x - 16, player.y - 16, 32, 32);
}

var mainLoop = function () {
    var now = Date.now();
    var delta = now - then;
    if (delta > 0) {
        update(delta / 1000);
    }
    drawFrame();
    then = now;
    requestAnimationFrame(mainLoop);
}

reset();
var then = Date.now();
mainLoop();
