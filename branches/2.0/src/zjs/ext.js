/*=============================================================================
    zjs/ext.js
    Copyright (C) 2008-2009, Donald W. Griffin
    All rights reserved.
    [MIT license -- see license.txt for details]

    Adds extra goodies (mostly to Function.prototype and String.prototype).

=============================================================================*/
$module("zjs.ext");

$requires("zjs.core");

$namespace(zjs, {

/**
Converts the given iteratable sequence into a proper array. This can handle an
arguments object or other forms. It always returns an array, even if that array
is empty.
*/
array : function (it) // from Prototype.js $A()
{
    if (!it)
        return [];
    return zjs.arrayConv(it) || zjs.arrayCopy(null, 0, it, 0, it.length);
},

/**
Performs raw conversion using toArray. This has issues and is specialized by
some browsers.
*/
arrayConv : function (it)
{
    return it.toArray ? it.toArray() : null;
},

/**
Copies elements from one array to another. Similar to Java's Sysmte.arrayCopy
method.
*/
arrayCopy : function (dest, doffset, src, soffset, len)
{
    dest = dest || new Array(len);
    for (var i = 0; i < len; ++i)
        dest[doffset + i] = src[soffset + i];
    return dest;
},

destroy : function ()
{
    for (var i = 0, n = arguments.length; i < n; ++i)
    {
        var obj = arguments[i];

        if (!obj)
            continue;
        else if (obj instanceof Array)
            arguments.callee.apply(this, obj);
        else if (obj.destroy instanceof Function)
            try
            {
                obj.destroy();
            }
            catch (e)
            {
                $log("Exception thrown by destroy method: " + e.message);
            }
    }
},

/**
This method returns the type of the given object. This is superior to typeof in
many ways. See these posts:

http://blog.360.yahoo.com/blog-TBPekxc1dLNy5DOloPfzVvFIVOWMB0li?p=916
http://thinkweb2.com/projects/prototype/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
http://juhukinners.com/2009/01/11/typeof-considered-useless-or-how-to-write-robust-type-checks/

Here is a summary table of the results from this method and typeof:

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

@param obj The object for which the type is desired.
@return The type of the given object.
*/
getType : function ()
{
    var isClass = $mixin.isClass, toString = Object.prototype.toString;

    return function (obj)
    {
        if (!obj)
        {
            if (obj === undefined)
                return "undefined"
            if (obj === null)
                return "null";
        }
        else if (isClass(obj))
            return "class";
        else if (obj.getClass) // major performance issue w/o this test in FF3
        {
            try
            {
                var c = obj.getClass();
                if (isClass(c))
                    return c.getFullName();
            }
            catch (e) { }
        }

        return toString.call(obj).slice(8, -1).toLowerCase();
    }
}()

});

//-----------------------------------------------------------------------------

zjs.copyProps(Function.prototype,
{
    getArgumentNames : function () // from Prototype.js argumentNames
    {
        var names = this.toString().match(/^[\s\(]*function[^(]*\(([^\)]*)\)/)[1]
                      .replace(/\s+/g, '').split(',');
        return names.length == 1 && !names[0] ? [] : names;
    },

    /**
    Returns the full name of this function.
    */
    getFullName : function ()
    {
        var meta = zjs.getMeta(this), s = meta.fullname, trg = meta.target;
        if (trg)
        {
            s += "~" + (meta.binding || "") + ">";
            if (trg instanceof Function)
                s += trg.getFullName();
            else if (trg instanceof Array)
            {
                s += "[";
                for (var i = 0, n = trg.length; i < n; ++i)
                    s += (i ? "," : "") + trg[i].getFullName();
                s += "]";
            }
        }
        return s;
    },

    /**
    Returns the name of this function.
    */
    getName : function ()
    {
        return zjs.getMeta(this).name;
    },

    /**
    Binds the given object as a permanent "this" pointer to this function.

    For example:

        function foo () { ... }
        var bar = { ... };
        var fn = foo.bind(bar);
        fn(4,2); // equivalent to: foo.call(bar, 4, 2)
    */
    bind : function (obj)
    {
        var method = this, n = arguments.length;
        if (n > 1)
            method = this.head.apply(this, zjs.arrayCopy(null, 0, arguments, 1, n-1));

        var f = function () { return method.apply(obj, arguments); }

        return zjs.addMeta(f, { binding : "bind", target : method });
    },

    /**
    Binds the given object as a permanent "this" pointer to this function.
    The "this" context for each call to the returned function object is then
    passed as the 1st argument to this function.

    For example:

        function foo (obj, ...) { ... }
        var bar = { ... };
        var baz = { fn : foo.bind2(bar) };
        baz.fn(4, 2); // equivalent to: foo.call(bar, baz, 4, 2);
    */
    bind2 : function (obj)
    {
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

        function foo () { ... }
        var fn = foo.head("a", "b");
        fn(4, 2); // equivalent to: foo("a", "b", 4, 2);
    */
    head : function () // (...)
    {
        var method = this, first = zjs.array(arguments);
        var f = function () {
                var args = first.concat(zjs.array(arguments));
                return method.apply(this, args);
            };
        return zjs.addMeta(f, { binding : "head", target : method });
    },

    /**
    Creates a function that passes stored parameters to this function.

    For example:

        function foo () { ... }
        var fn = foo.tail("a", "b");
        fn(4, 2); // equivalent to: foo(4, 2, "a", "b");
    */
    tail : function () // (...)
    {
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

        function foo () { return "a"; }
        var fn = foo.returns(42);
        var x = fn(4, 2);  // equivalent to: foo(4, 2) but returns 42.
    */
    returns : function (ret)
    {
        var method = this;
        var f = function () { method.apply(this, arguments); return ret; };
        return zjs.addMeta(f, { binding : "returns", target : method });
    },

    /**
    Creates a function that does not pass on its parameters to this function.

    For example:

        function foo () { ... }
        var fn = foo.seal();
        fn(4, 2); // equivalent to: foo();

        fn = foo.head("a", "b").seal();
        fn(4, 2); // equivalent to: foo("a", "b");
    */
    seal : function ()
    {
        var method = this;
        var f = function () { return method.apply(this); };
        return zjs.addMeta(f, { binding : "seal", target : method });
    },

    /**
    Creates a function that calls this function and 1+ other functions. All
    parameters are passed along and the return value of the last method is
    returned.

    For example:

        function foo () { ...; return 42; }
        function bar () { ...; return 427; }
        function jaz () { ...; return 31415; }
        var fn = jaz.tee(foo, bar);

        var ret = fn(4, 2);

        // equivalent to:
        //    foo(4, 2);
        //    bar(4, 2);
        //    var ret = jaz(4, 2);
    */
    tee : function () // (...)
    {
        var targets = [];
        for (var i = 0, n = arguments.length; i < n; ++i)
            if (typeof(arguments[i]) === "function")
                targets.push(arguments[i]);
        n = targets.length + 1;
        if (n == 1)
            return this;
        targets.push(this);

        var f = function ()
        {
            var ret;
            for (var i = 0; i < n; ++i)
                ret = targets[i].apply(this, arguments);
            return ret;
        };

        return zjs.addMeta(f, { binding : "tee["+n+"]", target : targets });
    }
});
