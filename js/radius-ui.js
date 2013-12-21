/// <reference path="radius.js" />

function Label(text, alignment, textHeight, font) {
    Entity.apply(this);
    this.elements = [this.textElement = new Text(text, font || Label.font)];
    this.alignment = alignment || 'left';
    this.totalHeight = textHeight || Label.textHeight;
    var size = this.getMinimumSize();
    this.totalWidth = size[0];
}

Label.textHeight = 24;
Label.font = Label.textHeight + 'px sans-serif';
Label.prototype = Object.create(Entity.prototype);
Label.alignmentToSetX = {
    left: function (x) {
        this.x = x;
    },

    center: function (x) {
        // TODO: This sets it to the very middle, but text alignment works differently here
        var size = this.getSize();
        this.x = x + size[0] / 2;
    },

    right: function (x) {
        // TODO: Text element alignment works differently here as well
        var size = this.getSize();
        this.x = x + size[0];
    }
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
    var position = this.getPosition();
    this.setPosition(position[0], position[1]);
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
    this.textElement.color = (active ? Button.defaultColor : Button.disabledColor);
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
}

Form.defaultX = -200;
Form.defaultY = 200;
Form.defaultWidth = 400;

Form.prototype = {
    constructor: Form,

    changeFocus: function (newlyFocusedNode, event) {
        var lastFocusedNode = this.focusedNode;
        this.focusedNode = newlyFocusedNode;

        // Notify the previously-focused component that it has lost focus
        if (lastFocusedNode && lastFocusedNode.unfocused) {
            lastFocusedNode.unfocused();
        }

        // Notify the newly-focused component that it has gained focus
        if (newlyFocusedNode && newlyFocusedNode.focused) {
            newlyFocusedNode.focused(event);
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

    moveFocusUp: function (event) {
        var oldNode = this.focusedNode;
        var newNode;
        var i;

        if (oldNode) {
            i = this.getComponentIndex(oldNode);
        } else {
            // Start with the last component
            i = this.components.length;
        }

        // Iterate to next active node
        while (--i >= 0) {
            var component = this.components[i];
            if (component && component.getActive && component.getActive()) {
                newNode = component;
                break;
            }
        }

        if (newNode) {
            this.changeFocus(newNode, event);
        }

        return newNode && newNode !== oldNode;
    },

    moveFocusDown: function (event) {
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
            this.changeFocus(newNode, event);
        }

        return newNode && newNode !== oldNode;
    },

    // TODO: moveLeft/moveRight

    activate: function () {
        var handled = false;
        if (this.focusedNode && this.focusedNode.activated) {
            this.focusedNode.activated();
            handled = true;
        }

        return handled;
    },

    // TODO: keyPressed, mouseMoved, inputReceived, layout, addAtLocation

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

    focused: function (event) {
        // TODO: There is special logic for when an event is supplied...?
        this.moveFocusDown();
    },

    unfocused: function () {
        this.changeFocus(null);
    }

    // TODO: Nested focus/unfocus
};

var columnLayout = function (pad) {
    var columns = this.columns || 1;

    // Determine minimum column widths
    var columnWidths = [];
    var rowMinimumWidths = [0];
    var rowHeights = [0];
    var column;
    var row = 0;

    for (column = 0; column < columns; column++) {
        columnWidths[column] = 0;
    }

    var components = this.components;
    var componentCount = components.length;
    var i;
    for (column = 0, i = 0; i < componentCount; i++) {
        var component = components[i];
        var minimumSize = component.getMinimumSize();
        columnWidths[column] = Math.max(columnWidths[column], minimumSize[0]);
        rowMinimumWidths[row] += minimumSize[0];
        rowHeights[row] = Math.max(rowHeights[row], minimumSize[1]);
        column = column++ % columns;

        if (column === 0) {
            row++;
            rowMinimumWidths[row] = 0;
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
    if (this.desiredWidth) {
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
    column = -1;
    row = -1;

    for (i = 0; i < componentCount; i++) {
        if (column === -1 || column >= columns - 1) {
            // Last column; move to next row
            if (row >= 0) {
                y -= rowHeights[row];
                totalMinimumHeight += rowHeights[row];
            }

            x = this.x;
            column = 0;
            row++;

            // TODO: Special case for centered flow layout
        } else {
            column++;
        }

        var componentWidth = columnWidths[column];
        var component = components[i];
        component.setPosition(x, y);

        // Flow layout doesn't fill the entire column
        if (!pad) {
            var minimumSize = component.getMinimumSize();
            componentWidth = minimumSize[0];
        }

        component.setSize(componentWidth, rowHeights[row]);
        x += componentWidth;
    }

    if (rowHeights[row]) {
        totalMinimumHeight += rowHeights[row];
    }

    this.minimumHeight = totalMinimumHeight;
};

// Flow forms
function FlowForm(columns, x, y, desiredWidth, desiredHeight, components) {
    Form.call(this, x, y, desiredWidth, desiredHeight, FlowForm.layout, components)
}

FlowForm.layout = function () {
    columnLayout.call(this, false);
};

FlowForm.prototype = Object.create(Form.prototype);

function NestedFlowForm(columns, components) {
    FlowForm.call(this, columns, undefined, undefined, undefined, undefined, components);
}

NestedFlowForm.prototype = Object.create(FlowForm.prototype);

// Grid forms
function GridForm(columns, x, y, desiredWidth, desiredHeight, components) {
    Form.call(this, x, y, desiredWidth, desiredHeight, GridForm.layout, components)
}

GridForm.layout = function () {
    columnLayout.call(this, true);
};

GridForm.prototype = Object.create(Form.prototype);

function NestedGridForm(columns, components) {
    GridForm.call(this, columns, undefined, undefined, undefined, undefined, components);
}

NestedGridForm.prototype = Object.create(GridForm.prototype);

function FormLayer(form) {
    Layer.apply(this);
    this.form = form;
    form.setLayer(this);
    form.focused();
    this.keyPressed = {
        up: function (pressed) {
            if (pressed) {
                this.form.moveFocusUp();
            }
        },

        down: function (pressed) {
            if (pressed) {
                this.form.moveFocusDown();
            }
        },

        enter: function (pressed) {
            if (pressed) {
                this.form.activate();
            }
        }
    };
}

FormLayer.prototype = Object.create(Layer.prototype);

FormLayer.prototype.show = function () {
    Radius.pushLayer(this);
};

FormLayer.prototype.shown = function () {
    // TODO: Update selected item based on mouse
};
