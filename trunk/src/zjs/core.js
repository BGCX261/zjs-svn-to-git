/*=============================================================================
    zjs/core.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/
//! @file zjs/core.js This file contains the core of ZJS.

/**
@module zjs.core
*/

/*global zjs: true */

/**
Logs a message to the console or stores it to an internal buffer. Without the
console, these message can only be read in a debugger (like Visual Studio). This
is done by inspecting "$log.out". The maximum number of messages is configurable
by setting "$log.limit" (the default is 1000).

@method $log
@param msg The message to log.
@param type The log level (e.g., "info" or "warn").
*/
function $log (msg, type) {
    var t = type || "info";
    if (typeof(console) === "undefined") {
        var b = $log.out;
        if (!b)
            $log.out = b = [];
        if (b.length >= $log.limit)
            b.splice(0, $log.limit / 4); // drop 25%
        b.push(t.toUpperCase() + ": " + msg);
    } else if (t in console) {
        console[t](msg);
        if (console.open)
            console.open();
    }
}

$log.limit = 1000;

/**
Wraps the given message (msg) in an Error object and throws it. By default, the
type of object is assumed to be Error, unless the 2nd parameter is supplied to
override that default.

@method $throw
@param msg The message to wrap in the error object.
@param type The type of error object. Default is Error.
@throws Always throws an Error or the given type.
*/
function $throw (msg, type) {
    var T = type || Error;
    var e = new T(msg);
    if (!e.message)
        e.message = msg; // IE prefers "description"
    throw e;
}

/**
Alerts and/or logs a panic message. These are always "bad" things, so it is a
good idea to set a break point on the first line.

@method $panic
@param msg The message to display.
@? fragment1 Any number of additional components of the message to join.
*/
function $panic (msg) {
    var s = (arguments.length > 1) ? Array.prototype.slice.call(arguments, 0).join("")
                : msg;
    $log("Error: " + s, "error");
    $throw(msg);
}

/**
Asserts that the given condition is true. If not, an exception is thrown. The
arguments beyond the first, if any, are concatenated into an error message. It
is a good idea to pass several string fragments instead of passing one already
built since the assert may not fire and the message not be needed.

@method $assert
@param cond The boolean condition to test (that should be true).
@returns The cond object passed (if truthy).
@throws An error if the cond is falsey.
*/
function $assert (cond /*, fragment1, fragment2, ... */) {
    if (cond)
        return cond;

    var s = (arguments.length > 1) && Array.prototype.slice.call(arguments, 1).join("");
    return $panic(s || "Assert failed!");
}

/**
This method evaluates its argument and returns the result. This is a global
method to ensure no local symbols are included in the scope chain that might
create problems with the evaluated text. This is not a perfect "eval at global
scope", but it is close enough.

@method $eval
@. js The code fragment to evaluate.
*/
function $eval () {
/*jslint evil: true */
    return eval(arguments[0]);
}
/*jslint evil: false */

//---------------

/**
Breaks from a $foreach loop and returns a value.

@method $break
@param val The return value of $foreach.
*/
function $break (val) {
    return { $break: $break, value: val };
}

$break.decode = function (ret, etc) {
    if (ret === $break) {
        etc.$break = true;
    } else if (ret && ret.$break === $break) {
        etc.value = ret.value;
        etc.$break = true;
    } else {
        etc.value = ret;
    }
};

/**
Iterates over an object or array-like collection, calling a method for each item.

The simplest usage looks like this:

js:{{{
    $foreach([1, 2, 3, 4], function (x) {
        // called with x=1, x=2, x=3 and x=4
    });
}}}

To preserve the "this" pointer, pass the scope parameter:

js:{{{
    $foreach([1, 2, 3, 4], function (x) {
        // called with this and x=1, x=2, x=3 and x=4
    }, this);
}}}

To end the loop early, there are a few alternatives:

js:{{{
    $foreach([1, 2, 3, 4], function (x) {
        if (x == 3)
            return $break(42);
        // more code
    });

    $foreach([1, 2, 3, 4], function (x) {
        if (x == 3)
            return $break;
        // more code
    });

    $foreach([1, 2, 3, 4], function (x, etc) {
        if (x == 3)
            etc.$break = true;
        // more code
    });
}}}

The first use of $break exits the loop immediately and returns its argument (42) from
$foreach. The second alternative breaks the loop and $foreach returns the value most
recently returned by the functin.

This can generate warnings (JSLint or IDE) if not all of the control paths in the
function return a value. The last alternative simply flags the loop in $foreach to
break. The downside here is that the "more code" will be run unless an "else" or "return"
is also added.

There are a couple ways to pass data from the loop back to the outside (other
than standard closure techniques). For starters, the return value of $foreach
is the value last returned by the function (unless the function returns $break).
For example:

js:{{{
    var v = $foreach([1, 2, 3, 4], function (x) {
        return x;
    });

    // v == 4
}}}

Also, $break can optionally set the return value:

js:{{{
    var v = $foreach([1, 2, 3, 4], function (x) {
        if (x == 3)
            return $break;
        return x;
    });

    // v == 2 (last value returned up to $break)

    var v = $foreach([1, 2, 3, 4], function (x) {
        if (x == 3)
            return $break(42);
        return x;
    });

    // v == 42
}}}

The previous iteration return value is supplied in the "etc" argument to the given
function. On the first call, this value is undefined. For example:

js:{{{
    var v = $foreach([1, 2, 3, 4], function (x, etc) {
        return x + (etc.value || 0);
    });

    // v == 10 (1+2+3+4)
}}}

As a convenience, if the function is a string, that string is assumed to be the
name of a method on each element. That is, the following:

js:{{{
    $foreach([obj1, obj2], "foo");
}}}

Is equivalent to:

js:{{{
    $foreach([obj1, obj2], function (obj) {
        if (obj.foo)
            obj.foo();
    });
}}}

The options object provides control over the looping.

For example:

js:{{{
    var s = $foreach(["a","b","c","d","e"], { begin:1, end:4, delta:2, value:"_" },
        function (v, etc) {
            return etc.value + v;
        });

    // s = "_bd"
}}}

Since all of the properties have a default value, not all must be passed:

js:{{{
    var s = $foreach(["a","b","c","d","e"], { begin:1, end:4, value:"_" },
        function (v, etc) {
            return etc.value + v;
        });

    // s = "_bcd"

    var s = $foreach(["a","b","c","d","e"], { begin:1 }, function (v, etc) {
        return (etc.value || "") + v;
    });

    // s = "_bcde"
}}}

If the "fn" parameter is a string (method name), the options object can also
provide an "args" property. That is:

js:{{{
    $foreach([obj1, obj2], { args: [1, 2] }, "foo");
}}}

Is equivalent to:

js:{{{
    $foreach([obj1, obj2], function (obj) {
        if (obj.foo)
            obj.foo(1, 2);
    });
}}}

@method $foreach
@param it The sequence overwhich to iterate.
@param? opt Options that control the iteration.
@{
    @? begin The begin index for the iteration (default = 0).
    @? end The end index for the iteration (default = length).
    @? delta The number of slots in the array to skip (default = 1).
    @? value The initial value to pass to fn (default = undefined).
    @? args The arguments to pass to each function (only if fn is a method name).
@}
@param fn The function to call for each iteration or the method name on the object.
@(
    @. value The current value being iterated.
    @. etc An object containing other useful information passed to each call.
    @{
        @. array True if the iteration is over an array.
        @. key The name of the current element (same as index for an array).
        @. index The current index being iterated.
        @. value The value returned from the last call of fn (starts as undefined).
        @. $break A boolean that can be set to true to end the loop.
    @}
    @returns The value to store in etc.value and/or return from $foreach or $break.
@)
@param? scope The object scope ("this" pointer) to pass to fn function (not name).
@returns The last value returned by fn or passed to $break.
*/
function $foreach (it, opt, fn, scope) {
    if (!it)
        return undefined;

    switch (arguments.length) {
        case 3: // $foreach(it, fn, scope) or $foreach(it, opt, fn)
            var tfn = typeof(fn);
            if (tfn !== "function" && tfn !== "string") {
                scope = fn;
                fn = opt;
                opt = undefined;
            }
            break;
        case 2: // $foreach(it, fn)
            fn = opt;
            opt = undefined;
            break;
    }

    opt = opt || zjs.emptyObj;

    if (zjs.isString(fn)) {
        var fname = fn, args = opt.args;
        fn = function (el) {
            var f = el[fname];
            if (!f)
                return;
            if (args)
                f.apply(el, args);
            else
                f.call(el);
        };
    }

    var array = zjs.isArrayLike(it), n, etc = {array: array, $break: false, index: 0};
    var ret;

    if (array) {
        var add = opt.delta || 1;
        n = opt.begin || 0;
        etc.value = opt.value;

        if ("end" in opt) {
            for ( ; n < opt.end && !etc.$break; ++etc.index, n += add) {
                ret = fn.call(scope, it[etc.key = n], etc);
                $break.decode(ret, etc);
            }
        } else { // it.length may change, so don't cache it...
            for ( ; n < it.length && !etc.$break; ++etc.index, n += add) {
                ret = fn.call(scope, it[etc.key = n], etc);
                $break.decode(ret, etc);
            }
        }
    } else if (zjs.config.useOwn) {
        for (n in it) {
            if (zjs.hasOwn(it, n)) {
                ++etc.index;
                ret = fn.call(scope, it[etc.key = n], etc);
                $break.decode(ret, etc);
                if (etc.$break)
                    break;
            }
        }
    } else {
        for (n in it) {
            ++etc.index;
            ret = fn.call(scope, it[etc.key = n], etc);
            $break.decode(ret, etc);
            if (etc.$break)
                break;
        }
    }

    return etc.value;
}

