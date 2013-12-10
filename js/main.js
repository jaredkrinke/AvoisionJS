function Target(x, y) {
    Entity.apply(this);
    this.x = x;
    this.y = y;
    this.width = 16;
    this.height = 16;
    this.elements = [new Rectangle()];
    this.color = 'brown';
}

Target.prototype = Object.create(Entity.prototype);

function Player() {
    Entity.apply(this);
    this.x = -240;
    this.y = 160;
    this.width = 32;
    this.height = 16;
    this.elements = [new Rectangle()];
    this.color = 'white';
}

Player.prototype = Object.create(Entity.prototype);

function Board() {
    Entity.call(this);
    this.player = new Player();
}

Board.prototype = Object.create(Entity.prototype);
Board.verticalLevels = [-100, -60, -20];
Board.horizontalMin = -360;
Board.horizontalMax = 360;
Board.targetFrequency = 1000;
Board.initialSpeed = 200 / 1000;

Board.prototype.reset = function () {
    this.children = [this.player];
    this.timer = 0;
    this.speed = Board.initialSpeed;
};

Board.prototype.update = function (ms) {
    // Move objects
    for (var i = 0; i < this.children.length; i++) {
        var child = this.children[i];
        if (!(child instanceof Player)) {
            // Move non-player entities to the left
            child.x -= this.speed * ms;

            // Check for objects that are out of bounds
            if (child.x < Board.horizontalMin) {
                this.children.splice(i, 1);
                i--;
            }
        }
    }

    // Add new targets
    this.timer += ms;
    if (this.timer > Board.targetFrequency) {
        this.timer -= Board.targetFrequency;
        this.children.push(new Target(Board.horizontalMax, Board.verticalLevels[Math.floor(Math.random() * Board.verticalLevels.length)]));
    }
};

function GameLayer() {
    Layer.apply(this);
    this.board = this.addEntity(new Board());
    this.board.reset();

    var board = this.board;
    this.keyPressed = {
        left: function (pressed) {
            // TODO
        },

        right: function (pressed) {
            // TODO
        },

        up: function (pressed) {
            // TODO
        },

        down: function (pressed) {
            // TODO
        }
    };

    this.mouseButtonPressed = function (button, pressed, x, y) {
        if (button == MouseButton.primary) {
            if (pressed) {
                // TODO
            } else {
                // TODO
            }
        }
    };
}

GameLayer.prototype = Object.create(Layer.prototype);

window.onload = function () {
    // TODO: Consider automatic resizing (e.g. to fill the screen)
    Radius.initialize(document.getElementById('canvas'));
    Radius.start(new GameLayer());
}
