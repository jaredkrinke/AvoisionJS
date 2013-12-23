/// <reference path="radius.js" />

function Label(text, alignment, textHeight, font) {
    Entity.apply(this);
    this.alignment = alignment || 'left';
    this.elements = [this.textElement = new Text('', font || Label.font, undefined, undefined, this.alignment)];
    this.totalHeight = textHeight || Label.textHeight;
    this.setText(text);
}

Label.textHeight = 24;
Label.font = Label.textHeight + 'px sans-serif';
Label.prototype = Object.create(Entity.prototype);
Label.alignmentToSetX = {
    left: function (x) {
        this.x = x;
    },

    center: function (x) {
        var size = this.getSize();
        this.x = x + size[0] / 2;
    },

    right: function (x) {
        var size = this.getSize();
        this.x = x + size[0];
    }
};

Label.prototype.setColor = function (color) {
    this.textElement.color = color;
};

Label.prototype.setText = function (text) {
    this.textElement.text = text;
    this.totalWidth = this.getMinimumSize()[0];
};

Label.prototype.setLayer = function (layer) {
    layer.addEntity(this);
};

Label.prototype.getPosition = function () {
    return [this.componentX, this.componentY];
};

Label.prototype.setPosition = function (x, y) {
    this.componentX = x;
    this.componentY = y;
    var setX = Label.alignmentToSetX[this.alignment];
    setX.call(this, x);
    this.y = y - this.totalHeight;
};

Label.prototype.getActive = function () {
    return false;
};

Label.prototype.getMinimumSize = function () {
    return [this.textElement.getTotalWidth(), this.totalHeight];
};

Label.prototype.getDesiredSize = function () {
    return this.getMinimumSize();
};

Label.prototype.getSize = function () {
    return [this.totalWidth, this.totalHeight];
};

Label.prototype.setSize = function (width, height) {
    if (this.alignment === 'right') {
        // Add padding
        if (this.x !== undefined) {
            this.x += width - this.totalWidth;
        }
    }

    this.totalWidth = width;
};

function Separator() {
    Label.call(this, ' ');
}

Separator.prototype = Object.create(Label.prototype);

function Title(text) {
    Label.call(this, text, 'center', Title.textHeight, Title.font);
}

Title.textHeight = 32;
Title.font = Title.textHeight + 'px sans-serif';
Title.prototype = Object.create(Label.prototype);

function Button(text, activated) {
    Label.call(this, text);
    this.active = true;
    this.textElement.color = Button.defaultColor;
    this.activated = activated;
}

Button.defaultColor = 'white';
Button.focusedColor = 'blue';
Button.disabledColor = 'gray';
Button.prototype = Object.create(Label.prototype);

Button.prototype.setActive = function (active) {
    this.active = active;
    this.setColor(active ? Button.defaultColor : Button.disabledColor);
};

Button.prototype.getActive = function () {
    return this.active;
};

Button.prototype.focused = function () {
    this.textElement.color = Button.focusedColor;
};

Button.prototype.unfocused = function () {
    this.textElement.color = Button.defaultColor;
};

function Form(x, y, desiredWidth, desiredHeight, layout, components) {
    this.x = (x !== undefined) ? x : Form.defaultX;
    this.y = (y !== undefined) ? y : Form.defaultY;
    this.desiredWidth = desiredWidth || Form.defaultWidth;
    this.desiredHeight = desiredHeight;
    this.layout = layout;

    if (components) {
        this.components = components;
        this.layout();
    } else {
        this.components = [];
    }

    this.keyPressedHandlers = {
        up: Form.prototype.moveFocusUp,
        down: Form.prototype.moveFocusDown,
        left: Form.prototype.moveLeft,
        right: Form.prototype.moveRight,
        enter: Form.prototype.activate
    };
}

Form.defaultX = -200;
Form.defaultY = 200;
Form.defaultWidth = 400;

