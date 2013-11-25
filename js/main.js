// Vectors and two dimensional transformations
// TODO: Needed?
var Transform2D = {
    createIdentity: function () {
        return [[1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]];
    },

    copy: function (transform) {
        var result = [[], [], []];
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                result[i][j] = transform[i][j];
            }
        }
        return result;
    },

    multiply: function (a, b, result) {
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                var value = 0;
                for (var x = 0; x < 3; x++) {
                    value += a[x][j] * b[i][x];
                }
                result[i][j] = value;
            }
        }
        return result;
    },

    translate: function (transform, x, y, result) {
        // TODO: It'd be better to not create new matrices each time...
        var a = this.copy(transform);
        var b = [[1, 0, x],
                 [0, 1, y],
                 [0, 0, 1]];
        return this.multiply(a, b, transform);
    },

    scale: function (transform, sx, sy, result) {
        var a = this.copy(transform);
        var b = [[sx, 0, 0],
                 [0, sy, 0],
                 [0, 0, 1]];
        return this.multiply(a, b, result);
    },

    // TODO: These could be optimized and combined so that there aren't so many unnecessary objects getting created
    transformHomogeneous: function (a, vh) {
        var avh = [];
        for (var i = 0; i < 3; i++) {
            var value = 0;
            for (var x = 0; x < 3; x++) {
                value += a[i][x] * vh[x];
            }
            avh[i] = value;
        }
        return avh;
    },

    transform: function (a, v) {
        var avh = this.transformHomogeneous(a, [v[0], v[1], 1]);
        return [avh[0] / avh[2], avh[1] / avh[2]];
    }

    // TODO: Is rotate needed?
    // TODO: Is invert needed?

    // TODO: Needed?
    //this.identity = this.createIdentity();
};

Transform2D.prototype = {
    constructor: Transform2D,

    multiply: function (b) {
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {

            }
        }
    }
};

var keyCodeToName = {
    //8: 'backspace',
    //9: 'tab',
    //13: 'enter',
    //27: 'escape',
    //32: 'space',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
};

// Layer that contains entities to display/update
function Layer() {
    this.entities = [];
    this.keyPressed = {};
}

Layer.prototype = {
    constructor: Layer,

    addEntity: function (entity) {
        this.entities.push(entity);
    },

    forEachEntity: function (f) {
        var entities = this.entities;
        var entityCount = entities.length;
        for (var i = 0; i < entityCount; i++) {
            f(entities[i]);
        }
    },

    update: function () {
        var now = Date.now();
        if (this.lastUpdate && this.lastUpdate < now) {
            var ms = now - this.lastUpdate;
            this.forEachEntity(function (entity) {
                if (entity.update) {
                    entity.update(ms);
                }
            });
        }

        this.lastUpdate = now;
    },

    drawEntity: function (canvas, context, entity) {
        context.save();
        context.translate(entity.x, entity.y);
        context.scale(entity.width, entity.height);

        // TODO: Draw entities based on elements
        context.fillStyle = entity.color;
        context.fillRect(-0.5, -0.5, 1, 1);

        // Draw children
        if (entity.children) {
            var childCount = entity.children.length;
            for (var i = 0; i < childCount; i++) {
                Layer.prototype.drawEntity(canvas, context, entity.children[i]);
            }
        }

        context.restore();
    },

    draw: function (canvas, context) {
        // TODO: Use clearRect?
        context.fillStyle = 'black';
        context.fillRect(0, 0, canvas.width, canvas.height);
        var layer = this;

        // Adjust coordinate system
        // TODO: Should be based on canvas dimensions and support resizing
        context.save();
        context.translate(320, 240);
        context.scale(1, -1);

        this.forEachEntity(function (entity) {
            Layer.prototype.drawEntity(canvas, context, entity);
        });

        context.restore();
    }
};

// Entity that can be displayed and updated each frame
function Entity() {
    // TODO: Display elements
    // TODO: Update function
    this.x = 0;
    this.y = 0;
    this.width = 1;
    this.height = 1;
    this.color = 'white';
    // TODO: Z order
}

Entity.prototype = {
    constructor: Entity,

    addChild: function (child) {
        if (!this.children) {
            this.children = [];
        }

        this.children.push(child);
    },

    clearChildren: function () {
        if (this.children) {
            this.children.length = 0;
        }
    },

    updateChildren: function (ms) {
        if (this.children) {
            var childCount = this.children.length;
            for (var i = 0; i < childCount; i++) {
                this.children[i].update(ms);
            }
        }
    },

    update: function (ms) {
        this.updateChildren(ms);
    }

    // TODO: removeChild
};

// Serializes key presses so that they show up predictably between frames
function KeySerializer() {
    var queuedKeyCodes = [];
    var queuedKeyStates = [];

    addEventListener("keydown", function (e) {
        if (e.keyCode in keyCodeToName) {
            queuedKeyCodes.push(e.keyCode);
            queuedKeyStates.push(true);
        }
    }, false);

    addEventListener("keyup", function (e) {
        if (e.keyCode in keyCodeToName) {
            queuedKeyCodes.push(e.keyCode);
            queuedKeyStates.push(false);
        }
    }, false);

    this.process = function (keyPressed) {
        var count = queuedKeyCodes.length;
        if (count > 0) {
            for (var i = 0; i < count; i++) {
                keyPressed(keyCodeToName[queuedKeyCodes[i]], queuedKeyStates[i]);
            }

            queuedKeyCodes.length = 0;
            queuedKeyStates.length = 0;
        }
    };
}

