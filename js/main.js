function Target(board, x, y) {
    Entity.apply(this);
    this.board = board;
    this.x = x;
    this.y = y;
    this.width = 16;
    this.height = 16;
    this.elements = [new Rectangle()];
    this.color = 'brown';
}

Target.prototype = Object.create(Entity.prototype);

Target.prototype.update = function (ms) {
    this.x += this.board.vx * ms;
};

function Package(board, x, y) {
    Entity.apply(this);
    this.board = board;
    this.x = x;
    this.y = y;
    this.width = 8;
    this.height = 8;
    this.elements = [new Rectangle()];
    this.color = 'red';
    this.vx = -this.board.vx + 50 / 1000;
    this.vy = 0;
    this.ay = -200 / 1000 / 1000;
}

Package.prototype = Object.create(Entity.prototype);

Package.prototype.update = function (ms) {
    this.x += (this.vx + this.board.vx) * ms;
    this.vy += this.ay * ms;
    this.y += this.vy * ms;
};

function Player(board) {
    Entity.apply(this);
    this.board = board;
    this.x = -240;
    this.y = 160;
    this.width = 32;
    this.height = 16;
    this.elements = [new Rectangle()];
    this.color = 'white';
    this.packageTimer = 0;
    this.dropping = false;
}

Player.prototype = Object.create(Entity.prototype);
Player.packageFrequency = 400;

Player.prototype.setDropping = function (pressed) {
    this.dropping = pressed;
};

Player.prototype.update = function (ms) {
    this.packageTimer = Math.max(this.packageTimer - ms, 0);

    if (this.dropping) {
        if (this.packageTimer <= 0) {
            this.board.dropPackage();
            this.packageTimer += Player.packageFrequency;
        }
    }
};

function Board() {
    Entity.call(this);
    this.player = new Player(this);
}

Board.prototype = Object.create(Entity.prototype);
Board.verticalLevels = [-100, -60, -20];
Board.verticalMin = -500;
Board.horizontalMin = -360;
Board.horizontalMax = 360;
Board.targetFrequency = 1000;
Board.initialSpeed = 200 / 1000;

Board.prototype.reset = function () {
    this.children = [this.player];
    this.timer = 0;
    this.vx = -Board.initialSpeed;
};

Board.prototype.dropPackage = function () {
    this.children.push(new Package(this, this.player.x + this.player.width / 2, this.player.y));
};

Board.prototype.update = function (ms) {
    this.updateChildren(ms);

    // Move objects
    for (var i = 0; i < this.children.length; i++) {
        // Check for objects that are out of bounds
        var child = this.children[i];
        if (child.x < Board.horizontalMin || child.y < Board.verticalMin) {
            this.children.splice(i, 1);
            i--;
        }
    }

    // Add new targets
    this.timer += ms;
    if (this.timer > Board.targetFrequency) {
        this.timer -= Board.targetFrequency;
        this.children.push(new Target(this, Board.horizontalMax, Board.verticalLevels[Math.floor(Math.random() * Board.verticalLevels.length)]));
    }
};

function GameLayer() {
    Layer.apply(this);
    this.board = this.addEntity(new Board());
    this.board.reset();

    var board = this.board;
    this.keyPressed = {
        space: function (pressed) {
            board.player.setDropping(pressed);
        }
    };

    this.mouseButtonPressed = function (button, pressed, x, y) {
        if (button === MouseButton.primary) {
            board.player.setDropping(pressed);
        }
    };
}

GameLayer.prototype = Object.create(Layer.prototype);

window.onload = function () {
    // TODO: Consider automatic resizing (e.g. to fill the screen)
    Radius.initialize(document.getElementById('canvas'));
    Radius.start(new GameLayer());
}