Form.prototype = {
    constructor: Form,

    changeFocus: function (newlyFocusedNode, key) {
        var lastFocusedNode = this.focusedNode;
        this.focusedNode = newlyFocusedNode;

        // Notify the previously-focused component that it has lost focus
        if (lastFocusedNode && lastFocusedNode.unfocused) {
            lastFocusedNode.unfocused();
        }

        // Notify the newly-focused component that it has gained focus
        if (newlyFocusedNode && newlyFocusedNode.focused) {
            newlyFocusedNode.focused(key);
        }
    },

    focus: function (component) {
        this.changeFocus(component);
    },

    getComponentIndex: function (component) {
        var components = this.components;
        var componentCount = components.length;
        for (var i = 0; i < componentCount; i++) {
            if (components[i] === component) {
                return i;
            }
        }
    },

    moveFocusUp: function (key) {
        var oldNode = this.focusedNode;
        var newNode;
        var i;

        if (oldNode) {
            i = this.getComponentIndex(oldNode);
        } else {
            // Start after the last component
            i = this.components.length;
        }

        // Iterate to next active node
        while (--i >= 0) {
            var component = this.components[i];
            // TODO: The first two conditions seem unnecessary... this is done in two places in this file
            if (component && component.getActive && component.getActive()) {
                newNode = component;
                break;
            }
        }

        if (newNode) {
            this.changeFocus(newNode, key);
        }

        return newNode && newNode !== oldNode;
    },

    moveFocusDown: function (key) {
        var components = this.components;
        var oldNode = this.focusedNode;
        var newNode;
        var i;

        if (oldNode) {
            i = this.getComponentIndex(oldNode);
        } else {
            // Start before the first component
            i = -1;
        }

        // Iterate to next active node
        var componentCount = components.length;
        while (++i < componentCount) {
            var component = components[i];
            if (component && component.getActive && component.getActive()) {
                newNode = component;
                break;
            }
        }

        if (newNode) {
            this.changeFocus(newNode, key);
        }

        return newNode && newNode !== oldNode;
    },

    moveLeft: function () {
        var handled = false;
        if (this.focusedNode && this.focusedNode.movedLeft) {
            this.focusedNode.movedLeft();
        }

        return handled;
    },

    moveRight: function () {
        var handled = false;
        if (this.focusedNode && this.focusedNode.movedRight) {
            this.focusedNode.movedRight();
        }

        return handled;
    },

    activate: function () {
        var handled = false;
        if (this.focusedNode && this.focusedNode.activated) {
            this.focusedNode.activated();
            handled = true;
        }

        return handled;
    },

    keyPressed: function (key, pressed) {
        var handled = false;

        // Give priority to the focused component
        if (this.focusedNode && this.focusedNode.keyPressed) {
            handled = this.focusedNode.keyPressed(key, pressed);
        }

        if (!handled) {
            var keyPressedHandler = this.keyPressedHandlers[key];
            if (keyPressedHandler) {
                if (pressed) {
                    handled = keyPressedHandler.call(this, key, pressed);
                }
            }
        }

        return handled;
    },

    getComponentAtPosition: function (x, y) {
        var intersectingComponent;
        var componentCount = this.components.length;
        for (var i = 0; i < componentCount; i++) {
            var component = this.components[i];
            if (component.getActive && component.getActive()) {
                var position = component.getPosition();
                var size = component.getSize();
                var x2 = position[0] + size[0];
                var y2 = position[1] - size[1];

                if (x >= position[0] && x <= x2 && y <= position[1] && y >= y2) {
                    // Only focus/notify the first match
                    intersectingComponent = component;
                    break;
                }
            }
        }

        return intersectingComponent;
    },

    mouseMoved: function (x, y) {
        var handled = false;
        var component = this.getComponentAtPosition(x, y);
        if (component) {
            if (this.focusedNode !== component) {
                this.changeFocus(component);
            }

            if (component.mouseMoved) {
                handled = component.mouseMoved(x, y);
            }
        }

        return handled;
    },

    mouseButtonPressed: function (button, pressed, x, y) {
        // TODO: This is kind of a hack...
        // Move first
        this.mouseMoved(x, y);

        // Now handle the press as though enter were pressed...
        return this.keyPressed('enter', pressed);
    },

    add: function (component) {
        this.components.push(component);
        // TODO: Handle nested stuff for focus...
        this.layout();
    },

    setLayer: function (layer) {
        var components = this.components;
        var componentCount = components.length;
        for (var i = 0; i < componentCount; i++) {
            components[i].setLayer(layer);
        }
    },

    getPosition: function () {
        return [this.x, this.y];
    },

    setPosition: function (x, y) {
        if (x !== this.x || y !== this.y) {
            this.x = x;
            this.y = y;
            this.layout();
        }
    },

    getActive: function () {
        // Check for at least one active component
        var active = false;
        var componentCount = this.components.length;
        for (var i = 0; i < componentCount; i++) {
            var component = this.components[i];
            if (component && component.getActive && component.getActive()) {
                active = true;
                break;
            }
        }

        return active;
    },

    getMinimumSize: function () {
        if (!this.minimumWidth || !this.minimumHeight) {
            this.layout();
        }

        return [this.minimumWidth, this.minimumHeight];
    },

    getDesiredSize: function () {
        var minimumSize = this.getMinimumSize();
        return [this.desiredWidth || minimumSize[0], this.desiredHeight || minimumSize[1]];
    },

    getSize: function () {
        return this.getDesiredSize();
    },

    setSize: function (width, height) {
        if (!this.desiredWidth || this.desiredWidth !== width) {
            this.desiredWidth = width;
            this.layout();
        }
    },

    focused: function (key) {
        // If an entry key was supplied use that instead
        if (key) {
            var handler = this.keyPressedHandlers[key];
            if (handler) {
                handler.call(this);
            }
        } else {
            this.moveFocusDown();
        }
    },

    unfocused: function () {
        this.changeFocus(null);
    }

    // TODO: Nested focus/unfocus
};

