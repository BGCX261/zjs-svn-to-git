/*=============================================================================
    zjs-x.js
    Copyright (C) 2008, Donald W. Griffin
    All rights reserved.
    [MIT license -- see license.txt for details]

    Adds extra goodies (mostly to Function.prototype and String.prototype).

=============================================================================*/

$namespace(zjs, {

/**
 Concats any number of given array parameters into a single array.
 */
arrayCat : function ()
{
    var ret = new Array(zjs.arrayLen.apply(null, arguments));
    for (var i = 0, k = 0; i < arguments.length; ++i)
        for (var a = arguments[i], n = (a ? a.length : 0), j = 0; j < n; ++j)
            ret[k++] = a[j];
    return ret;
},

arrayCopy : function (dest, doffset, src, soffset, len)
{
    dest = dest || [];
    for (var i = len; i-- > 0; )
        dest[doffset + i] = src[soffset + i];
    return dest;
},

/**
 Returns the sum of the lengths of all array parameters.
 */
arrayLen : function ()
{
    var ret = 0;
    for (var a, i = 0; i < arguments.length; ++i)
        if (a = arguments[i])
            ret += a.length;
    return ret;
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
            try {
                obj.destroy();
            }
            catch (e) {
                $panic("Exception thrown by destroy method: " + e.message);
            }
    }
}

});

//-----------------------------------------------------------------------------

zjs.copyProps(Function.prototype,
{
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
        var method = this;
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
                var args = zjs.arrayCat([this], arguments);
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
        var method = this, first = zjs.arrayCat(arguments);
        var f = function () {
                var args = zjs.arrayCat(first, arguments);
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
        var method = this, last = zjs.arrayCat(arguments);
        var f = function () {
                var args = zjs.arrayCat(arguments, last);
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
        var fn = foo.tee(bar, jaz);

        var ret = fn(4, 2);

        // equivalent to:
        //    foo(4, 2);
        //    bar(4, 2);
        //    var ret = jaz(4, 2);
     */
    tee : function () // (...)
    {
        var targets = zjs.arrayCopy([], 1, arguments, 0, arguments.length);
        targets[0] = this;

        var f = function ()
        {
            var ret, count = targets.length;
            for (var i = 0; i < count; ++i)
                ret = targets[i].apply(this, arguments);
            return ret;
        };

        return zjs.addMeta(f, { binding : "tee["+count+"]", target : targets });
    }
});

//-----------------------------------------------------------------------------

zjs.copyProps(String.prototype,
{
    /** Returns this string modified by capitalizing the first character. */
    capitalize : function ()
    {
        return this.charAt(0).toUpperCase() + this.substring(1);
    },

    /**
     Converts this string into "camel case". For example, "foo-bar" becomes
     "fooBar". The splitChar determines how the words are divided. The first
     word is unchanged. All other words are capitalized and concatenated. The
     primary use case for this conversion is to convert CSS names to script
     property names (e.g., "background-color" to "backgroundColor").
     */
    camelize : function (splitChar)
    {
        var parts = this.split(splitChar || "-"), ret = parts[0];

        for (var i = 1, n = parts.length; i < n; ++i)
            ret += parts[i].capitalize();

        return ret;
    },

    /** Returns true if this string ends with a given string. */
    endsWith : function (s)
    {
        return (this.length >= s.length) && this.right(s.length) == s;
    },

    /** Returns true if this and another string are equal ignoring case. */
    equalsIgnoreCase : function (s)
    {
        return this.toLowerCase() == s.toLowerCase();
    },

    /** Returns the left-most n character of this string. */
    left : function (n)
    {
        return this.substring(0, Math.max(0, Math.min(n, this.length)));
    },

    /** Returns the right-most n character of this string. */
    right : function (n)
    {
        var k = this.length;
        return this.substring(k - Math.max(0, Math.min(n, k)));
    },

    /** Returns true if this string starts with a given string. */
    startsWith : function (s)
    {
        return (this.length >= s.length) && this.left(s.length) == s;
    }
});
