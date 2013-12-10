function Player() {
    this.width = 32;
    this.height = 16;
    this.elements = [new Rectangle()];
    this.color = 'white';
}

function Board() {
    Entity.call(this);
    this.children = [new Player()];
}

Board.prototype = Object.create(Entity.prototype);

Board.prototype.reset = function () {
    // TODO
};

Board.prototype.update = function (ms) {
    // TODO
    // Update children first
    //this.updateChildren(ms);
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