/**
@method $foreach_sorted
@param it The sequence overwhich to iterate.
@param? opt Options that control the iteration.
@{
    @? begin The begin index for the iteration (default = 0).
    @? end The end index for the iteration (default = length).
    @? delta The number of slots in the array to skip (default = 1).
    @? value The initial value to pass to fn (default = undefined).
    @? args The arguments to pass to each function (only if fn is a method name).
@}
@param fn The function to call for each iteration or the method name on the object.
@(
    @. value The current value being iterated.
    @. etc An object containing other useful information passed to each call.
    @{
        @. array True if the iteration is over an array.
        @. key The name of the current element (same as index for an array).
        @. index The current index being iterated.
        @. order The original (unsorted) index of the item being iterated.
        @. value The value returned from the last call of fn (starts as undefined).
        @. $break A boolean that can be set to true to end the loop.
    @}
    @returns The value to store in etc.value and/or return from $foreach or $break.
@)
@param? scope The object scope ("this" pointer) to pass to fn function (not name).
@returns The last value returned by fn or passed to $break.
*/
function $foreach_sorted (it, opt, fn, scope) {
    if (!it)
        return undefined;

    switch (arguments.length) {
        case 3: // $foreach_sorted(it, fn, scope) or $foreach_sorted(it, opt, fn)
            var tfn = typeof(fn);
            if (tfn !== "function" && tfn !== "string") {
                scope = fn;
                fn = opt;
                opt = undefined;
            }
            break;
        case 2: // $foreach_sorted(it, fn)
            fn = opt;
            opt = undefined;
            break;
    }

    opt = opt || zjs.emptyObj;
    var array = zjs.isArrayLike(it), etc = { array: array, $break: false };
    var a = [], i = 0, n, t, ret, cmp;

    if (array) {
        var add = opt.delta || 1;

        for (var k = opt.begin || 0, end; k < end; n += add) {
            a.push([k, it[k], i++]);
        }

        cmp = opt.cmp ? function (lhs, rhs) {
                            return opt.cmp(lhs[1], rhs[1]);
                        }
                        : $foreach_sorted.compare1;
    } else {
        if (zjs.config.useOwn) {
            for (n in it) {
                if (zjs.hasOwn(it, n))
                    a.push([n, it[n], i++]);
            }
        } else {
            for (n in it) {
                a.push([n, it[n], i++]);
            }
        }

        cmp = $foreach_sorted.compare0;
    }

    a.sort(cmp);

    for (i = 0, n = a.length; i < n && !etc.$break; ++i) {
        t = a[i];
        etc.index = i;
        etc.order = t[2];
        etc.key = t[0];
        ret = fn.call(scope, t[1], etc);
        $break.decode(ret, etc);
    }

    return etc.value;
}

$foreach_sorted.compare = function (a, b) {
    return (a < b) ? -1 : ((b < a) ? 1 : 0);
};

$foreach_sorted.compare0 = function (a, b) {
    return $foreach_sorted.compare(a[0], b[0]);
};

$foreach_sorted.compare1 = function (a, b) {
    return $foreach_sorted.compare(a[1], b[1]);
};

//---------------

/*global $lookup: true */

/**
Ensures that a namespace exists and adds the given members to it.

Examples:

js:{{{
    // Ensure the "nspace" exists and "sub" exists in nspace:
    $namespace("nspace.sub");

    // Assuming that "nspace" exists, ensure that "sub" exists in nspace:
    $namespace(nspace, "sub");

    // Ensure the "nspace" exists and "sub" exists in nspace and add to it:
    $namespace("nspace.sub", {
        ...
    });

    // Assuming that "nspace" exists, ensure that "sub" exists in nspace and
    // add to it:
    $namespace(nspace, "sub", {
        ...
    });

    // Adds members to the existing namespace nspace.sub:
    $namespace(nspace.sub, {
        ...
    });
}}}

When members are added to the namespace, the members are contained in an object.
The names of the properties of that object are the names to add to the target
namespace.

Specially named members are interpreted as conditional members. These are of the
form "?expr" or "=expr" where the "expr" part is evaluated (using $eval).

For boolean conditional members (begining with "?") the evaluated condition will
determine if the associated value is included. For selection conditional members
(begining with "="), the value of the expression is used to select a member of
the value as the value to include.

For example:

js:{{{
    $namespace(foo, {

    "?zjs.browser.ie" : {
        bar : function () { ... },
        bif : function () { ... }
    }

    });
}}}

The above will add "bar" and "bif" to the "foo" namespace when "zjs.browser.ie"
evaluates true. Boolean conditional members whose values are functions (and whose
expressions evaluate true) are executed and their return value is added to values.

For example:

js:{{{
    $namespace(foo, {

    "?zjs.browser.ie" : function () {
        function helper () { ... }

        return {
            bar : function () { ... },
            bif : function () { ... }
        };
    } // not called here!

    });
}}}

The above idiom is commonly used to create a scope to which only "bar" and "bif"
have access. In other circumstances, this anonymous function is called inline to
return its object. While this will work, it is wasteful in this case because the
function need only be called when the expression is true. Since a function object
would not be an appropriate value in this case, the decision to call the function
should not create any surprises.

For selection conditional members, the value of the expression determines which
member is selected. For example:

js:{{{
    $namespace(foo, {

    "=zjs.browser.engine" : {
        msie : {
            bar : function () { ... },
            bif : function () { ... }
        },
        gecko : {
            bar : function () { ... },
            bif : function () { ... }
        },
        webkit : {
            bar : function () { ... },
            bif : function () { ... }
        },
        "*" : {
            bar : function () { ... },
            bif : function () { ... }
        }
    }

    });
}}}

The selection expression value is processed by first looking for a property of
the expression value, or basically, "value[eval(expr)]". If that property is not
a member of the object, the "*" member is used (if present). Essentially, the
"*" member is the default cause of the "switch".

As with the boolean conditional member, if the value of the property is a function,
it is called. For example:

js:{{{
    $namespace(foo, {

    "=zjs.browser.engine" : {
        msie : function () {
            return {
                bar : function () { ... },
                bif : function () { ... }
            };
        },
        gecko : function () {
            return {
                bar : function () { ... },
                bif : function () { ... }
            };
        },
        webkit : function () {
            return {
                bar : function () { ... },
                bif : function () { ... }
            };
        },
        "*" : function () {
            return {
                bar : function () { ... },
                bif : function () { ... }
            };
        }
    }

    });
}}}

@method $namespace
@param? ns {object} The parent namespace.
@param? sub {string} The name of the sub-namespace.
@param? mem {object} The members to add to the (possibly new) namespace.
*/
function $namespace (ns, sub, mem) { // forms #4 & #5
    if (typeof(ns) == "string") // forms #2 & #3
        {mem = sub;sub = ns;ns = $namespace.global;}
    else if (typeof(sub) != "string") // form #1
        {mem = sub;sub = null;}

    var parts = sub ? sub.split(".") : [];
    for (var i = 0; i < parts.length; ++i) {
        var s = parts[i], fn = ns.$meta.fullname;
        if (!ns[s])
            ns.$meta.subNamespaces.push(ns[s] =
                {$meta : {subNamespaces : [], name : s, preAdd : $namespace.preAdd,
                            namespace : ns, fullname : fn ? (fn + "." + s) : s}});
        ns = ns[s];
    }

    if (!(mem = $namespace.expandMembers(mem, ns)))
        return;

    parts = [];
    $assert(!ns.$meta.pending);
    ns.$meta.pending = mem;
    ns.$meta.adding = {};

    try {
        for (var name in mem)
            if (!$namespace.isConditional(mem, name, parts))
                $lookup(ns, name);
    } finally {
        ns.$meta.adding = ns.$meta.pending = null;
    }

    for (i = 0; i < parts.length; ++i)
        $namespace(ns, parts[i]); // form #1
}

/*
Advise the given object of namespace connection. Several tests are made to be
sure the time is right for the notification. Once an object has been advised, it
is assumed that "$meta.namespace" will be set and hence it is safe to call this
method again and no further work will be done.

Returns the value of v or that of v.$namespaceConnect.
*/
$namespace.connect = function (ns, name, v) {
    var vm = v && v.$meta, nm = ns && ns.$meta;
    if (vm && nm && "namespace" in nm && !("namespace" in vm) && v.$namespaceConnect)
        v = v.$namespaceConnect(ns, name) || v;
    return v;
};

/*
Expands the given function by calling it to get the members.
*/
$namespace.expandMembers = function (members, arg) {
    var t = typeof(members);
    var r = (t === "function") ? members(arg) : members;
    return r;
};

/*global zjs: true */

