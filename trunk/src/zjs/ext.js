/*=============================================================================
    zjs/ext.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license -- see license.txt for details]
=============================================================================*/
//! @file zjs/ext.js This file adds various extensions.

/**
@module zjs.ext
@requires zjs.core
*/
$module("zjs.ext");

$requires("zjs.core");

//! @namespace zjs
$namespace(zjs, {

/**
@class OneShotTimer
*/
OneShotTimer : $class({
    /**
    @ctor
    @param delay The number of milliseconds to delay calling the target function.
    @param fn The function to invoke.
    @param? scope The "this" context to use when calling the target method.
    @param? args The arguments to pass along to the target method.
    */
    ctor : function (delay, fn, scope, args){
        this.timerId =
            window.setTimeout(this.onTick.bind(this, fn, scope, args), delay);
    },

    destroy : function () {
        if (this.timerId === null)
            return;

        window.clearTimeout(this.timerId);
        this.timerId = null;
    },

    onTick : function (fn, scope, args) {
        if (this.timerId === null)
            return;

        this.timerId = null;

        if (args)
            fn.apply(scope, args);
        else
            fn.call(scope);
    }
}) //! @~class OneShotTimer

}); //! @~namespace zjs

/**
@class Function
*/
zjs.copy(Function.prototype, {
    /**
    Returns the full name of this function.

    @method getFullName
    @returns the full name of this function.
    */
    getFullName : function () {
        var meta = zjs.getMeta(this), s = meta.fullname, trg = meta.target;
        if (trg) {
            s += "~" + (meta.binding || "") + ">";
            if (trg instanceof Function) {
                s += trg.getFullName();
            } else if (trg instanceof Array) {
                s += "[";
                for (var i = 0, n = trg.length; i < n; ++i)
                    s += (i ? "," : "") + trg[i].getFullName();
                s += "]";
            }
        }
        if (meta.mixin)
            s += "(" + meta.mixin + ")";
        return s;
    },

    /**
    Returns the name of this function.

    @method getName
    @returns the name of this function.
    */
    getName : function () {
        return zjs.getMeta(this).name;
    },

    /**
    Binds the given object as a permanent "this" pointer to this function.
    The "this" context for each call to the returned function object is then
    passed as the 1st argument to this function.

    For example:

    js:{{{
        function foo (obj, ...) { ... }
        var bar = { ... };
        var baz = { fn : foo.bind2(bar) };
        baz.fn(4, 2); // equivalent to: foo.call(bar, baz, 4, 2);
    }}}

    @method bind2
    @param obj The object that will be the "this" pointer.
    @returns The adapter function.
    */
    bind2 : function (obj) {
        var method = this;
        var f = function () {
                var args = [this].concat(zjs.array(arguments));
                return method.apply(obj, args);
            };
        return zjs.addMeta(f, { binding : "bind2", target : method });
    },

    /**
    Creates a function that passes stored parameters to this function.

    For example:

    js:{{{
        function foo () { ... }
        var fn = foo.head("a", "b");
        fn(4, 2); // equivalent to: foo("a", "b", 4, 2);
    }}}

    @method head
    @returns The adapter function.
    */
    head : function () { // (...)
        var method = this, args = zjs.array(arguments);
        var f = function () {
                var a = zjs.arrayCat(args, arguments);
                return method.apply(this, a);
            };
        return zjs.addMeta(f, { binding : "head", target : method });
    },

    /**
    Creates a function that passes stored parameters to this function.

    For example:

    js:{{{
        function foo () { ... }
        var fn = foo.tail("a", "b");
        fn(4, 2); // equivalent to: foo(4, 2, "a", "b");
    }}}

    @method tail
    @returns The adapter function.
    */
    tail : function () { // (...)
        var method = this, last = zjs.array(arguments);
        var f = function () {
                var args = zjs.array(arguments).concat(last);
                return method.apply(this, args);
            };
        return zjs.addMeta(f, { binding : "tail", target : method });
    },

    /**
    Returns a function that returns a bound value after calling this function.

    For example:

    js:{{{
        function foo () { return "a"; }
        var fn = foo.returns(42);
        var x = fn(4, 2);  // equivalent to: foo(4, 2) but returns 42.
    }}}

    @method returns
    @param ret The value for the adapter function to return.
    @returns The adapter function.
    */
    returns : function (ret) {
        var method = this;
        var f = function () { method.apply(this, arguments); return ret; };
        return zjs.addMeta(f, { binding : "returns", target : method });
    },

    /**
    Creates a function that does not pass on its parameters to this function.

    For example:

    js:{{{
        function foo () { ... }
        var fn = foo.seal();
        fn(4, 2); // equivalent to: foo();

        fn = foo.head("a", "b").seal();
        fn(4, 2); // equivalent to: foo("a", "b");
    }}}

    @method seal
    @returns The adapter function.
    */
    seal : function () {
        var method = this;
        var f = function () { return method.apply(this); };
        return zjs.addMeta(f, { binding : "seal", target : method });
    },

    /**
    Creates a function that calls this function and 1+ other functions. All
    parameters are passed along and the return value of the last method is
    returned.

    For example:

    js:{{{
        function foo () { ...; return 42; }
        function bar () { ...; return 427; }
        function jaz () { ...; return 31415; }
        var fn = jaz.tee(foo, bar);

        var ret = fn(4, 2);

        // equivalent to:
        //    foo(4, 2);
        //    bar(4, 2);
        //    var ret = jaz(4, 2);
    }}}

    @method tee
    @returns The adapter function.
    */
    tee : function () { // (...)
        var targets = [];
        for (var i = 0, n = arguments.length; i < n; ++i)
            if (typeof(arguments[i]) === "function")
                targets.push(arguments[i]);
        n = targets.length + 1;
        if (n == 1)
            return this;
        targets.push(this);

        var f = function () {
            var ret;
            for (var i = 0; i < n; ++i)
                ret = targets[i].apply(this, arguments);
            return ret;
        };

        return zjs.addMeta(f, { binding : "tee["+n+"]", target : targets });
    },

    /**
    This method creates a buffered function that calls this function later. The
    returned function coalesces (buffers) calls across two dimensions: delivery
    time and argument capture.

    A common use for a buffered method is event handling. Especially events that
    come in batches (like mouse and keyboard events) where it makes sense to do
    some work once for the batch.

    For example:

    js:{{{
        // Call onMouseMove 50 msec after the last mouse move:
        el.onmousemove = onMouseMove.buffered(50);

        // Call onMouseMove 50 msec after the first mouse move:
        el.onmousemove = onMouseMove.buffered(-50);

        // Calls "func" 20 msec after the last call to fn passing the arguments
        // from the first call:
        var fn = func.buffered({ delay: 20, args: "first" });
    }}}

    @method buffered
    @param opts {number|object} The buffering options object or simply the delay
        in milliseconds.
    @{
        @? delay The number of milliseconds to delay calling the target function.
            While a call is pending, subsequent calls to the deferer method
            will behave based on the sign of the delay and "args" properties.

            If delay is positive, any call to the deferer during the timer
            delay will restart the timer to the full buffer delay. If the
            delay value is negative, the first call to the deferer method
            starts the timer and that determines when the target is called.

        @? args Controls which arguments are delivered when repeated calls are
            made within the timer delay. The value can be either "first" or
            "last". When "first" is specified, the arguments passed to the
            first call to the deferer are delivered when the timer expires.
            When "last" is specified (which is the default), the arguments
            passed to the last call to the deferer are delivered.
    @}
    @param scope The "this" context to pass to the target method on each call.
    @returns The adapter function.
    */
    buffered : function (opts, scope) {
        var delay = (opts !== null && typeof(opts) !== "undefined" &&
                        ((typeof(opts) === "number") ? opts : opts.delay)) || 10;
        var sooner = (delay < 0);
        var args, timerId, fn = this, first = (opts && opts.args === "first");

        delay = Math.abs(delay);

        function destroy () {
            if (timerId === null)
                return;

            window.clearTimeout(timerId);
            timerId = null;
        }

        function onTimer () {
            if (timerId === null)
                return;

            timerId = null;
            fn.apply(scope, args);
        }

        var buffered = function () {
            // If there is no timer active or we are not keeping the first args,
            // capture our arguments now:
            if (timerId === null || !first)
                args = zjs.array(arguments);

            // If we are not supposed to deliver sooner (i.e., based on our first
            // call), kill our timer:
            if (timerId !== null && !sooner) {
                window.clearTimeout(timerId);
                timerId = null;
            }

            // If there is (now) no timer active, start it up:
            if (timerId === null)
                timerId = window.setTimeout(onTimer, delay);

            return { destroy: destroy };
        };

        zjs.addMeta(buffered, { binding : "buffered", target : fn });

        return buffered;
    },

    /**
    This method creates a function that calls this function later. Every call to
    the returned function captures its arguments and calls setTimeout for the
    specified delay. When the timer fires, the target function is called given
    the stored arguments.

    A common use for a delayed method is event handling.

    @method delayed
    @param delay The number of milliseconds to delay calling the target function.
    @param scope The "this" context to pass to the target method on each call.
    @returns The adapter function.
    */
    delayed : function (delay, scope) {
        var fn = this;

        var delayed = function () {
            return fn.later(delay, scope, zjs.array(arguments));
        };

        zjs.addMeta(delayed, { binding : "delayed", target : fn });

        return delayed;
    },

    /**
    This method calls this function later.

    For example:

    js:{{{
        func.later(10); // call func 10 msec from now

        this.func.later(10, this); // call this.func 10 msec from now

        this.func.later(10, this, [1,2]); // call this.func(1,2) 10 msec from now
    }}}

    @method later
    @param? delay The number of milliseconds to delay calling the target function. If
        not specified, 10 milliseconds is assumed.
    @param? scope The "this" context to use when calling the target method.
    @param? args The arguments to pass along to the target method.
    @return A zjs.OneShotTimer object that will kill the timer if destroyed.
    */
    later : function (delay, scope, args) {
        return new zjs.OneShotTimer(delay || 10, this, scope, args);
    }
});

