function Event() {
    this.callbacks = [];
}

Event.prototype = {
    constructor: Event,

    addListener: function (callback) {
        this.callbacks.push(callback);
    },

    fire: function () {
        var callbacks = this.callbacks;
        var length = callbacks.length;
        for (var i = 0; i < length; i++) {
            callbacks[i].apply(null, arguments);
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

        // Draw all elements (and default to a 1x1 rectangle)
        context.fillStyle = entity.color;
        if (entity.elements) {
            var elementCount = entity.elements.length;
            for (var i = 0; i < elementCount; i++) {
                var element = entity.elements[i];
                if (element instanceof Rectangle) {
                    context.fillRect(element.x, -element.y, element.width, element.height);
                } else if (element instanceof Text && element.text) {
                    if (element.font) {
                        context.font = element.font;
                    }

                    // TODO: Having to flip the coordinate system is kind of obnoxious... should I give in and use inverted coordinates everywhere?
                    context.textBaseline = element.baseline;
                    context.textAlign = element.align;
                    context.save();
                    context.scale(1, -1);
                    context.fillText(element.text, element.x, element.y);
                    context.restore();
                }
            }
        } else {
            context.fillRect(-0.5, -0.5, 1, 1);
        }

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

function Rectangle(x, y, width, height) {
    this.x = x || -0.5;
    this.y = y || 0.5;
    this.width = width || 1;
    this.height = height || 1;
}

function Text(text, font, x, y, align, baseline) {
    this.text = text;
    this.font = font;
    this.x = x || 0;
    this.y = y || 0;
    this.align = align || 'left';
    this.baseline = baseline || 'alphabetic';
}

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

    // TODO: Should subclasses just manipulate the children array directly?
    addChild: function (child) {
        if (!this.children) {
            this.children = [];
        }

        this.children.push(child);
    },

    removeChild: function (child) {
        var childCount = this.children.length;
        for (var i = 0; i < childCount; i++) {
            if (child === this.children[i]) {
                this.children.splice(i, 1);
            }
        }
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
};

// Serializes key presses so that they show up predictably between frames
function KeySerializer() {
    var queuedKeyCodes = [];
    var queuedKeyStates = [];

    addEventListener('keydown', function (e) {
        if (e.keyCode in keyCodeToName) {
            queuedKeyCodes.push(e.keyCode);
            queuedKeyStates.push(true);
        }
    }, false);

    addEventListener('keyup', function (e) {
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
            // TODO: How to deal with really long delays between animation frames? Just override the value of ms (i.e. pretend it didn't happen)?
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

function Enemy(x, y, width, height, speedX, speedY) {
    Entity.call(this);
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
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
    this.updateAxis(ms, 'y', this.height);
};

function Goal() {
    // TODO: Speeds/movement
    Entity.call(this);
    this.width = 1 / 30;
    this.height = 1 / 30;
    this.color = 'red';
}

Goal.prototype = Object.create(Entity.prototype);

function Player() {
    Entity.call(this);
    this.color = 'green';
    this.v = [0, 0, 0, 0];
    this.speed = 0.6 / 1000;
    this.width = 1 / 30;
    this.height = 1 / 30;
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
    this.goal = new Goal();
    this.paused = false;
    this.enemies = [];
    this.score = 0;
    this.scoreUpdated = new Event();
    this.points = 0;
    this.pointsUpdated = new Event();
    // TODO: Varying points
    this.points = 30;
}

Board.pointProgression = [30, 20, 15, 10, 8, 7, 6, 5, 4, 3, 2, 1, 0];
Board.timeout = 19000;

Board.prototype = Object.create(Entity.prototype);

Board.prototype.resetGoal = function () {
    // TODO: Speed/movement
    // TODO: Difficulty
    var position = this.getSafePosition(this.goal.width, this.goal.height);
    this.goal.x = position[0];
    this.goal.y = position[1];
    this.setPoints(Board.pointProgression[0]);
    this.timer = 0;
};

Board.prototype.checkCollision = function (a, b) {
    var ax1 = a.x - a.width / 2;
    var ax2 = a.x + a.width / 2;
    var ay1 = a.y - a.height / 2;
    var ay2 = a.y + a.height / 2;
    var bx1 = b.x - b.width / 2;
    var bx2 = b.x + b.width / 2;
    var by1 = b.y - b.height / 2;
    var by2 = b.y + b.height / 2;

    if (((ax1 >= bx1 && ax1 <= bx2) || (ax2 >= bx1 && ax2 <= bx2) || (bx1 >= ax1 && bx1 <= ax2))
    && ((ay1 >= by1 && ay1 <= by2) || (ay2 >= by1 && ay2 <= by2) || (by1 >= ay1 && by1 <= ay2))) {
        return true;
    }

    return false;
};

Board.prototype.getSafePosition = function (width, height) {
    var boardPlayerMinimumDistance = 0.15;
    var ax1 = Math.max(-0.5 + width / 2, this.player.x - (this.player.width / 2 + width / 2 + boardPlayerMinimumDistance));
    var ax2 = Math.min(0.5 - width / 2, this.player.x + (this.player.width / 2 + width / 2 + boardPlayerMinimumDistance));
    var ay1 = Math.max(-0.5 + height / 2, this.player.y - (this.player.height / 2 + height / 2 + boardPlayerMinimumDistance));
    var ay2 = Math.min(0.5 - height / 2, this.player.y + (this.player.height / 2 + height / 2 + boardPlayerMinimumDistance));
    var valid = true;

    do {
        var x = (Math.random() - 0.5) * (1 - width);
        var y = (Math.random() - 0.5) * (1 - height);

        var bx1 = x - width / 2;
        var bx2 = x + width / 2;
        var by1 = y - height / 2;
        var by2 = y + height / 2;

        if (((ax1 >= bx1 && ax1 <= bx2) || (ax2 >= bx1 && ax2 <= bx2) || (bx1 >= ax1 && bx1 <= ax2))
        && ((ay1 >= by1 && ay1 <= by2) || (ay2 >= by1 && ay2 <= by2) || (by1 >= ay1 && by1 <= ay2))) {
            valid = false;
        } else {
            return [x, y];
        }
    } while (!valid)
};

Board.prototype.addEnemy = function () {
    var size = 1 / 30;
    var speed = 0.2 / 1000;
    var speedX = 0;
    var speedY = 0;
    var position = this.getSafePosition(size, size);

    // TODO: Difficulty levels

    if (Math.random() >= 0.5) {
        speedX = speed;
    } else {
        speedY = speed;
    }

    var enemy = new Enemy(position[0], position[1], size, size, speedX, speedY);
    this.addChild(enemy);
    this.enemies.push(enemy);
};

Board.prototype.lose = function () {
    this.player.clearMovingStates();
    // TODO: Animation
    this.removeChild(this.player);
    this.paused = true;
}

Board.prototype.update = function (ms) {
    // Update children first
    this.updateChildren(ms);

    // Update timer
    this.timer += ms;

    if (!this.paused) {
        var done = false;

        // Check for goal intersection
        if (this.checkCollision(this.player, this.goal)) {
            // TOOD: Animation
            this.setScore(this.score + this.points);
            this.resetGoal();
            this.addEnemy();
        } else {
            var points = Board.pointProgression[Math.max(0, Math.min(Board.pointProgression.length - 1, Math.floor(this.timer / Board.timeout * Board.pointProgression.length)))];
            if (points != this.points) {
                this.setPoints(points);
            }
        }

        // Check for enemy intersection
        var enemyCount = this.enemies.length;
        for (var i = 0; i < enemyCount; i++) {
            if (this.checkCollision(this.player, this.enemies[i])) {
                done = true;
                break;
            }
        }

        if (done) {
            this.lose();
        }

        // TODO: Animations
    }
};

Board.prototype.setScore = function (score) {
    this.score = score;
    this.scoreUpdated.fire(score);
}

Board.prototype.setPoints = function (points) {
    this.points = points;
    this.pointsUpdated.fire(points);
}

Board.prototype.reset = function () {
    this.clearChildren();
    this.enemies.length = 0;

    this.addChild(this.player);
    this.addChild(this.goal);

    this.setScore(0);
    this.resetGoal();
};

function ValueDisplay(prefix, event, x, y, align) {
    Entity.apply(this);
    this.x = x;
    this.y = y;
    var text = new Text('', '32px sans-serif', 0, 0, align, 'bottom');
    this.elements = [text];
    event.addListener(function (value) {
        text.text = prefix + value;
    });
}

ValueDisplay.prototype = Object.create(Entity.prototype);

window.onload = function () {
    // TODO: Better sizing (and support resizing)
    var canvas = document.getElementById('canvas');
    canvas.width = 640;
    canvas.height = 480;

    var testLayer = new Layer();
    var board = new Board();
    testLayer.addEntity(board);
    testLayer.addEntity(new ValueDisplay('Score: ', board.scoreUpdated, -200, 200, 'left'));
    testLayer.addEntity(new ValueDisplay('Points: ', board.pointsUpdated, 200, 200, 'right'));
    board.reset();
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
}