/*
This method is called during lookup to process newly added members.

@method $namespace.preAdd
@private
@param ns The namespace to which the property is being added.
@param name The name of the property in the namespace.
@param v The value of the property.
@returns The value v or v.$preAdd
*/
$namespace.preAdd = function (ns, name, v) {
    var problem = null, checkPreAdd = true;
    if (v.$override) {
        v = zjs.addMeta(v.value, {callNext : ns[name]});
        if (!(ns[name] instanceof Function) || !(v instanceof Function))
            problem = "cannot override ";
        checkPreAdd = false;
    }
    else if (v.$overwrite)
        v = v.value;
    else if (v.$replace) {
        if (!(name in ns))
            problem = "cannot replace ";
        v = v.value;
    }
    else if (name in ns)
        problem = "conflict with ";

    $assert(!problem, "Namespace ",ns.$meta.fullname," ",problem,"'",name,"'");
    if (checkPreAdd && v && v.$preAdd)
        v = v.$preAdd(ns, name);

    return v;
};

function $lookup (ns, dotpath, optional) {
    var names = dotpath.split(".");

    var ret = ns;
    for (var i = 0, n = names.length; i < n && ret; ++i) {
        var name = names[i];
        var meta = ret.$meta;
        var v = (meta && meta.pending && (meta.adding[name] || 0) < 2) ?
                    meta.pending[name] : undefined;

        if (typeof(v) === "undefined") {
            if (name in ret) {
                ret = $namespace.connect(ret, name, ret[name]);
                continue;
            }

            if (i === 0 && meta && meta.namespace)
                return $lookup(meta.namespace, dotpath, optional);

            $assert(optional, "Cannot resolve ", dotpath);
            return undefined;
        }

        if (meta.adding[name] == 1)
            $panic("Reference cycle resolving " + dotpath);

        meta.adding[name] = 1;

        var r = meta.preAdd(ret, name, v);

        if (typeof(r) !== "undefined") {
            ret[name] = r;
            r = $namespace.connect(ret, name, r);
        }

        meta.adding[name] = 2;

        ret = r;
    }

    return ret;
}

function $search (ns, dotpath) {
    return $lookup(ns, dotpath, true);
}

/*
The global namespace.
*/
$namespace.global = function () {return this;}();

/*
This method decides if the named member is a conditional expression. If the name
is one of the conditional forms, this method will return true and place the
appropriate information in the given arrays. Otherwise, this method will return
false.

@param container The container of the named member.
@param name The name of the member in the given container. This name may be a
    conditional expression rather than a normal name.
@param values The array to store values of conditional members when they evaluate
    true.
@param names The array to store the "names" of the conditional members that have
    evaluated to true.
@returns True if the name is a conditional expression, false if not.
*/
$namespace.isConditional = function (container, name, values, names) {
    var c = name.charAt(0);
    if (c != '?' && c != '=')
        return false;
    var s = name.substring(1), x = $eval(s);
    if (c == '?' && !x)
        return true;

    var v = container[name];
    if (c == '=' && !(v = (x in v) ? v[x] : v['*']))
        return true;

    if (names)
        names.push(name);
    if (v instanceof Function)
        v = v();
    values.push(v);
    return true;
};

/* The global namespace $meta data. */
var $meta = {fullname : "", name : "", namespace : null, subNamespaces : [],
              preAdd : $namespace.preAdd};


//----------------------------
// Create the zjs namespace.

//! @namespace zjs The root namespace for ZJS.
$namespace("zjs.config");

//! @namespace config This is the container for various configuration properties.
$namespace(zjs.config, {
    /**
    True if a debugger is present, false if not. This is initialized based on
    detecting Firebug, but can be forced to true as needed.

    @var debug
    */
    debug : zjs.config.debug || 
                (typeof(console) != "undefined" && console.firebug) ||
                false,

    /**
    True if hasOwnPrototype is supported by the browser.

    @var hasOwn
    */
    hasOwn: !!{}.hasOwnProperty
});

/**
True if hasOwnProperty should be used. This is based on detection of EVIL libraries
(like Prototype.js) that add to Object.prototype.

@var useOwn
*/
zjs.config.useOwn = zjs.config.hasOwn && 
                        (zjs.config.useOwn ||
                            (function () {
                                for (var n in {}) {
                                    return true;
                                }
                                return false;
                            })());

//! @~namespace config

