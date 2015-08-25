/*=============================================================================
    zjs/domevents.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/
$module("zjs.domevents");

$requires("zjs.core");
$requires("zjs.events");
$requires("zjs.browser");

$namespace(zjs, {

DomEventModel : $class(function () {
// private
    var _subscribe, _unsubscribe;

    if (window.addEventListener) {
        _subscribe = function (el, name, fn) {
            el.addEventListener(name, fn, false);
        };

        _unsubscribe = function (el, name, fn) {
            el.removeEventListener(name, fn, false);
        };
    } else if (window.attachEvent) {
        _subscribe = function (el, name, fn) {
            el.attachEvent("on" + name, fn);
        };

        _unsubscribe = function (el, name, fn) {
            el.detachEvent("on" + name, fn);
        };
    } else {
        _subscribe = function (el, name, fn) {
            // todo
        };

        _unsubscribe = function (el, name, fn) {
            // todo
        };
    }

    function unsubscribe (id, name, fn) {
        var el = document.getElementById(id);
        if (!el || this.dead)
            return;

        this.dead = true;
        _unsubscribe(el, name, fn);
    }

    var eventTypes = {};

    function EventType (descr) {
        this.name = descr.name;
        this.init = descr.init;
        var argMap = this.argMap = {};
        this.args = descr.args;

        if (descr.altName)
            this.altName = descr.altName;
        if (descr.altInit)
            this.altInit = descr.altInit;

        $foreach(descr.args, function (arg, etc) {
            argMap[arg] = etc.index;
        });
    }

    EventType.prototype = {
        create : function (type) {
            var msg;

            if (document.createEvent) {
                try {
                    return document.createEvent(this.name);
                } catch (e) {
                    msg = e.message;
                }

                try {
                    if (this.altName)
                        return document.createEvent(this.altName);
                } catch (e2) {
                    msg = e2.message;
                }
            } else {
                try {
                    var ev = document.createEventObject();
                    ev.type = type;
                    return ev;
                } catch (e3) {
                    msg = e3.message;
                }
            }

            $panic("Cannot create event type '" + type + "': " + msg || "Unknown error");
        },

        init : function (ev, params) {
            // Slot in the params as args to the init method:
            var args = [];
            for (var i = 0, a = this.args, n = a.length / 2; i < n; ++i) {
                var k = i*2, s = a[k];
                args[i] = (s in params) ? params[s] : a[k+1];
            }

            var fn = ev[this.init] || ev[this.altInit];
            if (!fn)
                return false;
            fn.apply(ev, args);

            // Apply any other params as properties:
            var argMap = this.argMap;
            $foreach(params, function (p, etc) {
                var s = etc.index;
                if (!(s in argMap))
                    ev[s] = p;
            });
            return true;
        }
    };

    function add (types, descr) {
        var et = new EventType(descr);

        $foreach(types, function (t) {
            eventTypes[t] = et;
        });
    }

    /*
    blur                        N 	No	UIEvent
    click                       Y 	Yes	MouseEvent
    compositionstart            Y 	Yes	CompositionEvent
    compositionupdate           Y 	Yes	CompositionEvent
    compositionend              Y 	Yes	CompositionEvent
    dblclick                    Y 	Yes	MouseEvent
    DOMActivate                 Y 	Yes	UIEvent
    DOMAttributeNameChanged     Y 	No	MutationNameEvent
    DOMAttrModified             Y 	No	MutationEvent
    DOMCharacterDataModified    Y 	No	MutationEvent
    DOMElementNameChanged       Y 	No	MutationNameEvent
    DOMFocusIn                  Y 	No	UIEvent
    DOMFocusOut                 Y 	No	UIEvent
    DOMNodeInserted             Y 	No	MutationEvent
    DOMNodeInsertedIntoDocument N 	No	MutationEvent
    DOMNodeRemoved              Y 	No	MutationEvent
    DOMNodeRemovedFromDocument  N 	No	MutationEvent
    DOMSubtreeModified          Y 	No	MutationEvent
    focus                       N 	No	UIEvent
    focusin                     Y 	No	UIEvent
    focusout                    Y 	No	UIEvent
    keydown                     Y 	Yes	KeyboardEvent
    keypress                    Y 	Yes	KeyboardEvent
    keyup                       Y 	Yes	KeyboardEvent
    mousedown                   Y 	Yes	MouseEvent
    mouseenter                  N 	Yes	MouseEvent
    mouseleave                  N 	Yes	MouseEvent
    mousemove                   Y 	Yes	MouseEvent
    mouseout                    Y 	Yes	MouseEvent
    mouseover                   Y 	Yes	MouseEvent
    mouseup                     Y 	Yes	MouseEvent
    mousewheel                  Y 	Yes	MouseWheelEvent
    resize                      Y 	No	UIEvent
    scroll                      N 	No	UIEvent
    textInput                   Y 	Yes	TextEvent
    wheel                       Y 	Yes	WheelEvent
    */
    add(["click", "dblclick", "mousedown", "mouseenter", "mouseleave", "mousemove",
         "mouseout", "mouseover", "mouseup" ],
    {
        name: "MouseEvents",
        init: "initMouseEvent",
        args: ["type", undefined, "canBubble", true, "cancelable", true, "view", window,
               "detail", 1, "screenX", 0, "screenY", 0, "clientX", 0, "clientY", 0,
               "ctrlKey", false, "altKey", false, "shiftKey", false, "metaKey", false,
               "button", 0, "relatedTarget", null ]
    });

    add(["mousewheel"],
    {
        name: "MouseWheelEvent",
        init: "initMouseEvent",
        args: ["type", undefined, "canBubble", true, "cancelable", true, "view", window,
               "detail", 1, "screenX", 0, "screenY", 0, "clientX", 0, "clientY", 0,
               "button", 0, "relatedTarget", null, "modifiersList", null, "wheelDelta", 0 ]
    });

    add([ "DOMAttrModified", "DOMCharacterDataModified", "DOMNodeInserted",
          "DOMNodeInsertedIntoDocument", "DOMNodeRemoved",
          "DOMNodeRemovedFromDocument", "DOMSubtreeModified" ],
    {
        name: "MutationEvent",
        init: "initEvent",
        args: []
    });

    add([ "blur", "DOMActivate", "DOMFocusIn", "DOMFocusOut", "focus", "focusin",
          "focusout", "resize", "scroll" ],
    {
        name: "UIEvent",
        init: "initUIEvent",
        args: ["type", undefined, "canBubble", true, "cancelable", true, "view", window,
               "detail", 0]
    });

    add(["abort", "change", "error", "load", "reset", "select", "submit", "unload"],
    {
        name: "Event",
        altName: "HTMLEvent",
        init: "initEvent",
        args: ["type", undefined, "bubbles", true, "cancelable", true]
    });
    
    add(["keydown", "keypress", "keyup"],
    {
        name: "KeyboardEvent",
        init: "initKeyboardEvent",
        altInit: "initKeyEvent",
        args: ["type", undefined, "bubbles", true, "cancelable", true, "view", window,
               "ctrlKey", false, "altKey", false, "shiftKey", false, "metaKey", false,
               "keyCode", 0, "charCode", 0]
    });

    add(["textInput"],
    {
        name: "TextEvent",
        init: "initTextEvent",
        args: []
    });

// public
return {
    /*
    Creates and initializes an event object using the given parameters.

    @param params The event parameters.
    @return The new event object.
    */
    create : function (params) {
        var type = params.type, et = eventTypes[type];
        $assert(et, "Invalid event type '", type, "'");

        var ev = et.create(type);

        if (!et.init(ev, params))
            $panic("Cannot init event type '" + type + "'");

        return ev;
    },

    fire : function (ev) {
        var el = this.getEl(ev.target);
        el.dispatchEvent(ev);

        //var obj = ev.srcElement;
        //obj.fireEvent("on" + ev.type, ev);
    },

    getEl: function (obj) {
        return obj.getEl();
    },

    subscribe : function (obj, name, fn) {
        var el = this.getEl(obj);
        _subscribe(el, name, fn);
        return { destroy: unsubscribe.head(el.id, name, fn) };
    }
};

}())

});