var columnLayout = function (columns, pad, columnWidths) {
    // Determine minimum column widths and row heights
    var fixed = !!columnWidths;

    var rowHeights = [0];
    var column;
    var row = 0;

    if (!fixed) {
        columnWidths = [];
        for (column = 0; column < columns; column++) {
            columnWidths[column] = 0;
        }
    }

    var components = this.components;
    var componentCount = components.length;
    var i;
    for (column = 0, i = 0; i < componentCount; i++) {
        var component = components[i];
        var minimumSize = component.getMinimumSize();
        rowHeights[row] = Math.max(rowHeights[row], minimumSize[1]);

        if (!fixed) {
            columnWidths[column] = Math.max(columnWidths[column], minimumSize[0]);
        }

        column = (column + 1) % columns;

        if (column === 0) {
            row++;
            rowHeights[row] = 0;
        }
    }

    // Calculate total width
    var minimumWidth = 0;
    for (column = 0; column < columns; column++) {
        minimumWidth += columnWidths[column];
    }

    this.minimumWidth = minimumWidth;

    // Check for size constraints
    if (!fixed && this.desiredWidth) {
        // Add padding (or negative padding)
        var padding = (this.desiredWidth - minimumWidth) / columns;
        if (!pad && padding > 0) {
            padding = 0;
        }

        // Add padding
        for (column = 0; column < columns; column++) {
            columnWidths[column] += padding;
        }
    }

    // Layout components
    var x = this.x;
    var y = this.y;
    var rowHeight = 0;
    var totalMinimumHeight = 0;
    column = columns;
    row = -1;

    for (i = 0; i < componentCount; i++, column++) {
        if (column >= columns) {
            // Past last column; move to next row
            if (row >= 0) {
                y -= rowHeights[row];
                totalMinimumHeight += rowHeights[row];
            }

            x = this.x;
            column = 0;
            row++;

            // TODO: Special case for centered flow layout
        }

        var componentWidth = columnWidths[column];
        var component = components[i];

        // Flow layout doesn't fill the entire column
        if (!pad && !fixed) {
            var minimumSize = component.getMinimumSize();
            componentWidth = minimumSize[0];
        }

        component.setSize(componentWidth, rowHeights[row]);
        component.setPosition(x, y);
        x += componentWidth;
    }

    if (rowHeights[row]) {
        totalMinimumHeight += rowHeights[row];
    }

    this.minimumHeight = totalMinimumHeight;
};

// Flow forms
function FlowForm(columns, x, y, desiredWidth, desiredHeight, components) {
    this.columns = columns;
    Form.call(this, x, y, desiredWidth, desiredHeight, FlowForm.layout, components);
}

FlowForm.layout = function () {
    columnLayout.call(this, this.columns, false);
};

FlowForm.prototype = Object.create(Form.prototype);