$namespace(zjs, {

/**
Adds properties to the $meta container of the given object.

@method addMeta
@param obj The object to which meta data is to be added.
@param meta The object containing the meta data properties to add.
@returns The given object.
*/
addMeta : function (obj, meta) {
    zjs.copy(zjs.getMeta(obj), meta);
    return obj;
},

/**
Converts the given iteratable sequence into a proper array. This can handle an
arguments object or other forms. It always returns an array, even if that array
is empty.

@method array
@param it The iteratable collection to convert or copy to an new array.
@returns The new array.
*/
array : function (it) { // from Prototype.js $A()
    if (!it)
        return [];
    return zjs.arrayConv(it) || Array.prototype.slice.call(it, 0);
},

/**
Concatenates the two given arrays and returns the new array.

@method arrayCat
@param a The first array.
@param b The second array.
@returns The new (concatenated) array.
*/
arrayCat : function (a, b) {
    var n = a.length;
    return zjs.arrayCopy(zjs.arrayCopy(null, n, b, 0, b.length), 0, a, 0, n);
},

/**
Performs raw conversion using toArray. This has issues and is specialized by
some browsers.

@method arrayConv
@param it The iteratable collection to convert or copy to an array.
@returns The array.
*/
arrayConv : function (it) {
    return it.toArray ? it.toArray() : null;
},

/**
Copies elements from one array to another. Similar to Java's System.arrayCopy
method.

@method arrayCopy
@param dest The destination array. If null, a new array is created.
@param doffset The offset in the destination array.
@param src The source array.
@param soffset The offset in the source array.
@param len The number of elements to copy.
@returns The destination or new array.
*/
arrayCopy : function (dest, doffset, src, soffset, len) {
    dest = dest || new Array(doffset + len);
    for (var i = 0; i < len; ++i)
        dest[doffset + i] = src[soffset + i];
    return dest;
},

/**
This method returns the elements of the given array beyond a starting point.

@method arrayTail
@param a The array from which to copy elements.
@param skip The number of elements to skip.
@returns The array containing the remaining elements (or null if there are none).
*/
arrayTail : function (a, skip) {
    var n = a.length - (skip || 0);
    return (n > 0) ? Array.prototype.slice.call(a, skip) : null;
},

/**
Creates and returns a new object that has the given object as its prototype object.

@method chain
@param base The object that will be the prototype of the returned new object.
@returns A new object that has the given object as its prototype object.
*/
chain : function () {
    function T () { }

    return function (base) {
        T.prototype = base;
        return new T();
    };
}(),

/**
Copies the properties of a given source object (from) to a target object (to).
This method accepts multiple source objects. In other words, the real signature
is:

js:{{{
    zjs.copy(to, from1[, from2[, from3 ...] ])
}}}

@method copy
@param to The target object to which properties will be copied.
@param from The first source object from which properties will be copied.
@param? from2 The second source object from which to copy (may be more).
@returns The target object.
*/
copy: function (to, from) {
    if (to) {
        for (var i = 1, n = arguments.length; i < n; ++i) {
            if (!(from = arguments[i]))
                continue;
            for (var s in from)
                to[s] = from[s];
        }
    }
    return to;
},

/**
Copies the properties of a given source object (from) to a target object (to).
The properties copied are only those not already on the target object. This method
accepts multiple source objects. In other words, the real signature is:

js:{{{
    copyIf (to, from1[, from2[, from3 ...] ])
}}}

@method copyIf
@param to The target object to which properties will be copied.
@param from The first source object from which properties will be copied.
@param? from2 The second source object from which to copy (may be more).
@returns The target object.
*/
copyIf : function (to, from) {
    if (to) {
        for (var i = 1, n = arguments.length; i < n; ++i) {
            if (!(from = arguments[i]))
                continue;
            for (var s in from)
                if (!(s in to))
                    to[s] = from[s];
        }
    }

    return to;
},

/**
Dereferences an expression in the context of a given object. In other words, all
variables in the expression are interpreted as dereferencing the context object.

For example:

js:{{{
    var obj = { foo : [ { bar : 42 } ] };
    var val = zjs.deref(obj, "foo[0]");

    assertTrue(obj.foo[0] === val);
}}}

The supported syntax includes dot operator and array indexing using numeric values
or quoted strings (single or double).

For example:

js:{{{
    val = zjs.deref(obj, "foo[0]['bar']");

    assertTrue(obj.foo[0].bar === val);
}}}

@method deref
@param object The context object to dereference.
@param expr The expression to evaluate in the given object's context.
@returns The result of the specified expression dereferencing the given object.
*/
deref : function () {
    var kConstant = /^(\d+(?:\.\d*)?)|(?:[']([^']*)['])|(?:["]([^"]*)["])/;
    var kPattern = /^([^.\[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;

    return function (object, expr) {
        var ctx = object, comp;
        var m = kPattern.exec(expr), cm;
        if (m === null)
            return undefined;

        while (m !== null) {
            if (m[1].charAt(0) != '[')
                comp = m[1];
            else if ((cm = kConstant.exec(m[2])))
                comp = cm[1] || cm[2] || cm[3];
            else
                comp = zjs.deref(object, m[2]);

            ctx = ctx[comp];
            if (null === ctx || '' === m[3])
                break;
            expr = expr.substring('[' == m[3] ? m[1].length : m[0].length);
            m = kPattern.exec(expr);
        }

        return ctx;
    };
}(),

emptyObj: {},

/**
Returns the $meta data property of the given object, adding one as needed.

@method getMeta
@param obj The object for which meta data is desired.
@param noadd When true, $meta is returned only if already present.
@returns The meta data object for the given object.
*/
getMeta : function (obj, noadd) {
    var ret = obj.$meta;
    if (!ret && !noadd)
        obj.$meta = ret = (obj.$metaInit ? obj.$metaInit() : {});
    return ret;
},

/**
Returns true if the given object has the specified property. If EVIL libraries
(i.e., those that add to Object.prototype, like Prototype.js) are present, this
method uses hasOwnPrototype. Otherwise it uses the "in" operator. This method is
used instead of the "in" operator

@method has
@param obj The object to test.
@param name The name of the property.
@returns True if the given object has the specified property.
*/
has: function () {
    if (zjs.config.useOwn)
        return function (obj, name) {
            return obj.hasOwnProperty(name);
        };

    return function (obj, name) {
        return name in obj;
    };
}(),

hasCaller: function () {
    function foo () {
        return !!foo.caller;
    }

    return foo();
}(),

/**
Returns true if the given object has the specified property. If EVIL libraries
(i.e., those that add to Object.prototype, like Prototype.js) are present, this
method uses hasOwnPrototype. Otherwise it returns true. This method is used in
"for-in" loops to filter out EVIL properties.

@method hasOwn
@param obj The object to test.
@param name The name of the property.
@returns True if the given object hasOwnProperty of the specified property.
*/
hasOwn: function () {
    if (zjs.config.useOwn)
        return function (obj, name) {
            return obj.hasOwnProperty(name);
        };

    return function () {
        return true;
    };
}(),

/*
This is a placement of $namespace.isConditional in the zjs namespace.
*/
isConditional : $namespace.isConditional

}); //! @~namespace zjs

// backward compat
zjs.copyProps = zjs.copy;
zjs.copyMissing = zjs.copyIf;

//! @namespace zjs
$namespace(zjs, function () {
    var toString = Object.prototype.toString;
    var hasEnumerable = !!{}.propertyIsEnumerable;

    var isEnumerable = hasEnumerable ?
            function (obj, prop) { return obj.propertyIsEnumerable(prop); } :
            zjs.has;

    return {
        /**
        This method returns the type of the given object. This is superior to typeof in
        many ways. See these posts:

        http://profiles.yahoo.com/blog/GSBHPXZFNRM2QRAP3PXNGFMFVU?eid=fam48bo6nChhLpXTWLYuo2PoctbJjTIo34SjoLBF9VV3glXt.w
        http://thinkweb2.com/projects/prototype/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
        http://juhukinners.com/2009/01/11/typeof-considered-useless-or-how-to-write-robust-type-checks/

        Here is a summary table of the results from this method and typeof:

        {{{
            Value               getType     typeof
            ----------------------------------------
            "juhu"              string      string
            new String("juhu")  string      object
            1.2                 number      number
            new Number(1.2)     number      object
            true                boolean     boolean
            new Boolean(true)   boolean     object
            new Date()          date        object
            new Error()         error       object
            [1,2,3]             array       object
            new Array(1, 2, 3)  array       object
            new Function("")    function    function
            /abc/g              regexp      object (function in Safari)
            new RegExp("c")     regexp      object (function in Safari)
            {}                  object      object
            new Object()        object      object

            null                null        object
            undefined           undefined   undefined
            $class({...})       class       object
            new foo.Bar()       foo.Bar     object (foo.Bar is a ZJS class)
        }}}

        @method getType
        @param obj {object} The object for which the type is desired.
        @returns {sring} The type of the given object.
        */
        getType : function (obj) {
            if (!obj) {
                if (obj === undefined)
                    return "undefined";
                if (obj === null)
                    return "null";
            } else if (zjs.isClass(obj)) {
                return "class";
            } else if (obj.getClass) { // major performance issue w/o this test in FF3
                try {
                    var c = obj.getClass();
                    if (zjs.isClass(c))
                        return c.getFullName();
                } catch (ignore) {
                }
            }

            var t = toString.call(obj);
            return t.slice(8, -1).toLowerCase();
        },

        /**
        Determines if the specified object is an "arguments" object.

        @method isArguments
        @param obj The object to test.
        @returns {bool} True if obj is an "arguments" object, false if not.
        */
        isArguments : function (obj) {
            return obj && obj.callee && zjs.isArrayLike(obj);
        },

        /**
        Determines if the specified object is an array.

        @method isArray
        @param obj The object to test.
        @returns {bool} True if obj is an array, false if not.
        */
        isArray : function (obj) {
            var t = toString.call(obj);
            return t === "[object Array]";
        },

        /**
        Determines if the specified object is array-like. This will include arrays as
        well as arguments objects.

        @method isArrayLike
        @param obj The object to test.
        @returns {bool} True if obj is array-like, false if not.
        */
        isArrayLike: function (obj) {
            if (!obj)
                return false;
            var t = typeof(obj.length);
            return t === "number" && !zjs.isEnumerable(obj, "length");
        },

        /**
        Determines if the specified object is a boolean.

        @method isBool
        @param obj The object to test.
        @returns {bool} True if obj is a boolean, false if not.
        */
        isBool : function (obj) {
            var t = typeof(obj);
            return t === "boolean";
        },

        /**
        Determines if the specified object is a Date.

        @method isDate
        @param obj The object to test.
        @returns {bool} True if obj is a Date, false if not.
        */
        isDate : function (obj) {
            var t = toString.call(obj);
            return t === "[object Date]";
        },

        isEnumerable: function (obj, prop) {
            return isEnumerable(obj, prop);
        },

        /**
        Determines if the specified object is a function.

        @method isFunc
        @param obj The object to test.
        @returns {bool} True if obj is a function, false if not.
        */
        isFunc : function (obj) {
            var t = toString.call(obj);
            return t === "[object Function]";
        },

        /**
        Determines if the specified object is a finite number.

        @method isNumber
        @param obj The object to test.
        @returns {bool} True if obj is a finite number, false if not.
        */
        isNumber : function (obj) {
            var t = typeof(obj);
            return t === "number" && isFinite(obj);
        },

        /**
        Determines if the specified object is a string.

        @method isString
        @param obj The object to test.
        @returns {bool} True if obj is a string, false if not.
        */
        isString : function (obj) {
            var t = typeof(obj);
            return t === "string";
        },

        isUndef : function (obj) {
            var t = typeof(obj);
            return t === "undefined";
        }
    };
}); //! @~namespace zjs

/**
Marks a namespace method as an override of a current namespace function. If any
of these characteristics are unmet, an $assert will fire. The newly added method
can use $super to access the previous namespace method.

For example:

js:{{{
    $namespace(foo, {
        bar : function () {
            return "Hello";
        }
    });

    $namespace(foo, {
        bar : $override(function () {
            var s = $super(arguments)();
            return s + " World";
        })
    });

    var s = foo.bar(); // = "Hello World"
}}}

Without the $override, the second time "bar" was added to the foo namespace, an
exception would have been thrown.

@method $override
@param v The value with which to override.
@returns An object with the given value that can be detected as an override.
*/
function $override (v) {
    return {$override : true, value : v};
}

/**
Marks a namespace member so as to overwrite any potentially existant member. It
is valid for their not to be a member, but if there is, it is simply overwritten.

For example:

js:{{{
    $namespace(foo, {
        bar : function () {
            return "Hello";
        }
    });

    $namespace(foo, {
        bar : $overwrite(function () {
            return "World";
        })
    });

    var s = foo.bar(); // = "World"
}}}

Without the $overwrite, the second time "bar" was added to the foo namespace, an
exception would have been thrown.

@method $overwrite
@param v The value with which to overwrite.
@returns An object with the given value that can be detected as an overwrite.
*/
function $overwrite (v) {
    return {$overwrite : true, value : v};
}

/**
Marks a namespace member as an replacement of a current namespace member. If any
of these characteristics are unmet, an $assert will fire. The newly added member
simply replaces the previous member.

@method $replace
@param v The value with which to replace.
@returns An object with the given value that can be detected as a replace.
*/
function $replace (v) {
    return {$replace : true, value : v};
}

/*global $class:true,$abstract:true,$static:true */

/**
This method modifies a class or instance by adding additional class members.

Many approaches to class emulation in JavaScript sacrifice the dynamic nature of
the language. The goal of mixins is to provide a safe mechanism for extending
classes by adding new methods or even providing extensions to existing methods.

The concept of mixins can be helpful in several situations:

 * Provide browser-specific behaviors in separate files.
 * Partition a "fat" base class into smaller pieces.
 * Allow library users to modify base class behavior.

Consider this class:

js:{{{
    $namespace("foo.bar", {

    C : $class({
        ctor : function () {
        },
        fiz : function () {
            return "X";
        }
    })

    });
}}}

A mixin to class C might look like this:

js:{{{
    $mixin(foo.bar.C, "uniqueTag", {
        ctor : function () {
            $super(arguments).call(this);
        },
        fiz : function () {
            return $super(arguments).call(this) + "Y";
        }
    });
}}}

The "uniqueTag" need only be unique to the mixins for to C. Other than that, the
call looks just like a $class body. In fact, $class simply sets up the skeleton,
empty class and calls this method with a null tag name.

In many ways, one can think of a mixin like a derived class. For example, notice
the calls to $super in the overriding methods. These work as you might expect.
To see a simple test, consider this:

js:{{{
    var c = new foo.bar.C();
    var s = c.fiz(); // = "XY"
}}}

The call to fiz first enters the mixin's implementation. That method calls the
super method (in this case the original method) with returns "X" and then appends
"Y". The important difference between mixin and derivation is that derivation
creates a Javascript prototype chain while mixin adjusts the prototype object.
To see how this effects things, imagine a derived type.

js:{{{
    $namespace("foo.bar", {

    D : $class(foo.bar.C, {
        ctor : function () {
            $super(arguments).call(this);
        },
        fiz : function () {
            return $super(arguments).call(this) + "Z";
        }
    })

    });
}}}

The D class is created using a prototype object of C. This relationship cannot be
changed (at least not in all browsers). The implementation of mixin edits the
prototype object, which means the mixin will have the same effect if it is
performed before or after the creation of the derived class.

@method $mixin
@param klass {class|object} The class (or instance) to which to add new members.
@param tag {string} The unique (to the class/instance) name for these members.
@param members {object} The members to add to the class or instance.
@returns {class|object} The now modified klass or instance.
*/
function $mixin (klass, tag, members)
{
    members = $namespace.expandMembers(members, klass);

    zjs.addMeta(klass, {pending : members, adding:{}, preAdd : zjs.preAddClass,
                         mixing : tag});

    var m = klass.$meta, names = [], values = [];

    try {
        for (var name in members)
            if (!zjs.isConditional(members, name, values, names))
                // Non-static members will not be "found" since they get added to
                // klass.prototype instead of klass itself. So we use $search not
                // $lookup:
                $search(klass, name);
    } finally {
        delete m.adding;
        delete m.pending;
        delete m.mixin;
    }

    if (zjs.isClass(klass))
        $foreach(zjs.classPlugins, function (p) {
            p.finish(klass);
        });

    tag = tag || "";
    for (var i = 0; i < names.length; ++i)
        $mixin(klass, tag + names[i], values[i]);

    return klass;
}

/**
Defines a new class optionally derived from a given base. To create a class that
derives from the default base (zjs.Object), you would do this:

js:{{{
    $class({
        member : function () { ... }
    ));
}}}

To derive from a specific base class, you can do this:

js:{{{
    $class(Base, {
        member : function () { ... }
    ));
}}}

To help detect errors, a base class, if specified, must not be "undefined". It can
be null which indicates that the class has no base (which is effectively Object).

When adding classes to a namespace (the typical case), it is helpful to specify the
base class by name. For example:

js:{{{
    $namespace(foo, {
        Base : $class({
        }),

        Derived : $class("Base", {  // note: foo.Base cannot be evaluated yet
        })
    });
}}}

In the above, "Base" is used to indicate that "foo.Base" is the desired base. Not
only is this more convenient than fully specifying the base class, it is necessary
to defer the evaluation until Base has been added to the namespace. In previous
versions of ZJS, this required closing the $namespace call that registered Base
and making another call to $namespace to register the derived class so that foo.Base
could be evaluated.

@method $class
@param? base {class|string} The base class or base class name.
@param members {object} An object containing the members of the class.
@returns {class} The newly created class.
*/
function $class (base, members) {
    if (arguments.length == 2 && typeof(base) == "string")
        return {
            $meta : {$super : null}, // to be recognized as a class
            $namespaceConnect : function (ns, name) {
                delete ns[name]; // we don't belong in the namespace...

                var klass, b = $lookup(ns, base);

                ns[name] = klass = $class(b, members);

                klass.$namespaceConnect(ns, name);
                return klass;
            },
            $preAdd : function (ns, name) {
                var b = $lookup(ns, base);
                return $class(b, members);
            }
        };

    var klass = function () {
        if (klass.$meta.$abstract)
            $panic("Cannot instantiate class "+klass.$meta.fullname+
                   " ("+klass.$meta.$abstract.join(",")+")");

        var ctor = this.ctor;
        if (ctor)
            ctor.apply(this, arguments);
    };

    klass.$meta = {$super : null, preAdd : zjs.preAddClass};
    klass.$namespaceConnect = zjs.namespaceConnectClass;

    if (arguments.length == 1) {
        members = base;
        base = zjs.Object;
    }

    if (base) {
        klass.prototype = zjs.chain(base.prototype);
        klass.$meta.$super = base;
    } else {
        $assert(typeof(base) !== "undefined", "Base class undefined");
    }

    members = $namespace.expandMembers(members, klass);

    // Find all "member : $abstract" members:
    var abstractMembers = [];
    for (var n in members)
        if (members[n] === $abstract)
            abstractMembers.push(n);

    $foreach(abstractMembers, function (mem) {
        delete members[mem]; // remove them from the real members collection
    });

    $mixin(klass, undefined, members);

    var pr = klass.prototype;
    pr.$class = klass;

    if (base && base.$meta)
        $foreach(base.$meta.$abstract, function (mem) {
            if (!(mem in pr))
                abstractMembers.push(mem); // merge in any still abstract base members
        });

    if (abstractMembers.length)
        klass.$meta.$abstract = abstractMembers;

    return zjs.finishClass(klass);
} // $class

//! @namespace zjs
$namespace(zjs, {

/**
This method is called to finishes a new class. This is a separate method so it
can be customized by the user as necessary. By default, this method does nothing.

@method finishClass
@param klass {class} The class to finish.
@return {class} The class object.
*/
finishClass : function (klass) {
    return klass;
},

/*
This method completes the connection of the methods for the given class. This
is the same operation for static and non-static members.
*/
connectClassMethods : function (klass, scope) {
    for (var name in scope) {
        var v = scope[name], isf = (v instanceof Function), m = v && zjs.getMeta(v, !isf);
        if (m && m.$class === klass)
            $namespace.connect(klass, name, v);
    }
},

/**
Returns true if the parameter passed represents a class generated by $class.

@method isClass
@param klass The object to test for class-ness.
@return True if the parameter passed represents a class generated by $class.
*/
isClass : function (klass) {
    // Only a class should have a $super property in its meta-data:
    return klass && klass.$meta && ("$super" in klass.$meta);
},

/*
This method is called when a class is connected to a namespace (or outer class).

@param ns The namespace to which this class is now connected.
@param name The name of this class in the namespace or outer class.
*/
namespaceConnectClass : function (ns, name) {
    Function.prototype.$namespaceConnect.call(this, ns, name); // our "super"

    zjs.connectClassMethods(this, this); // static class members
    zjs.connectClassMethods(this, this.prototype); // non-static class members
},

namespaceConnectObject : function (ns, name, obj) {
    var fn = (ns.$meta && ns.$meta.fullname) ? (ns.$meta.fullname + "." + name) : name;
    zjs.addMeta(obj, {fullname : fn, name : name, namespace : ns});
},

/*
The collection of plugins for $class.
*/
classPlugins : {},

preAddClass : function (klass, name, v) {
    if (name in zjs.classPlugins)
        if (zjs.isClass(klass)) {
            var p = zjs.classPlugins[name];
            return p.process(klass, v);
        }

    var isStatic = v && (v.$static === $static), isInst = !zjs.isClass(klass);

    if (isStatic) {
        $assert(!isInst);
        v = v.value; // unwrap the real value
    } else if (zjs.isClass(v)) {
        isStatic = true;
        v.$meta.$class = klass;
    }

    var meta, suffix, ret, set = true;
    if (v instanceof Function) {
        zjs.addMeta(v, {$class: klass, $static: isStatic, name: name});
        meta = v.$meta;
        var mp = meta.priority = (meta.priority || 0);
        var scope = (isStatic || isInst) ? klass : klass.prototype;
        suffix = klass.$meta.mixing;

        if (suffix)
            meta.mixin = suffix;

        var cn, cm, cur = scope[name], GM = zjs.getMeta;
        cur = cur && (cm = GM(cur)).$class === klass && cur;
        if (cur) {
            if (cm.priority <= mp) {
                meta.callNext = cur;
            } else {
                while (cm.callNext && (cn = GM(cm.callNext)).priority > mp)
                    cm = cn;
                meta.callNext = cm.callNext;
                cm.callNext = v;
                set = false;
            }
        } else if (isInst) {
            // methods added to instances need to link to real class for super:
            meta.$super = klass.$meta.$class;
        }
    }

    if (isStatic || isInst) {
        if (set)
            ret = v;
    } else if (set) {
        klass.prototype[name] = v;
    }

    $namespace.connect(klass, name, v);

    return ret;
}

}); //! @~namespace zjs

/**
This pseudo-keyword is used to declare a method as abstract. We cannot "force"
the derived class to implement the method beyond preventing instantiation. The
default behavior for calling non-existant methods is sufficient for handling an
abstract method, but it would be best to prevent the object's creation.

For example:

js:{{{
    Base : $class({
        foo : $abstract,

        ...
    }),

    Derived : $class("Base", {
        foo : function (x) { ... }
    })
}}}

In the above, Base is abstract because of "foo" but Derived is not because it
implements foo. Abstractness is a class level concept and is not effected by any
use of mixins.

Once an abstract method is implemented, it cannot be made abstract again by a derived
class. This is possible in some languages, but in Javascript it would be unreasonably
intrusive to provide this support.

@var $abstract
*/
var $abstract = {};

//-----------------------------------------------------------------------------

zjs.copy(Function.prototype, {
    /*
    Creates a fresh $meta data for this function object.
    */
    $metaInit : function () {
        var regex = /function\s*(\w*)/;

        return function () {
            var name = this.name || this.toString().match(regex)[1];
            name = name || "~anonymous~";
            return {fullname : name, name : name};
        };
    }(),

    /*
    Called when a function is added to a namespace. We take the opportunity to
    add $meta data.
    */
    $namespaceConnect : function (ns, name) {
        zjs.namespaceConnectObject(ns, name, this);
        for (var m = this.$meta; m && m.callNext; m = m.callNext)
            m.callNext.$namespaceConnect(ns, name);
    }
});

/**
Several extensions are added to the Javascript Function class. These are then
available as methods on all function objects.

@class Function
*/

/**
Creates and returns a function that binds a "this" pointer and optional arguments
to this function.

For example:

js:{{{
    function foo () { ... }
    var bar = { ... };
    var fn = foo.bind(bar);
    fn(4,2); // equivalent to: foo.call(bar, 4, 2)
}}}

When arguments are also bound, they are inserted before the actual arguments from
the caller. For example:

js:{{{
    function foo () { ... }
    var bar = {};

    var fn = foo.bind(bar, 1, 2);

    fn(3, 4); // equivalent to: foo.call(bar, 1, 2, 3, 4);
}}}

@method bind
@param that The 'this' pointer scope to use when calling the target function.
@param? arg1 The first of any number of arguments to pass to the target function.
@returns The function that will call the target whenever it is called.
*/
if (!Function.prototype.bind)
    (function () {
        var slice = Array.prototype.slice;

        function bindArgs (that, method, args) {
            return function () {
                var a = args.concat(slice.call(arguments, 0));
                return method.apply(that, a);
            };
        }

        function bindObj (that, method) {
            return function () {
                return method.apply(that, arguments);
            };
        }

        Function.prototype.bind = function (that) {
            var f = (arguments.length > 1) ?
                        bindArgs(that, this, slice.call(arguments, 1)) :
                        bindObj(that, this);

            return zjs.addMeta(f, {binding : "bind", target : this});
        };

    })();

//! @~class Function

//-----------------------------------------------------------------------------

/*global $super: true */

//! @namespace zjs
$namespace(zjs, {

/**
This is the default base class for classes created by $class.

@class Object
*/
Object : $class(null, function () {  // null is important here!

    var slice = Array.prototype.slice;

    function supr (args) {
        var f = supr.caller, n = arguments.length;
        if (!n || !zjs.isArguments(args)) {
            f = $super.of(f);
            return f.apply(this, arguments);
        }

        f = $super.of(f || args.callee);
        if (n == 1)
            return f.call(this);

        var a = slice.call(arguments, 1);
        return f.apply(this, a);
    }

    return {
        /**
        Returns the class of this object.

        @method getClass
        @returns The class of this object.
        */
        getClass : function () {
            return this.$class;
        },

        /**
        This method will call the super method on this object. If the environment provides
        the "caller" property on Functions, that is used to determine the super method. If
        not then the first parameter, if it is an "arguments" object, is used to retrieve
        the super via the "callee" property. See $super for details.

        All parameters passed to this method (other than the optional "arguments" used to
        determine the super method) are passed to the super method. For example:

        js:{{{
            Derived : $class("Base", {
                foo : function (x) {
                    var v = this.$super(arguments, x); // always good
                    // only "x" is passed to super.foo

                    // equivalent to:
                    var v = $super(arguments).call(this, x);
                    ...
                }
            })

            // ... or ...

            Derived : $class("Base", {
                foo : function (x) {
                    var v = this.$super(x); // not universally supported

                    // equivalent to:
                    var v = $super().call(this, x);
                    ...
                }
            })
        }}}

        @method $super
        @param? args {Arguments} The arguments object (not just an array).
        @returns The value returned by the super method.
        */
        $super: supr
    };
}), //! @~class

/**
This class implements the mechanics of a class plugin. To implement a class plugin,
derive from this class. Its ctor method registers itself by its given name. The
add and expand methods are called to handle the members of the specified name.

For example,

js:{{{
    new ($class(zjs.ClassPlugin, {
        ctor : function () {
            $super(arguments).call(this, "$foo");
        },

        add : function (klass, inst, name, value) {
            ...
        },

        expand : function (klass, value, values, index) {
            ...
        }
    }));
}}}

With the above plugin registered, the following:

js:{{{
    MyClass : $class({
        $foo : [ 1, 2, 3 ]
    });
}}}

or the following:

js:{{{
    MyClass : $class({
        $foo : {
            bar : 42
        }
    });
}}}

Will call the process method of the plugin. In the first case, the array [1,2,3]
is passed as the values and in the second case, the object { bar: 42 } is passed.
The default implementation of the process method is described below.

@class ClassPlugin
*/
ClassPlugin : $class(null, { // no base
    /**
    Initializes the plugin given its name.

    @ctor
    @param name The name of this plugin.
    */
    ctor : function (name) {
        $assert(name.charAt(0) === '$', "Plugin ", name, " does not start with '$'");
        $assert(!zjs.classPlugins[name], "Plugin ", name, " already defined");
        zjs.classPlugins[name] = this;

        this.name = name;
    },

    /**
    This method is called to add a single named value. For example, the following
    will call this method with a name of "bar" and a value of 42:

    js:{{{
        Foo : $class(
        {
            $foo :
            {
                bar : 42
            }
        })
    }}}

    @method add
    @param klass The class being processed.
    @param inst The plugin's instance object for the class.
    @param name The name of the value.
    @param value The value.
    */
    add : $abstract, // function (klass, inst, name, value)

    /**
    This method performs basic conflict checking for added values. This check uses
    $overwrite and $replace semantics.

    @method conflictCheck
    @param klass The class being processed.
    @param inst The plugin's instance object for the class.
    @param name The name of the value.
    @param value The value.
    @return Unwrapped (actual) value for the named item.
    */
    conflictCheck: function (klass, inst, name, value) {
        var problem = null;
        
        if (value.$overwrite) {
            value = value.value;
        } else if (value.$replace) {
            if (!(name in inst))
                problem = "cannot replace ";
            value = value.value;
        } else if (zjs.has(inst, name)) {
            problem = "conflict with ";
        }

        $assert(!problem, "Plugin ", this.name, " ", problem, "'", name, "'");
        return value;
    },

    /**
    This method is called to expand an array element to a name/value pair. For
    example, this method is called twice when given the following:

    js:{{{
        Foo : $class(
        {
            $foo : [ "abc", "xyz" ]
        })
    }}}

    The name and value returned are used to call the add method. In the above,
    add would be called twice.

    @method expand
    @param klass The class being processed.
    @param value The value of the current element being processed.
    @param values The array of values being processed.
    @param index The current index into the array (value == values[index]).
    @returns An object containing the name and value to add.
    @{
        @. name The name of the element.
        @. value The value of the element.
    @}
    */
    expand : $abstract, // function (klass, value, values, index)

    /**
    This method is called whenever a class or mixin adds members.

    @method finish
    @param klass The class being processed.
    */
    finish : function (klass) {
        // do nothing...
    },

    /**
    Makes sure the class and its bases have an object for this plugin. These objects
    are attached to the class and its prototype and are prototype chained to their
    counterparts on the base class.

    For example, given a plugin named $foo:

    js:{{{
        Base : $class(
        {
            $foo : ...
        }),

        Derived : $class("Base",
        {
            $foo : ...
        })
    }}}

    There would be two objects, one for each class. The object for Derived would
    have the object for Base as its prototype.

    js:{{{
        var d = new Derived();
        assertTrue(d.$foo === Derived.$foo);
        assertTrue(Base.$foo.isPrototypeOf(Derived.$foo));
    }}}

    @method prep
    @param klass The class being processed.
    @returns The object to attach for this plugin.
    */
    prep : function (klass) {
        var s = this.name, r = klass[s];
        if (r)
            return r;

        var b = klass.$meta.$super;
        if (!b)
            return {};

        b = this.prep(b);
        klass.prototype[s] = klass[s] = r = zjs.chain(b);
        return r;
    },

    /**
    Processes the given set of values for a class.

    @method process
    @param klass The class to which the values apply.
    @param values The set of values to process.
    */
    process : function (klass, values) {
        var inst = this.prep(klass);

        $foreach(values, function (v, etc) {
            var name = etc.key;

            if (etc.array) {
                v = this.expand(klass, v, values, name);
                name = v.name;
                v = v.value;
            }

            v = this.conflictCheck(klass, inst, name, v);
            this.add(klass, inst, name, v);
        }, this);
    }
}) //! @~class ClassPlugin

}); //! @~namespace zjs

//-----------------------------------------------------------------------------

/**
Creates a new object of the specified type using the given ctor arguments. The
new object is returned.

js:{{{
    var obj = $new(T, ["abc", 42]);
    // or equivalently:
    var obj = new T("abc", 42);
}}}

This method comes in handy when the ctor arguments are known dynamically. This
works not only for ZJS classes, but for any constructor function.

@method $new
@param T {class} The type of object to create.
@param? args {array} The constructor arguments array.
@returns {object} The newly created object.
*/
function $new (T, args) {
    var ret = zjs.chain(T.prototype);

    if (args)
        T.apply(ret, args);
    else
        T.call(ret);

    return ret;
}

/**
Decorates a method with a call priority. This is used by $mixin to order the
method call chain.

js:{{{
    $mixin(Foo, "bar", {
        method : $priority(2, function (x) {
        })
    });
}}}

@method $priority
@param pr The priority of the given method.
@param fn The function object.
@returns The given function object (now with its priority set).
*/
function $priority (pr, fn) {
    if (fn.$static === $static) // if (member is static)
        fn = fn.value; // get the real method

    if (fn instanceof Function)
        zjs.addMeta(fn, {priority : pr});
    else
        $panic("Invalid arg");
    return fn;
}

/**
This method determines the super method given an arguments object. The typical
use for this method is like so:

js:{{{
    Base : $class({
        foo : function (x) { ... }
    }),

    Derived : $class("Base", {
        foo : function (x) {
            var v = $super(arguments).call(this, x);
            ...
        }
    })
}}}

In the above, the returned super method is called, the parameters are passed on
and its return value is stored.

This has the virtue of being easy to debug because when a Step In goes first
into $super, a Step Out can be used to get back to the call site and then a
Step In will enter the super method.

A method will always be returned. If there is no super method then $super.none is
returned instead of null. This eliminates most special case handling.

In browsers (or other environments) that support the "caller" property on Functions,
the "arguments" parameter is ignored. In some cases applications can simply not pass
this parameter (if they require such browsers). If this is the case, the call could
look like this:

js:{{{
    Derived : $class("Base", {
        foo : function (x) {
            var v = $super().call(this, x); // not universally supported
            ...
        }
    })
}}}

At this time (Apr 2011), the following environments are known to support this usage:
Firefox 3.6, IE8, Chrome 10, Opera 10 and WSH. Rhino does not support this feature.

@method $super
@param? args {Arguments} The arguments object (not just an array).
@returns The super method of the callee method.
*/
function $super (args) {
    return $super.of($super.caller || args.callee);
}

$super.of = function (f) {
    var c, GM = zjs.getMeta, fm = GM(f), sup = fm.callNext;

    if (!sup && (c = fm.$super || GM(fm.$class).$super)) {
        if (!fm.$static) {
            sup = c.prototype[fm.name];
        } else {
            for (; c && !sup; c = GM(c).$super)
                sup = c[fm.name];
        }
    }

    return sup || $super.none;
};

/**
This method is a shorthand for calling the super method.

js:{{{
    ...
    var v = $supercall(arguments, this);
}}}

This accomplishes the same end result. All arguments are passed to the super
method and its return value is returned.

If the arguments need to be adjusted, this can be done using this form:

js:{{{
    ...
    var v = $supercall(arguments, this, [x / 2]);
}}}

In the above, the array contains the arguments to pass to the super method.

In some cases, such as overriding a namespace method, the this pointer is irrelevant
and $supercall can be used like this:

js:{{{
    $supercall(arguments);
}}}

@method $supercall
@param args {Arguments} The arguments object (not just an array).
@param? that {object} The "this" pointer to use when invoking the super method.
@param? params {object[]} The arguments to pass to the super method (instead of args).
@returns The value returned by the super method.
*/
function $supercall (args, that, params) {
    var fn = $super(args);
    return fn.apply(that, params || args);
}

/*
This method is returned by $super when there is no real super method.
*/
$super.none = function () { };

/**
Creates a class that is instantiated on the first call of getInstance. Further,
that is the only way to create an instance of that class. In almost every other
way, this use is the same as $class.

For example:

js:{{{
    Foo : $singleton({
        ctor : function () { this.foo = 427; },
        bar : $static(function () { return 42; }),
        bif : function () { return this.foo; }
    })

    var f = Foo.getInstance(); // lazy creates single instance on first call
    var x = f.bif(); // = 427
    var y = Foo.bar(); // = 42

    var f2 = new Foo(); // ERROR
}}}

@method $singleton
@param? base The base class from which the singleton derives.
@param members The members of the singleton class.
@returns The singleton class.
*/
function $singleton (base, members) {
    var klass = $class.apply(this, arguments), theOne, allow = false;

    $mixin(klass, null, {
        ctor : function () {
            if (!allow)
                $throw("Cannot instantiate singleton");
            allow = false;

            $super(arguments).call(this);
        },

        getInstance : $static(function () {
            if (!theOne) {
                allow = true;
                theOne = new klass();
            }

            return theOne;
        })
    });

    return klass;
}

/**
Wraps the given member so that $class will handle it as a static member. The
difference is seen here:

js:{{{
      $namespace("N", {
          C : $class({
              foo : function () { ... },
              bar : $static(function () { ... })
          })
      });

      var c = new N.C();

      c.foo();  // non-static
      N.C.bar(); // static
}}}

@method $static
@param member The member to mark as static.
@returns The static marker object to pass to $class.
*/
function $static (member) {
    return {$static : $static, value : member};
}

/**
Builds a string that is passed to the eval method to import symbols.

@method $using
@param sym The set of namespaces or other symbol to include (one or more of these).
@returns A string to eval that makes local vars for the contents of the syms.
*/
function $using (sym) {
    var ret = "";
    for (var i = 0, n = arguments.length; i < n; ++i) {
        sym = arguments[i];
        if (sym.$meta && sym.$meta.subNamespaces) { // if (namespace)
            var fn = sym.$meta.fullname;
            for (var name in sym)
                if (name != "$meta")
                    ret += "var " + name + " = " + fn + "." + name + ";";
        } else if (sym.$meta && sym.$meta.namespace) {
            ret += "var " + sym.$meta.name + " = " + sym.$meta.fullname + ";";
        }
    }

    return ret;
}

//! @namespace zjs
$namespace(zjs, {

/**
This method destroys its arguments. For each argument, if it is an object with a
destroy method, that method is called. For an array, the elements of that array
are likewise destroyed, recursively.

js:{{{
    var obj = new Something();

    obj = zjs.destroy(obj);
}}}

@method destroy
@param obj An object or array of objects to destroy (one of many).
@returns Always null.
*/
destroy : function () {
    function zap (obj) {
        if (obj instanceof Array) {
            $foreach(obj, zap);
        } else if (obj && typeof(obj.destroy) === "function") {
            try {
                obj.destroy();
            } catch (e) {
                $log("Exception thrown by destroy method: " + e.message);
            }
        }
    }

    return function () {
        $foreach(arguments, zap);
        return null;
    };
}(),

/**
This class is the base for all enumerations.

@class Enum
*/
Enum : $class({
    /**
    Initializes this object with its essential properties.

    @ctor
    @param id The unique ID of this enumerated constant.
    @param name The name of this enumerated constant.
    @param ordinal The user's (implicitly or explicitly) specified value.
    */
    ctor : function (id, name, ordinal) {
        this.id = id;
        this.name = name;
        this.ordinal = ordinal;
    },

    /**
    Compares the given value to this enum constant. A match may be by exact object
    instance or equal name or ordinal.

    For example:

    js:{{{
        Foo : $enum(["CONST"]),

        ...
        if (Foo.CONST.equals(x)) // x == Foo.CONST, "CONST" or Foo.CONST.ordinal
            ...
    }}}

    @method equals
    @param v The value to compare to this enum constant.
    @returns True if equal, false if not.
    */
    equals : function (v) {
        return v === this || v === this.name || v === this.ordinal;
    },

    /*
    Returns an enum constant by matching one of its properties to a value. This
    is optimized by creating an inversion on first request. It would be inappropriate
    to create such a table until the inversion been requested since it is allowable
    for some of these properties be duplicated (in particular, the ordinal).

    @method fromProp
    @param E The enum class.
    @param mapName The name of the inversion map.
    @param prop The name of the property on the enum constant to match against.
    @param value The value of the constant's property to find.
    @return The matching enumeration constant or null if not found.
    */
    fromProp : $static(function (E, mapName, prop, value) {
        var map = E[mapName];
        if (!map) {
            E[mapName] = map = {};
            $foreach(E.values, function (en) {
                var k = en[prop];
                $assert(!(k in map), "Duplicate ", prop, " '",k,"' (not-invertable)");
                map[k] = en;
            });
        }

        return map[value] || null;
    }),

    /**
    Returns the full name of this enumerated constant.

    @method getFullName
    @return The full name of this enumerated constant.
    */
    getFullName : function () {
        return this.getClass().getFullName()+"."+this.name;// requires ext.js
    }
}) //! @~class Enum

/**
This class describes what an enum type defined by $enum contains. This is not an actual
type.

@class ExampleEnum
@extends Enum
*/

    /**
    The ID which is the index of the enumerated constant in the list of constants.

    @prop id {int}
    */
    //-----------------
    /**
    The user-given name of the constant.
    @prop name {string}
    */
    //-----------------
    /**
    The associated value (either implicit or explicit).
    @prop ordinal {int}
    */
    //-----------------
    /**
    Returns the full-name (including namespace) of this constant.

    @method getFullName
    @returns {string} The full-name (including namespace) of this constant.
    */
    //-----------------
    /**
    This property contains each of the enum constants in their declared order.

    @prop values {ExampleEnum[]}
    @static
    */
    //-----------------
    /**
    Returns the enum constant instance with the given *id* value or null if there is
    no match.

    @method findById
    @static
    @param id {string} The ID of the enum constant to find.
    @returns The enum constant instance with the given *id* or null if no match.
    */
    //-----------------
    /**
    Returns the enum constant instance with the given *ordinal* value or null if there
    is no match.

    @method findByOrdinal
    @static
    @param ord {int} The ordinal of the enum constant to find.
    @returns The enum constant instance with the given *ordinal* or null if no match.
    */
    //-----------------
    /**
    Returns the enum constant instance with the given *id* value. If there is no match,
    an exception is thrown.

    @method getById
    @static
    @param id {string} The ID of the enum constant to find.
    @returns The enum constant instance with the given *id* value.
    @throws If there is no match.
    */
    //-----------------
    /**
    Returns the enum constant instance with the given *name* value. If there is no match,
    an exception is thrown.

    @method getByName
    @static
    @param name {string} The *name* of the enum constant to find.
    @returns The enum constant instance with the given *name*.
    @throws If there is no match.
    */
    //-----------------
    /**
    Returns the enum constant instance with the given *ordinal* value. If there is no
    match, an exception is thrown.

    @method getByOrdinal
    @static
    @param id {string} The ID of the enum constant to find.
    @param ord {int} The *ordinal* of the enum constant to find.
    @returns The enum constant instance with the given *ordinal*.
    @throws If there is no match.
    */
    //-----------------
    /**
    Returns the enum constant instance with the given *name* value or null if there is
    no match.

    @method parseName
    @static
    @param name {string} The *name* of the enum constant to find.
    @returns The enum constant instance with the given *name* or null if no match.
    */

//! @~class ExampleEnum

}); //! @~namespace zjs

zjs.Enum.$namespaceConnect = function (ns, name) {
    zjs.namespaceConnectClass.call(this, ns, name); // our "super"

    for (var i = 0, n = this.values.length; i < n; ++i) {
        var c = this.values[i];
        zjs.namespaceConnectObject(this, c.name, c);
        zjs.connectClassMethods(c, c);
    }
};

/**
Declares an enumeration type. Each enumerated constant is essentially a static
member of the class generated for the enum.

To avoid ambiguity with other static members, it is best to use all capital
letters for enum constants. For example,

js:{{{
    $namespace("foo", {

    State : $enum(["FOO", "BAR", "FOOBAR"])

    });

    var s = foo.State.FOO;

    assertTrue(foo.State.FOOBAR instanceof foo.State);
}}}

The ordinal values are assigned by default as 0, 1, 2 and so forth. These can
be specified if desired:

js:{{{
    $namespace(foo, {

    State : $enum(["FOO", "BAR=42", "FOOBAR"])

    })
}}}

In the above example, we would have:

js:{{{
    foo.State.FOO.ordinal == 0
    foo.State.BAR.ordinal == 42
    foo.State.FOOBAR.ordinal == 43
}}}

To add user-defined methods to an enum, you add them via the 2nd argument to
this method:

js:{{{
    $namespace("foo", {

    State : $enum(["FOO", "BAR", "FOOBAR"], {
        method : function (x) { return this.name + x; }
    })

    });
}}}

This form of $enum calls $mixin using the 2nd argument. Furhter mixins are also
possible. Given the above:

js:{{{
    assertEquals("BAR__", foo.State.BAR.method("__"));
}}}

Lastly, as with Java, each constant instance can have its own methods and/or
overrides. These are added in a similar way but immediately following the enum
constant.

js:{{{
    $namespace("foo", {

    State : $enum([
        "FOO",
        "BAR", {
            method : function (x) { return $super(arguments,this) + "!!"; }
        }
        "FOOBAR"
    ],{
        method : function (x) { return this.name + x; }
    })

    });
}}}

Given the above:

js:{{{
    assertEquals("FOOBAR__", foo.State.FOOBAR.method("__");
    assertEquals("BAR__!!", foo.State.BAR.method("__");
}}}

@method $enum
@param names {array} The array of names and content for each enum constant.
@param? members {object} The members of the new enum class.
@returns {class} The enum class.
*/
function $enum (names, members) {
    // Create the class for the enumeration:
    var Enum = $class(zjs.Enum, {
        values : $static([]),

        findById : $static(function (id) {
            return this.values[id] || null;
        }),

        findByOrdinal : $static(function (ord) {
            return zjs.Enum.fromProp(this, "_ordinalMap", "ordinal", ord);
        }),

        getById : $static(function (id) {
            var ret = this.findById(id);
            if (!ret)
                $panic("Enum " + this.getFullName() + " has no id=" + id);
            return ret;
        }),

        getByName : $static(function (name) {
            var ret = this.parseName(name);
            if (!ret)
                $panic("Enum " + this.getFullName() + " has no name=" + name);
            return ret;
        }),

        getByOrdinal : $static(function (ord) {
            var ret = this.findByOrdinal(ord);
            if (!ret)
                $panic("Enum " + this.getFullName() + " has no ordinal=" + ord);
            return ret;
        }),

        parseName : $static(function (name) {
            return zjs.Enum.fromProp(this, "_nameMap", "name", name);
        })
    });

    Enum.$namespaceConnect = zjs.Enum.$namespaceConnect;

    if (members)
        $mixin(Enum, "$enum", members); // mixin any user-specified content

    // Create the instance (one per enumeration constant):
    var am = {$enum: Enum, $class: Enum};
    for (var i=0, n=names.length, ord=0, index=0; i < n; ++i, ++ord, ++index) {
        var nm = names[i], m = $enum.valueRegEx.exec(nm);
        $assert(m, "Invalid enum constant: '", nm, "'");

        var en = new Enum(index, m[1], m[2] ? (ord = parseInt(m[2],10)) : ord);
        zjs.addMeta(en, am);

        if (i + 1 < n && typeof(names[i+1]) != "string")
            $mixin(en, "$enum", names[++i]); // mixin constant-specific content

        Enum.values.push(en); // add to values[]
        Enum[en.name] = en; // add as a static class member
    }

    // Now that we've created all the instances we want, we add a ctor (with a
    // rather high priority) that will not allow new instances.
    $mixin(Enum, "sealed", {
        ctor : $priority(9e99, function () {$panic("Cannot create enum");})
    });

    return Enum;
}

/* This regex parses an enum's "IDENT=###" syntax where "=###" is optional. */
$enum.valueRegEx = /^([a-z_]\w*)\s*(?:[=]\s*([+\-]?\d+))?$/i;

/**
Registers the current module. This method should be called at the top of a .js
file, much like a package statement in Java.

@method $module
@param modpath The module path of the registering module.
*/
function $module (modpath) {
    var first = $module.register(modpath);

    $assert(first, "Module '"+modpath+"' already registered");

    $module.current = modpath;
}

$module.hook = function() { }; // overridden by zjs.import
$module.inventory = [];
$module.registry = { };

/*
Registers the current module.

@param modpath The module path of the registering module.
@returns True if this was the first time the given module was registered.
*/
$module.register = function (modpath) {
    $module.hook(modpath);
    if ($module.registry[modpath])
        return false;

    $module.inventory.push(modpath);
    $module.registry[modpath] = $module.inventory.length;
    return true;
};

$module("zjs.core");

/**
Declares that the given module path is required. If that module is not already
loaded, a $panic ensues (an exception).

@method $requires
@param modpath The module path of the required module.
*/
function $requires (modpath) {
    if ($module.registry[modpath])
        return;

    var s = null;

    for (var i = 0, n = $module.inventory.length; i < n; ++i)
        s = (s || "\nPresent:") + "\n  >> " + $module.inventory[i];

    if ($module.current)
        s = " (required by " + $module.current + ")" + s;

    $panic("Missing required module '" + modpath + "'" + s);
}

$namespace(zjs, {

StaticClassPlugin: $class(zjs.ClassPlugin, {
    add : function (klass, inst, name, value) {
        var members = klass.$meta.$staticTemp || {};
        klass.$meta.$staticTemp = members;
        members[name] = $static(value);
        inst[name] = value;
    },

    conflictCheck: function (klass, inst, name, value) {
        return value;
    },

    expand: function () {
        $throw("Bad syntax for $static");
    },

    finish : function (klass) {
        var members = klass.$meta.$staticTemp;
        if (members) {
            delete klass.$meta.$staticTemp;
            $mixin(klass, "$static", members);
        } else {
            this.prep(klass); // may not have $static yet...
        }
    }
})

});

// Register the $events plugin with $class/$mixin:
zjs._staticClassPlugin = new zjs.StaticClassPlugin("$static");