// Layers handles a stack of layers (only the top one is visible/running)
var layers = new function () {
    var keySerializer = new KeySerializer();
    var list = [];
    var canvas;
    var context;

    // TODO: Shown handlers, etc.
    this.push = function (layer) {
        list.unshift(layer);
    };

    this.pop = function () {
        list.shift();
    };

    // Single loop iteration
    var loop = function () {
        var activeLayer = list[0];
        // TODO: Handle switching layers
        if (activeLayer) {
            // Handle input
            var keyPressed = activeLayer.keyPressed;
            keySerializer.process(function (key, pressed) {
                var keyPressedHandler = keyPressed[key];
                if (keyPressedHandler) {
                    keyPressedHandler(pressed);
                }
            });

            // Update entities and draw everything
            activeLayer.update();
            activeLayer.draw(canvas, context);
        }

        // TODO: setInterval or requestAnimationFrame?
        requestAnimationFrame(loop);
    };

    this.runMainLoop = function (newCanvas, newContext) {
        // Initialization
        canvas = newCanvas;
        context = newContext;

        // Start looping
        loop();
    }
};

function Enemy(speedX, speedY) {
    Entity.call(this);
    this.speed = {
        x: speedX,
        y: speedY
    };
}

Enemy.prototype = Object.create(Entity.prototype);

Enemy.prototype.updateAxis = function (ms, axis, axisSize) {
    var axisSpeed = this.speed[axis];
    var axisPosition = this[axis] + axisSpeed * ms;
    if (Math.abs(axisPosition) + axisSize / 2 > 0.5) {
        // Reverse direction
        if (axisSpeed > 0) {
            axisPosition = 0.5 - axisSize / 2 - 0.01;
        } else {
            axisPosition = -0.5 + axisSize / 2 + 0.01;
        }
        
        this.speed[axis] = -axisSpeed;
    }
    
    this[axis] = axisPosition;
};

Enemy.prototype.update = function (ms) {
    this.updateAxis(ms, 'x', this.width);
};

Enemy.prototype.update = function (ms) {
    this.updateAxis(ms, 'y', this.height);
};

function Player() {
    Entity.call(this);
    this.color = 'green';
    this.v = [0, 0, 0, 0];
    this.speed = 0.6 / 1000;
    this.width = 1 / 30;
    this.height= 1 / 30;
}

Player.prototype = Object.create(Entity.prototype);
Player.prototype.setMovingUpState = function (pressed) {
    this.v[0] = pressed ? 1 : 0;
};

Player.prototype.setMovingDownState = function (pressed) {
    this.v[1] = pressed ? 1 : 0;
};

Player.prototype.setMovingLeftState = function (pressed) {
    this.v[2] = pressed ? 1 : 0;
};

Player.prototype.setMovingRightState = function (pressed) {
    this.v[3] = pressed ? 1 : 0;
};

Player.prototype.clearMovingStates = function () {
    this.v[0] = 0;
    this.v[1] = 0;
    this.v[2] = 0;
    this.v[3] = 0;
};

Player.prototype.update = function (ms) {
    var directionX = this.v[3] - this.v[2];
    var directionY = this.v[0] - this.v[1];
    if (directionX || directionY) {
        var direction = Math.atan2(directionY, directionX);
        this.x += this.speed * ms * Math.cos(direction);
        this.y += this.speed * ms * Math.sin(direction);

        // Boundaries
        if (Math.abs(this.x) + this.width / 2 > 0.5) {
            if (this.x > 0) {
                this.x = 0.5 - this.width / 2;
            } else {
                this.x = -0.5 + this.width / 2;
            }
        }

        if (Math.abs(this.y) + this.height / 2 > 0.5) {
            if (this.y > 0) {
                this.y = 0.5 - this.height / 2;
            } else {
                this.y = -0.5 + this.height / 2;
            }
        }
    }
};

function Board() {
    Entity.call(this);
    this.width = 400;
    this.height = 400;
    this.color = 'blue';
    this.player = new Player();
}

Board.prototype = Object.create(Entity.prototype);
Board.prototype.reset = function () {
    this.clearChildren();
    this.addChild(this.player);
};

// TODO: Better sizing (and support resizing)
var canvas = document.createElement('canvas');
canvas.width = 640;
canvas.height = 480;
document.body.appendChild(canvas);

var testLayer = new Layer();
var board = new Board();
board.reset();
board.addChild(new Enemy(0.1, 0));
testLayer.addEntity(board);
testLayer.keyPressed = {
    left: function (pressed) {
        board.player.setMovingLeftState(pressed);
    },

    right: function (pressed) {
        board.player.setMovingRightState(pressed);
    },

    up: function (pressed) {
        board.player.setMovingUpState(pressed);
    },

    down: function (pressed) {
        board.player.setMovingDownState(pressed);
    }
};

layers.push(testLayer);
layers.runMainLoop(canvas, canvas.getContext('2d'));
