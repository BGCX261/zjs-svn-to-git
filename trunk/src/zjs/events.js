/*=============================================================================
    zjs/events.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/
//! @file zjs/events.js This file adds event features to ZJS classes.

/**
@module zjs.events
@requires zjs.core
*/
$module("zjs.events");

$requires("zjs.core");

//! @namespace zjs The root namespace for ZJS.
$namespace(zjs, {

/**
This class is used to manage destroyable "child" resource objects. The objects
that fit into this category are those that need to have their destroy methods
called when the owner object's destroy method is called.

To use a Reaper, you simply construct it giving it the owner and child objects.
For example:

js:{{{
    Owner : $class({
        foo : function (x) {
            var child = { destroy: function () { $log("destroy " + x); } };
            var r = new zjs.Reaper(this, child);
            return r;
        }
    });

    var o = new Owner();
    var r1 = o.foo(1);
    var r2 = o.foo(2);
}}}

In the above example, the foo method creates a "child" object that needs to be
destroyed when "this" object (the child's owner) is destroyed, so it wraps it in
a Reaper. The Reaper is returned in case the caller of "foo" may need to destroy
the child. If the Reaper's destroy method is called, it calls "destroy" on "child"
and removes the Reaper from the owner object.

For example:

js:{{{
    zjs.destroy(o); // log gets "destroy 1" and "destroy 2"
}}}

If instead we did this:

js:{{{
    zjs.destroy(r1); // log gets "destroy 1"
    zjs.destroy(o); // log gets "destroy 2"
}}}

It is important to note that Reaper adds its own destroy method to a class that
uses it. In this example, Owner gains a destroy method. This is handled by using
$mixin, so if the class provides its own destroy method, be sure to call $super.
For example:

js:{{{
    Owner : $class({
        destroy : function () {
            $super(arguments).call(this); // important!
            // ... do stuff ...
        },

        foo : function (x)
    ...
}}}

This may not be needed by Owner, but certainly would be required if a derived
class came along. Though it might not be obvious because Owner did not explicitly
define a destroy method. This is one of those cases where a composed method is
best to always have a $super call in it (since doing so will never break).

@class Reaper
*/
Reaper : $class(function () {
// private
    function reap (o) {
        var r = o._reaper, rs = o._reapers;

        delete o._reaper;
        delete o._reapers;

        if (r)
            r.zap();
        else
            $foreach(rs, "zap");
    }

    // Each time we mixin stuff we want a clean slate and new function objects.
    function getMixin () {
        return {
            _reaper : null,
            _reapers : null,

            destroy : function () {
                reap(this);
                $super(arguments).call(this);
            }
        };
    }

    function inject (o) {
        if ("_reaper" in o)
            return;

        var T = o.getClass ? o.getClass() : o;
        $mixin(T, "Reaper", getMixin());
    }

// public
return {
    ctor : function (owner, object) {
        inject(owner);

        var o = owner;
        this.owner = owner;
        this.object = object;

        if (o._reapers) {
            o._reapers.push(this);
        } else if (!o._reaper) {
            o._reaper = this;
        } else {
            o._reapers = [ o._reaper, this ];
            delete o._reaper;
        }
    },

    destroy : function () {
        var o = this.zap();
        if (!o)
            return;

        // cleanup by removing this object from the owner object...

        if (o._reaper === this) {
            delete o._reaper;
            return;
        }

        var t = o._reapers;
        for (var i = 0, n = t ? t.length : 0; i < n; ++i) {
            if (this === t[i]) {
                t.splice(i, 1);
                return;
            }
        }
    },

    zap : function () {
        var o = this.owner;
        zjs.destroy(this.object);
        this.object = this.owner = null;
        return o;
    }
};

}()), //! @~class Reaper

/**
This interface is implemented by Event Source objects.

@interface IEventSource
*/
    /**
    This method fires an event.

    js:{{{
        this.fireEvent("myevent"); // target = this
    }}}

    @method fireEvent Fires an event with "this" as the target.
    @param name {string} The name of the event.
    */

    //--------------------

    /**
    Fires an event with the given target.

    js:{{{
        this.fireEvent("myevent", trg);
    }}}

    @method fireEvent
    @param name {string} The name of the event.
    @param target The event target.
    */

    //--------------------

    /**
    This method fires an event given its properties.

    js:{{{
        this.fireEvent({ type: "myevent", foo: 42, bar: "hello" });
    }}}

    @method fireEvent
    @param props {object} The properties of the event.
    */

    //--------------------

    /**
    When zjs.Event is used for the event object (as is the case with the
    zjs.EventModel), event objects can be fired directly.

    js:{{{
        MyEvent : $class(zjs.Event, {  // must derive from zjs.Event
            type: "myevent",

            // ...
        })

        var ev = new MyEvent({ foo: 42, bar: "hello" });
        this.fireEvent(ev); // target = this

        ev = new MyEvent({ foo: 427, bar: "world", target: trg });
        this.fireEvent(ev);
    }}}

    @method fireEvent
    @param event {Event} The event object.
    */

    //--------------------

    /**
    This method sets up one event handler on this object. For example:

    js:{{{
        object.on("eventname", this.onEventName, this, { options });
    }}}

    @method on
    @param name {string} The name of the event to which to subscribe.
    @param fn {function} The function that handles the event.
    @param? scope {object} The scope on which to call the given function.
    @param? options {object} Extra options
    @{
        @? $only The number of times to fire this event (often 1 if present).
        @? $target Only invoke the handler if the event is fired directly by the
                 target object.
    @}
    */

    //--------------------

    /**
    Sets up one or more event listeners using specified options.

    A simple example:

    js:{{{
        object.on({
            eventname : this.onEventName,
            otherevent : this.onOtherEvent,
            $this: this
        });
    }}}

    An even more flexible use case:

    js:{{{
        object.on({
            eventname : { fn: this.onEventName },
            otherevent : { fn: this.onOtherEvent },
            $this: this
        });
    }}}

    In this last use case, $this, $only and $target in an inner config
    will take precedence over those in the outer. For example:

    js:{{{
        object.on({
            eventname : { fn: this.onEventName, $this: that },
            otherevent : { fn: this.onOtherEvent, $only: 1, $target: bar },
            $this: this, // picked up by "otherevent"
            $target: foo // picked up by "eventname"
        });
    }}}

    The above is equivalent to these:

    js:{{{
        object.on({
            eventname : this.onEventName,
            $this: that,
            $target: foo
        });

        object.on({
            otherevent : this.onOtherEvent,
            $this: this,
            $only: 1,
            $target: bar
        });
    }}}

    @method on
    @param options {object} The options to setup listeners.
    @{
        @? eventname1 {function} The handler function for "eventname1". The actual
            name used is that of the desired event.
        @? eventname2 {object} The options for a listener to "eventname2". The actual
            name used is that of the desired event.
        @{
            @. fn {function} The handler function.
            @? $this The this pointer to use for the handler function. If not given,
                the $this from the outer object is used (if present).
            @? $only The number of times to fire this event (often 1 if present). If
                not given, the $only from the outer object is used (if present).
            @? $target Only invoke the handler if the event is fired directly by the
                target object. If not given, the $target from the outer object is
                used (if present).
        @}
        @? $this The this pointer to use for handler functions.
        @? $only The number of times to fire this event (often 1 if present).
        @? $target Only invoke the handler if the event is fired directly by the
                 target object.
    @}
    */

//! @~interface IEventSource

/**
This class is a base from which one can derive and provide Event Source features.

@class EventSource
@implements IEventSource
*/
EventSource : $class({
    // methods are added later using mixinEventSource below...
}), //! @~class EventSource

/**
Adds the IEventSource methods to the specified class.

@method mixinEventSource
@param T The class to which the IEventSource methods are added.
*/
mixinEventSource : function () {
    function copyIf (to, from, prop) {
        for (var i = 2, n = arguments.length; i < n; ++i)
        {
            prop = arguments[i];
            if (prop in from && !(prop in to))
                to[prop] = from[prop];
        }

        return to;
    }

    function only (fn, that, n, un) {
        return function () {
            if (--n === 0)
                un.sub.destroy();

            fn.apply(that, arguments);
        };
    }

    function targeted (fn, that, t) {
        return function (ev) {
            if (t === ev.target)
                fn.apply(that, arguments);
        };
    }

    function unsubscribe () {
        zjs.destroy(this.handlers);
        this.handlers = null;
    }

    return function (T) {
        $mixin(T, "IEventSource", {
            fireEvent : $priority(-1, function (params, target) {
                var ev, em = this.getEventModel();

                if (typeof(params) === "string") {
                    params = { type: params, target: target || this };
                    ev = em.create(params);
                } else {
                    $assert("type" in params, "Event must have a type");

                    if (!("target" in params))
                        params.target = target || this;

                    ev = (params instanceof zjs.Event) ? params : em.create(params);
                }

                em.fire(ev);
                return ev;
            }),

            getEventModel : $priority(-1, function () {
                return zjs.EventModel.getInstance();
            }),

            on : $priority(-1, function (type, fn, that, opt) {
                var ret;

                if (arguments.length == 1) {
                    var h = [], self = this, c = type; // type is really a config object
                    that = c.$this || this;

                    $foreach(c, function (p, etc) {
                        var s = etc.key, c0 = s.charAt(0);
                        if (c0 === '$')
                            return;

                        if (typeof(p) == "function")
                            h.push(self.on(s, p, that, c));
                        else
                            h.push(self.on(s, p.fn, p.$this || that,
                                           copyIf(p, c, "$only", "$target")));
                    });

                    switch (h.length) {
                        case 0: ret = null; break;
                        case 1: ret = h[0]; break;
                        default: ret = { destroy: unsubscribe, handlers: h }; break;
                    }
                } else {
                    type = type.toLowerCase();
                    that = that || (opt && opt.$this) || this;

                    var em = this.getEventModel();

                    var f, un;
                    if (opt) {
                        if (opt.$only)
                            f = fn = only(fn, that, opt.$only, un = {});
                        if (opt.$target)
                            f = fn = targeted(fn, that, opt.$target);
                    }

                    if (!f)
                        f = fn.bind(that);
                    // else, we've effectively done a bind already...

                    ret = em.subscribe(this, type, f);
                    if (un)
                        un.sub = ret;
                }

                return ret;
            })
        });
    };
}(), // mixinEventSource

/**
This interface is met by all Event objects.

@interface IEvent
*/
    /**
    Marks this Event as consumed so that no further actions are taken.

    @method consume
    */

    /**
    Returns true if this Event has been consumed. If true, no further action should be
    taken for this event.

    @method consumed
    @returns True if this Event has been consumed.
    */

//! @~interface IEvent

/**
This class is a minimal event implementation.

@class Event
@implements IEvent
*/
Event : $class({
    enableBubble: false,
    _handled: false,

    ctor : function (params) {
        zjs.copy(this, params);
    },

    consume : function () {
        this._handled = true;
    },

    consumed : function () {
        return this._handled;
    }
}), //! @~class Event

/**
This class is a simple refinement for bubbled events.

@class BubbledEvent
@extends Event
*/
BubbledEvent : $class("Event", {
    enableBubble: true
}),//! @~class BubbledEvent

/**
@interface IBasicEventModel
*/
    /**
    This method adds a subscriber for this event type to the specified object.

    @method subscribe
    @param obj The object to which the subscriber is added.
    @param type The type of the event.
    @param fn The handler method to subscribe.
    @return An object whose destroy method will unsubscribe the handler.
    */

//! @~interface IBasicEventModel

/**
@interface IEventModel
@extends IBasicEventModel
*/
    /**
    Creates and initializes an event object using the given parameters.

    @method create
    @param params The event parameters.
    @return The new event object.
    */

    /**
    This method delivers an instance of this type of event to the specified obj.
    The event's type is used to determine which subscribers will receive the event.

    @method fire
    @param ev The event object.
    */

//! @~interface IEventModel

/**
This class implements the mechanics of an event model.

@class EventModel
@implements IEventModel
*/
EventModel : $singleton(function () {
// private
    function bubbleUp (instance, ev) {
        if (!ev.enableBubble)
            return null;
        if (ev.getBubbleTarget)
            return ev.getBubbleTarget(instance);
        if (instance.getBubbleTarget)
            return instance.getBubbleTarget(ev);
        return instance.bubbleTarget;
    }

    /*
    Invokes the given handler and handles exceptions. We could perhaps use the
    technique at http://dean.edwards.name/weblog/2009/03/callbacks-vs-events/
    to make this more robust on some browsers, but this is good enough.
    */
    function invokeHandler (fn, that, ev) {
        try {
            fn.call(that, ev);
        } catch (e) {
            if (zjs.config.debug)
                $log(e.message, "error");
        }
    }

    function unsubscribe () {
        if (this.dead)
            return;

        this.dead = true;
        var h = this.sub.handlers;

        if (this.sub.busy)
            this.sub.handlers = h = h.slice(0);

        for (var i = 0, n = h.length; i < n; ++i) {
            if (h[i] === this.fn) {
                h.splice(i, 1);
                break;
            }
        }
    }

// public
return {
    create : function (params) {
        var t = params.type;
        $assert(t, "Must provide 'type' property");
        var T = params.target.$events[t];
        $assert(T, "Invalid event type '", t, "'");

        var ev = new T(params);
        return ev;
    },

    fire : function (ev) {
        var sub, t = ev.target;

        function fireOne (fn) {
            if (ev.consumed())
                $break();

            invokeHandler(fn, t, ev);
        }

        for ( ; t && !ev.consumed(); t = bubbleUp(t, ev)) {
            if (!(sub = t.subscribers && t.subscribers[ev.type]))
                continue;

            ev.currentTarget = t;

            try {
                ++sub.busy;
                $foreach(sub.handlers, fireOne);
            } finally {
                --sub.busy;
            }
        }
    },

    subscribe : function (obj, type, fn) {
        if (!obj.subscribers)
            obj.subscribers = {};

        var sub = obj.subscribers[type];
        if (!sub)
            obj.subscribers[type] = sub = { busy: 0, handlers: [] };
        else if (sub.busy)
            sub.handlers = sub.handlers.slice(0);

        var ret = { destroy: unsubscribe, sub: sub, fn: fn };

        sub.handlers.push(fn);

        return ret;
    }
};

}()), //! @~class EventModel

/**
This interface is how classes that listen to other objects provide listener cleanup.

@interface IEventHandler
*/

    /**
    @method mon
    */

//! @~interface IEventHandler

/**
This is a base class implements IEventHandler for listener cleanup.

@class EventHandler
@implements IEventHandler
*/
EventHandler : $class(
{
    // methods are added later using mixinEventHandler below...
}), //! @~class EventHandler

/**
This method adds IEventHandler support to the given class.

@method mixinEventHandler
@param T The class to which to add IEventHandler.
*/
mixinEventHandler : function () {
    function on () {
        var a = zjs.array(arguments);
        var t = a.shift(); // remove t (1st arg)

        var un = t.on.apply(t, a);

        var ret = new zjs.Reaper(this, un);
        return ret;
    }

    // We have to provide new function objects for each $mixin, but we can be
    // economical and make them very small.
    return function (T) {
        $mixin(T, "IEventHandler", {
            mon : function () {
                return on.apply(this, arguments);
            }
        });
    };
}()

}); // zjs