/**
Returns the names of the arguments to this function.

js:{{{
    function foo (x, y) { ... }

    var a = foo.getArgumentNames();

    // a = ["x", "y"]
}}}

NOTE: This does not work with Rhino.

@method getArgumentNames
@returns {string[]} The names of the arguments to this function.
*/
(function (fp) {
    var regex = /^[\s\(]*function[^(]*\(([^\)]*)\)/, spaces = /\s+/g;

    function getArgumentNames () {
        var names = this.toString().match(regex)[1].replace(spaces, "").split(',');
        return names.length === 1 && !names[0] ? [] : names;
    }

    function test (s) {
        var ret = getArgumentNames.call(test);
        return ret && ret.length === 1 && ret[0] === 's';
    }

    if (test())
        fp.getArgumentNames = getArgumentNames;

})(Function.prototype);
//! @~class Function

//=============================================

$namespace(zjs,{ //! @namespace zjs

/**
Returns a function for use in Array.sort that compares a property on each element.

js:{{{
    var fn = zjs.getComparer("name");
    var array = [ { name: "xyz" }, { name: "abc" } ];
    array.sort(fn);
}}}

@method getComparer
@param prop The property to compare.
@returns {function} The comparison function.
@(
    @. lhs The left-hand side of the comparison.
    @. rhs The right-hand side of the comparison.
    @returns 0 if lhs==rhs, -1 if lhs < rhs and 1 if lhs > rhs.
@)
*/
getComparer: function (prop) {
    return function (lhs, rhs) {
        var v1 = lhs[prop], v2 = rhs[prop];
        if (v1 < v2)
            return -1;
        if (v2 < v1)
            return 1;
        return 0;
    };
},

/**
Returns a function that sorts an array using a property on each element.

js:{{{
    var sort = zjs.getSorter("name");
    var array = [ { name: "xyz" }, { name: "abc" } ];
    sort(array);
}}}

@method getSorter
@param prop The property to compare.
@returns {function} The sorter function.
@(
    @. array The array to sort.
    @returns The array
@)
*/
getSorter: function (prop) {
    var cmp = zjs.getComparer(prop);
    return function (array) {
        array.sort(cmp);
        return array;
    };
},


/**
Sorts the given array by the specified property on each element.

js:{{{
    var array = [ { name: "xyz" }, { name: "abc" } ];
    zjs.sortBy(array, "name");
}}}

@method sortBy
@param array The array to sort.
@param prop The property to compare.
@returns The array.
*/
sortBy: function (array, prop) {
    var cmp = zjs.getComparer(prop);
    array.sort(cmp);
    return array;
},

/**
This class manages a keyed collection that also maintains insertion order. Methods are
provided to detect duplicate keys and lookup failures.

{{{
                                        items[]
                                        +--+
    pk.map = {                        0 !  !--> obj1
        obj1[pk.key]: 0,                +--+
        obj2[pk.key]: 1,              1 !  !--> obj2
        ...,                            +--+
        obj6[pk.key]: 5               2 !  !--> obj3
    };                                  +--+
                                      3 !  !--> obj4
    uk.map = {                          +--+
        obj1[uk.key]: obj1,           4 !  !--> obj5
        ....                            +--+
    };                                5 !  !--> obj6
                                        +--+
    nuk.map = {
        obj1[nuk.key]: [obj1, obj2],
        obj3[nuk.key]: [obj3],
        ...
    };
}}}

@class Bag
*/
Bag : $class(function (Bag) {
    // this = Index
    function addToIndex (item, index) {
        var key = this.getKey(item);
        if (zjs.isUndef(key))
            return;

        if (key in this.map) {
            $assert(!this.unique, this.bag.dupKeyMsg," (",this.key,"): ",key);
            this.map[key].push(item);
        } else if (this.primary) {
            this.map[key] = index;
        } else if (this.unique) {
            this.map[key] = item;
        } else {
            this.map[key] = [item];
        }
    }

    // this = Index
    function deleteFromIndex (item) {
        var key = this.getKey(item);
        if (!this.unique) {
            var d = this.map[key];
            for (var i = 0, n = d.length; i < n; ++i) {
                if (d[i] === item) {
                    d.splice(i, 1);
                    if (d.length)
                        return;
                    break;
                }
            }
        }

        delete this.map[key];
    }

    // this = Bag
    function rollback (added, item, failedIndex) {
        for (var i = failedIndex; i-- > 0; )
            deleteFromIndex.call(this.indexes[i], item);

        $foreach(added, function (it) {
            for (var k = 0, n = this.indexes.length; k < n; ++k)
                deleteFromIndex.call(this.indexes[k], it);
        }, this);
    }

    function selfKey (item) {
        return item;
    }

    return {
        /**
        The config property contains the names of the fields on which to index items. This
        can be either a string[] of field names or an object with properties named by index
        name and values of the field name.

        js:{{{
            var bag = new zjs.Bag({
                indexBy: ["name"]
            });;

            //...
            var item = bag.name.get("foo"); // get item with name property = "foo"

            bag = new zjs.Bag({
                indexBy: { byName: "name" }
            });;

            //...
            var item = bag.byName.get("foo"); // get item with name property = "foo"
        }}}

        @cfg indexBy
        */

        /**
        The error message text when a duplicate key is added.
        @cfg dupKeyMsg
        */
        dupKeyMsg: "Duplicate key",

        /**
        The error message text when an item is not found.
        @cfg notFoundMsg
        */
        notFoundMsg: "Item not found",

        /**
        Initializes and configures this instance. All properties on the given config object
        are copied onto this object.

        @ctor
        @param cfg The configuration object to copy onto this object.
        */
        ctor : function (cfg) {
            if (typeof(cfg) === "string") {
                cfg = { indexBy: cfg };
            }

            zjs.copy(this, cfg);

            this.items = [];
            this.indexes = [];

            var by = this.indexBy;

            if (!by) {
                this.pk = this.newIndex({
                    getKey: selfKey
                });
            } else if (zjs.isString(by)) {
                this.pk = this.newIndex(by);
            } else if (zjs.isArray(by)) {
                $foreach(by, function (field) {
                    this.newIndex(field);
                }, this);

                if (!this.pk)
                    this.pk = this.indexes[0];
            } else {
                $foreach(by, function (field, etc) {
                    this.newIndex(field, etc.key);
                }, this);

                $assert(this.pk);
            }

            $assert(this.pk.unique);
            this.pk.primary = true;
        },

        /**
        Adds an item to this collection.

        @method add
        @param item The item to add.
        @returns {Bag} This object (to chain method calls).
        */
        add : function (item) { //, item2, ...
            var pos = this.items.length;
            if (arguments.length < 2)
                return this.insert(pos, item);

            var args = Array.prototype.slice.call(arguments, 0);
            args.unshift(pos);
            return this.insert.apply(this, args);
        },

        /**
        This method clears the contents of this bag.

        @method clear
        @returns {Bag} This object (to chain method calls).
        */
        clear : function () {
            this.items = [];

            $foreach(this.indexes, function (index) {
                index.clear();
            });
            return this;
        },

        /**
        This method returns true if the given item is contained in this bag.

        @method contains
        @param item The item to check.
        @returns {bool} True if the given item is contained in this bag.
        */
        contains : function (item) {
            var index = this.indexOf(item);
            return index >= 0;
        },

        /**
        This method returns the number of items in this bag.

        @method count
        @returns The number of items in this bag.
        */
        count : function () {
            return this.items.length;
        },

        /**
        This method calls the specified function for each item in this bag.

        @method each
        @param fn {function} The function to call
        @(
            @. value The current value being iterated.
            @. etc An object containing other useful information passed to each call.
            @{
                @. key The current index being iterated.
                @. index The current index being iterated.
                @. value The value returned from the last call of fn (starts as undefined).
                @. $break A boolean that can be set to true to end the loop.
            @}
            @returns The value to store in etc.value and/or return from $foreach or $break.
        @)
        @param? scope The object scope ("this" pointer) to pass to fn function (not name).
        @returns The last value returned by fn or passed to $break.
        */
        each : function (fn, scope) {
            return $foreach(this.items, fn, scope);
        },

        /**
        This method returns true if this bag is empty.

        @method empty
        @returns True if this bag is empty.
        */
        empty : function () {
            return !this.items.length;
        },

        /**
        This method returns the index of the given item or -1 if not present.

        @method indexOf
        @param item The item to find.
        @returns the index of the given item or -1 if not present.
        */
        indexOf : function (item) {
            var pk = this.pk, key = pk.getKey(item);
            return pk.indexOf(key);
        },

        /**
        This method inserts a number of items at the specified position.

        @method insert
        @param pos The position at which to insert the items.
        @param item The first item to insert at the given position.
        @returns {Bag} This object (to chain method calls).
        */
        insert : function (pos, item) { //, item2, item3, ...
            $assert(0 <= pos && pos <= this.items.length, "Invalid position: ", pos);
            var args = [pos, 0], i, n = this.indexes.length;

            try {
                for (var k = 1, m = arguments.length; k < m; ++k, ++pos) {
                    item = arguments[k];
                    for (i = 0; i < n; ++i)
                        addToIndex.call(this.indexes[i], item, pos);
                    args.push(item);
                }

                this.items.splice.apply(this.items, args);
                this.pk.markDirty(pos);
            } finally {
                if (i && i < n) // if (index error)
                    rollback.call(this, args.slice(2), item, i);
            }

            return this;
        },

        /**
        This method creates a new Index on this bag.

        @method newIndex
        @param cfg {string|object} The name or the config for the new Index.
        @param? name The name of the index.
        @returns The new Index object.
        */
        newIndex: function (cfg, name) {
            if (zjs.isString(cfg)) {
                cfg = { key: cfg, name: name || ("by" + cfg.capitalize()) };
            } else if (!cfg.name) {
                var s = name || cfg.key;
                if (s)
                    cfg.name = s;
            }

            cfg.bag = this;
            var index = new Bag.Index(cfg);

            this.indexes.push(index);
            if (index.name) {
                $assert(!(index.name in this));
                this[index.name] = index;
            }

            if (index.primary) {
                $assert(!this.pk);
                this.pk = index;
            }

            return index;
        },

        /**
        This method returns true if the item was found (and removed), false if not.

        @method remove
        @param item The item to remove from this bag.
        @returns True if the item was found (and removed), false if not.
        */
        remove : function (item) {
            var index = this.indexOf(item);
            if (index < 0)
                return false;
            this.removeAt(index, 1);
            return true;
        },

        /**
        This method removes a number of items at the given position.

        @method removeAt
        @param pos The position at which to remove elements.
        @param count The number of items to remove.
        @returns {Bag} This object (to chain method calls).
        */
        removeAt : function (pos, count) {
            var i, items = this.items, n = items.length, k = Math.min(count, n - pos);
            if (pos < 0 || k < 1)
                return 0;

            $foreach(this.indexes, function (index) {
                for (i = 0; i < k; ++i) {
                    var item = items[pos+i];
                    deleteFromIndex.call(index, item);
                }
            });

            items.splice(pos, k);

            this.pk.markDirty(pos);
            return this;
        },

        /**
        This method removes the item with the matching primary key and returns the item.
        If the primary key was not found, null is returned.

        @method removeKey
        @param key The primary key of the item to remove.
        @returns The removed item or null if not found.
        */
        removeKey : function (key) {
            var index = this.pk.indexOf(key);
            if (index < 0)
                return null;
            var ret = this.items[index];
            this.removeAt(index, 1);
            return ret;
        },

        /**
        This class manages key lookup

        @class Index
        */
        Index : $class({
            primary: false,
            unique: true,

            ctor : function (cfg) {
                zjs.copy(this, cfg);
                $assert(this.unique || !this.primary, "Primary keys must be unique");

                this.map = {};
            },

            clear: function () {
                this.map = {};
                delete this.dirty;
            },

            contains : function (key) {
                return key in this.map;
            },

            each : function (key, fn, scope) {
                this.sync();
                var v = this.map[key];
                if (v || this.contains(key)) {
                    if (this.primary)
                        v = this.bag.items[v];
                    if (this.unique)
                        v = [v];

                    return $foreach(v, fn, scope);
                }

                return undefined;
            },

            find : function (key) {
                this.sync();
                var v = this.map[key];

                if (v || this.contains(key))
                    if (this.primary)
                        v = this.bag.items[v];

                return v;
            },

            get : function (key) {
                this.sync();
                var v = this.map[key];
                $assert(v || this.contains(key), this.bag.notFoundMsg, ": ", key);
                return v;
            },

            getKey : function (item) {
                var key = item[this.key];
                return key;
            },

            indexOf : function (key) {
                this.sync();
                var v = this.map[key];

                if (!v && !this.contains(key)) {
                    v = this.unique ? -1 : null;
                } else if (!this.unique) {
                    var t = [];
                    for (var i = 0, n = v.length; i < n; ++i)
                        t[i] = this.bag.indexOf(v[i]);
                    v = t;
                } else if (!this.primary) {
                    v = this.bag.indexOf(v);
                }

                return v;
            },

            markDirty : function (pos) {
                $assert(this.primary);
                var d = this.dirty;
                this.dirty = zjs.isUndef(d) ? pos : Math.min(pos, d);
            },

            sync : function () {
                var d = this.dirty;
                if (zjs.isUndef(d))
                    return;

                for (var m=this.map, items=this.bag.items, n=items.length; d < n; ++d) {
                    var item = items[d], key = this.getKey(item);
                    m[key] = d;
                }

                delete this.dirty;
            }
        }) //! @~class Index
    };
}) //! @~class Bag

}); // zjs
$namespace(zjs, {

/**
@class EmptyBag
*/
EmptyBag : $singleton(zjs.Bag, function () {
    var created;
    return {
        ctor: function () {
            $super(arguments).call(this);
            created = true;
        },

        insert : function (pos, item) { //, item2, item3, ...
            $panic("Cannot add to EmptyBag");
        },

        newIndex: function (cfg, name) {
            $assert(!created, "Cannot add Index to EmptyBag");
            return $super(arguments).apply(this, arguments);
        },

        removeAt : function (pos, count) {
            $panic("Cannot remove from EmptyBag");
        }
    };
}) //! @~class EmptyBag

}); //! @~namespace zjs
