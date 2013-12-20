/// <reference path="radius.js" />
/// <reference path="radius-ui.js" />

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
    this.elements = [new Rectangle()];
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
    Entity.call(this);
    this.width = 1 / 30;
    this.height = 1 / 30;
    this.color = 'red';
    this.elements = [new Rectangle()];
}

Goal.prototype = Object.create(Entity.prototype);

Goal.prototype.createGhost = function () {
    return new Ghost(this, 500, 5);
};

function Player() {
    Entity.call(this);
    this.color = 'green';
    this.v = [0, 0, 0, 0];
    this.target = [];
    this.speed = 0.6 / 1000;
    this.width = 1 / 30;
    this.height = 1 / 30;
    this.elements = [new Rectangle()];
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

Player.prototype.setTarget = function (x, y) {
    this.target[0] = x;
    this.target[1] = y;
};

Player.prototype.updateTarget = function (x, y) {
    if (this.target.length > 0) {
        this.setTarget(x, y);
    }
}

Player.prototype.clearTarget = function () {
    this.target.length = 0;
};

Player.prototype.clearMovingStates = function () {
    this.v[0] = 0;
    this.v[1] = 0;
    this.v[2] = 0;
    this.v[3] = 0;
    this.clearTarget();
};

Player.prototype.createGhost = function () {
    return new Ghost(this, 750, 6);
};

Player.prototype.update = function (ms) {
    var directionX = this.v[3] - this.v[2];
    var directionY = this.v[0] - this.v[1];
    var target = this.target;
    if (directionX || directionY || target.length > 0) {
        var direction;
        if (target.length > 0) {
            // Only move if we're a little ways from the target
            var dx = target[0] - this.x;
            var dy = target[1] - this.y;
            if (Math.abs(dx) > this.width / 4 || Math.abs(dy) > this.height / 4) {
                direction = Math.atan2(dy, dx);
            }
        } else {
            direction = Math.atan2(directionY, directionX);
        }

        if (direction !== undefined) {
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
    this.score = 0;
    this.scoreUpdated = new Event();
    this.points = 0;
    this.pointsUpdated = new Event();
    this.points = 30;
    this.lost = new Event();
    this.elements = [new Rectangle()];
}

Board.pointProgression = [30, 20, 15, 10, 8, 7, 6, 5, 4, 3, 2, 1, 0];
Board.timeout = 19000;

Board.prototype = Object.create(Entity.prototype);

Board.prototype.resetGoal = function () {
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

    // Animate in the new enemy
    var enemy = new Enemy(position[0], position[1], size, size, speedX, speedY);
    var board = this;
    this.children.push(new Ghost(enemy, 500, 0, true, function () {
        board.children.push(enemy);
    }));
};

Board.prototype.lose = function () {
    this.player.clearMovingStates();
    this.children.push(this.player.createGhost());
    this.removeChild(this.player);
    this.paused = true;
    this.lost.fire();
}

Board.prototype.captureGoal = function () {
    this.setScore(this.score + this.points);
    this.children.push(this.goal.createGhost());
    this.resetGoal();
    this.addEnemy();
};

Board.prototype.update = function (ms) {
    // Update children first
    this.updateChildren(ms);

    // Update timer
    this.timer += ms;

    if (!this.paused) {
        var done = false;

        // Check for goal intersection
        if (this.checkCollision(this.player, this.goal)) {
            this.captureGoal();
        } else {
            var points = Board.pointProgression[Math.max(0, Math.min(Board.pointProgression.length - 1, Math.floor(this.timer / Board.timeout * Board.pointProgression.length)))];
            if (points !== this.points) {
                this.setPoints(points);
            }
        }

        // Check for enemy intersection
        var childCount = this.children.length;
        for (var i = 0; i < childCount; i++) {
            var child = this.children[i];
            if (child instanceof Enemy) {
                if (this.checkCollision(this.player, child)) {
                    done = true;
                    break;
                }
            }
        }

        if (done) {
            this.lose();
        }
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
    this.children = [this.player, this.goal];

    this.setScore(0);
    this.resetGoal();
};

function ValueDisplay(font, event, x, y, align, updatedCallback) {
    Entity.apply(this);
    this.x = x;
    this.y = y;
    this.align = align;
    this.textElement = new Text('', font, 0, 0, align, 'bottom');
    this.elements = [this.textElement];
    this.updatedCallback = updatedCallback;
    var valueDisplay = this;
    event.addListener(function (value) {
        valueDisplay.textElement.text = '' + value;

        if (valueDisplay.updatedCallback) {
            valueDisplay.updatedCallback();
        }
    });
}

ValueDisplay.prototype = Object.create(Entity.prototype);

function Display(board) {
    Entity.apply(this);
    this.children = [];

    var font = '32px sans-serif';
    var textHeight = 32;
    var display = this;
    var addUpdateEffect = function () {
        var sign = (this.align === 'right') ? 1 : -1;
        display.children.push(new Ghost(this, 150, 2, undefined, undefined, sign * this.textElement.getTotalWidth() / 2, -textHeight / 2));
    }

    var scoreLabel = new Text('Score: ', font, -200, 200, 'left', 'bottom');
    var padding = (new Text('00', font)).getTotalWidth();
    var pointLabel = new Text('Points: ', font, 200 - padding, 200, 'right', 'bottom');
    this.elements = [scoreLabel, pointLabel];
    // TODO: Don't add the effect when the game first starts
    this.children.push(this.scoreDisplay = new ValueDisplay(font, board.scoreUpdated, -200 + scoreLabel.getTotalWidth(), 200, 'left', addUpdateEffect));
    this.children.push(new ValueDisplay(font, board.pointsUpdated, 200, 200, 'right', addUpdateEffect));

    this.font = font;
    this.textHeight = textHeight;
    this.scoreLabel = scoreLabel;
}

Display.prototype = Object.create(Entity.prototype);

Display.prototype.emphasizeScore = function () {
    var content = this.scoreLabel.text + this.scoreDisplay.textElement.text;
    var textElement = new Text(content, this.font, 0, 0, 'left', 'middle');
    var textWidth = textElement.getTotalWidth();
    var background = new Rectangle(-this.textHeight / 2, this.textHeight / 2, textWidth + this.textHeight, this.textHeight);
    background.color = 'blue';
    background.opacity = 0.85;
    var scaleMax = 2;
    this.bigScore = this.children.push(new ScriptedEntity([background, textElement],
        [[0, -200 + this.textHeight / 2, 200, 1, 1, 0, 1],
         [1000, -textWidth * scaleMax / 2, 0, scaleMax, scaleMax, 0, 1]]));
};

function GameLayer() {
    Layer.apply(this);
    this.board = this.addEntity(new Board());
    this.display = this.addEntity(new Display(this.board));
    this.board.reset();

    var display = this.display;
    this.board.lost.addListener(function () {
        display.emphasizeScore();
    });

    var board = this.board;
    this.keyPressed = {
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

    this.mouseButtonPressed = function (button, pressed, x, y) {
        if (button == MouseButton.primary) {
            if (pressed) {
                // TODO: This is ugly
                board.player.setTarget(x / board.width, y / board.height);
            } else {
                board.player.clearTarget();
            }
        }
    };

    this.mouseMoved = function (x, y) {
        board.player.updateTarget(x / board.width, y / board.height);
    }
}

GameLayer.prototype = Object.create(Layer.prototype);

window.onload = function () {
    // TODO: Consider automatic resizing (e.g. to fill the screen)
    Radius.initialize(document.getElementById('canvas'));
    //Radius.start(new GameLayer());
    // TODO: Show a menu
    var form = Form.newFlow(3, -200, 200, 400, null,
        new Label('one'),
        new Button('two'),
        new Label('three'),
        new Button('four'),
        new Label('five'),
        new Button('six'),
        new Label('seven'),
        new Button('eight'),
        new Label('nine'),
        new Button('TEN'));
    Radius.start(new FormLayer(form));
}