zjs.mixinEventSource(zjs.EventSource);
zjs.mixinEventHandler(zjs.EventHandler);

//-----------------------------------------------------------------------------
$namespace(zjs, {

/**
This plugin implements the $events tag. This plugin is designed to work with the
zjs.EventModel, but could be easily modified to delegate to the appropriate event
model for the target class if necessary.

The $events tag produces a collection of event types keyed by the event type as
a string. For example, "foo" would map to the appropriate event type for events
of type "foo".

It can be used in the following ways in class declarations:

js:{{{
    MyClass : $class({
        $events: [
            // This is a basic (non-bubbling) event.
            "foo",

            // This is a bubbling event
            "^bar"
        ]
    })
}}}

The above is equivalent to this form:

js:{{{
    MyClass : $class({
        $events: {
            foo: false,
            bar: true
        }
    })
}}}

Custom event types can be defined like so:

js:{{{
    MyClass : $class({
        $events: [
            FooEvent,
            BarEvent
        ]
    })
}}}

In the above case, FooEvent and BarEvent classes must have a "type" property in
their prototype. Like so:

js:{{{
    FooEvent : $class(zjs.Event, {
        type: "foo",
        ...
    })
}}}

An alternative method for doing this is to use the object literal form:

js:{{{
    MyClass : $class({
        $events: {
            foo: CustomEvent,
            bar: CustomEvent
        }
    })
}}}

This essentially could be rewritten like so:

js:{{{
    MyClass : $class({
        $events: [
            $class(CustomEvent, {
                type: "foo"
            }),

            $class(CustomEvent, {
                type: "bar"
            })
        ]
    })
}}}

@class EventClassPlugin
@extends ClassPlugin
*/
EventClassPlugin: $class(zjs.ClassPlugin, {
    add : function (klass, inst, name, value) {
        var B, T, t = typeof(value);

        switch (t) {
         case "boolean":
            B = value ? zjs.BubbledEvent : zjs.Event;
            break;

         case "function":
            if (value.prototype.type === name)
                T = value;
            else
                B = value;
            break;

         default:
            $panic("Invalid event type for " + name + " (" + t + ")");
        }

        if (!T) {
            T = $class(B, { type: name });
            T.type = name;
            // TODO - connect to namespace?
        }

        inst[name] = T;
    },

    expand : function (klass, value, values, index) {
        if (typeof(value) === "function") // a class
            return { name: value.prototype.type, value: value };

        $assert(typeof(value) === "string");

        var B = zjs.Event;
        if (value[0] === '^') {
            B = zjs.BubbledEvent;
            value = value.substring(1);
        }

        var T = $class(B, { type: value });
        // TODO - connect to namespace?

        return { name: value, value: T };
    },

    finish : function (klass) {
        var p = klass.prototype;
        if (("$events" in p) && !("getEventModel" in p))
            zjs.mixinEventSource(klass);
    }
}) //! @~class EventClassPlugin

}); // zjs

// Register the $events plugin with $class/$mixin:
zjs._eventClassPlugin = new zjs.EventClassPlugin("$events");