function NestedFlowForm(columns, components) {
    FlowForm.call(this, columns, undefined, undefined, undefined, undefined, components);
}

NestedFlowForm.prototype = Object.create(FlowForm.prototype);

// Grid forms
function GridForm(columns, x, y, desiredWidth, desiredHeight, components) {
    this.columns = columns;
    Form.call(this, x, y, desiredWidth, desiredHeight, GridForm.layout, components);
}

GridForm.layout = function () {
    columnLayout.call(this, this.columns, true);
};

GridForm.prototype = Object.create(Form.prototype);

function NestedGridForm(columns, components) {
    GridForm.call(this, columns, undefined, undefined, undefined, undefined, components);
}

NestedGridForm.prototype = Object.create(GridForm.prototype);

// Fixed-width forms
function FixedForm(columnWidths, x, y, desiredWidth, desiredHeight, components) {
    this.columnWidths = columnWidths;
    Form.call(this, x, y, desiredWidth, desiredHeight, FixedForm.layout, components);
}

FixedForm.layout = function () {
    columnLayout.call(this, this.columnWidths.length, false, this.columnWidths);
};

FixedForm.prototype = Object.create(Form.prototype);

function NestedFixedForm(columnWidths, components) {
    FixedForm.call(this, columnWidths, undefined, undefined, undefined, undefined, components);
}

NestedFixedForm.prototype = Object.create(FixedForm.prototype);

function Choice(text, choices, choiceChanged) {
    var label = new Button(text + ': ');
    var leftArrow = new Label('< ');
    leftArrow.setColor(Button.disabledColor);
    var rightArrow = new Label(' >');
    rightArrow.setColor(Button.disabledColor);
    var itemComponent = new Label('', 'center');

    // Size item area according to largest item
    var maxItemWidth = 0;
    for (var i = 0; i < choices.length; i++) {
        itemComponent.setText(choices[i]);
        maxItemWidth = Math.max(maxItemWidth, itemComponent.getMinimumSize()[0]);
    }

    NestedFixedForm.call(this, [label.getMinimumSize()[0], leftArrow.getMinimumSize()[0], maxItemWidth, rightArrow.getMinimumSize()[0]], [label, leftArrow, itemComponent, rightArrow]);

    this.choices = choices;
    this.leftArrow = leftArrow;
    this.itemComponent = itemComponent;
    this.rightArrow = rightArrow;
    this.choiceChanged = choiceChanged;
    this.choice = choices[0];
    // TODO: Colors

    this.setIndex(0);
}

Choice.prototype = Object.create(NestedFixedForm.prototype);

Choice.prototype.setIndex = function (index) {
    this.index = index;
    this.choice = this.choices[index];

    // Update UI
    this.itemComponent.setText(this.choices[index]);
    this.leftArrow.opacity = (index === 0 ? 0 : 1);
    this.rightArrow.opacity = (index === this.choices.length - 1 ? 0 : 1);

    // Notify
    if (this.choiceChanged) {
        this.choiceChanged(this.choice);
    }
};

// TODO: select, getChoice

Choice.prototype.movedLeft = function () {
    if (this.index > 0) {
        this.setIndex(this.index - 1);
    }

    return true;
};

Choice.prototype.movedRight = function () {
    if (this.index < this.choices.length - 1) {
        this.setIndex(this.index + 1);
    }

    return true;
};

// TODO: activated, routePosition, highlights, set/getActive, mouseMoved, focused/unfocused

function FormLayer(form) {
    Layer.apply(this);
    this.form = form;
    form.setLayer(this);
    form.focused();
}

FormLayer.prototype = Object.create(Layer.prototype);

FormLayer.prototype.show = function () {
    Radius.pushLayer(this);
};

FormLayer.prototype.shown = function () {
    // TODO: Update selected item based on mouse
};

FormLayer.prototype.keyPressed = function (key, pressed) {
    // TODO: Hard-code cancellation?
    this.form.keyPressed(key, pressed);
};

FormLayer.prototype.mouseMoved = function (x, y) {
    return this.form.mouseMoved(x, y);
};

FormLayer.prototype.mouseButtonPressed = function (button, pressed, x, y) {
    return this.form.mouseButtonPressed(button, pressed, x, y);
};
