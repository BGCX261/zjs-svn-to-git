/*=============================================================================
    zjs.js
    Copyright (C) 2008, Donald W. Griffin
    All rights reserved.

    [MIT license]
    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
=============================================================================*/

/**
Alerts and/or logs a panic message. These are always "bad" things, so it is a
good idea to set a break point on the first line.
*/
function $panic (msg)
{
    if (!console)
        alert("PANIC: " + msg);
    else
    {
        console.error("PANIC: " + msg);
        if (console.open)
            console.open();
    }
}

/**
 Forms:
  1. $namespace(nspace, { ... });
  2. $namespace("nspace.sub");
  3. $namespace("nspace.sub", { ... });
  4. $namespace(nspace, "sub");
  5. $namespace(nspace, "sub", { ... });
 */
function $namespace (ns, sub, add) // forms #4 & #5
{
    if (typeof(ns) == "string") // forms #2 & #3
        { add = sub; sub = ns; ns = $namespace.global; }
    else if (typeof(sub) != "string") // form #1
        { add = sub; sub = null; }

    var parts = sub ? sub.split(".") : [];
    for (var i = 0; i < parts.length; ++i)
    {
        var s = parts[i], fn = ns.$meta.fullname;
        if (!ns[s])
            ns.$meta.subNamespaces.push(ns[s] = 
                { $meta : { subNamespaces : [], name : s, namespace : ns,
                  fullname : fn ? (fn + "." + s) : s } });
        ns = ns[s];
    }

    if (add)
        for (var name in add)
        {
            var v = add[name];
            if (ns[name])
                $panic("Namespace "+ns.$meta.fullname+" conflict with '"+name+"'");
            ns[name] = v;
            if (v instanceof Function)
                v.name = name;
            if (v && v.$namespaceConnect)
                v.$namespaceConnect(ns, name);
        }
}

/** The global namespace. */
$namespace.global = function () { return this; }();

/** The global namespace $meta data. */
var $meta = { fullname : "", name : "", namespace : null, subNamespaces : [] };

//----------------------------
// Create the zjs namespace.

$namespace("zjs", {

/**
 Adds properties to the $meta container of the given object.
 */
addMeta : function (obj, meta)
{
    zjs.copyProps(zjs.getMeta(obj), meta);
    return obj;
},

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

copyProps : function (to, from)
{
    for (var s in from)
        to[s] = from[s];
},

/**
 Returns the $meta data property of the given object, adding one as needed.
 */
getMeta : function (obj)
{
    var ret = obj.$meta;
    if (!ret)
        obj.$meta = ret = (obj.$metaInit ? obj.$metaInit() : {});
    return ret;
}

}); // namespace zjs

// Adds extra goodies to Function.prototype
zjs.copyProps(Function.prototype,
{
    /**
     Creates a fresh $meta data for this function object.
     */
    $metaInit : function ()
    {
        var name = this.name || this.toString().match(/function\s*(\w*)/)[1];
        name = name || "~anonymous~";
        return { fullname : name, name : name };
    },

    /**
     Called when a function is added to a namespace. We take the opportunity to
     add $meta data.
     */
    $namespaceConnect : function (ns, name)
    {
        var fn = ns.$meta.fullname ? (ns.$meta.fullname + "." + name) : name;
        zjs.addMeta(this, { fullname : fn, name : name, namespace : ns });
    },

    /**
     Returns the full name of this function.
     */
    getFullName : function ()
    {
        var meta = zjs.getMeta(this), s = meta.fullname;
        if (meta.target)
            s += "~" + (meta.binding || "") + ">" + meta.target.getFullName();
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
    head : function ()
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
    tail : function ()
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
        var f = function () { return method(); };
        return zjs.addMeta(f, { binding : "seal", target : method });
    }
});

// Adds extra goodies to String.prototype
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
        return this.substring(Math.min(n, this.length));
    },

    /** Returns the right-most n character of this string. */
    right : function (n)
    {
        var k = this.length;
        return this.substring(k - Math.min(n, k));
    },

    /** Returns true if this string starts with a given string. */
    startsWith : function (s)
    {
        return (this.length >= s.length) && this.left(s.length) == s;
    }
});

/**
 Defines a new class optionally derived from a given base. There are two forms
 of this method:

      1. $class(
         {
            member : function () { ... }
         ));

      2. $class(Base,
         {
            member : function () { ... }
         ));

 In form 2, the Base parameter can be null, which has the same meaning as the
 first form.

 Classes are not named until they are added to a namespace. For example:

      $namespace(foo,
      {
          Bar : $class(
          {
              member : function bif () { ... }
          })
      });
 */
function $class (base, members)
{
    var klass = function (marker)
    {
        if (marker === $class.marker)
            return;
        var ctor = this.ctor;
        if (ctor)
            ctor.apply(this, arguments);
    }

    klass.$meta = { $super : null };
    klass.$namespaceConnect = $class.namespaceConnect;

    if (arguments.length == 1)
        members = base;
    else if (base)
    {
        klass.prototype = new base($class.marker); // don't call ctor method
        klass.$meta.$super = base;
    }

    $mixin(klass, undefined, members);

    return $class.finish(klass);
}

$class.marker = {};
$class.finish = function (klass)
{
    return $mixin(klass, undefined,
    {
        getClass : function () { return klass; }
    });
}
$class.connectMethods = function (klass, scope)
{
    for (var name in scope)
    {
        var member = scope[name];
        if (member instanceof Function)
            if (zjs.getMeta(member).$class === klass)
                member.$namespaceConnect(klass, name);
    }
}
$class.namespaceConnect = function (ns, name)
{
    Function.prototype.$namespaceConnect.call(this, ns, name); // our "super"

    $class.connectMethods(this, this); // static class members
    $class.connectMethods(this, this.prototype); // non-static class members
}

/**
 Modifies a given class by adding additional class members. To distinguish
 between different mixins, the tag parameter is used to name each mixin for a
 class. The tag should be unique to each mixin on a given class.
 */
function $mixin (klass, tag, members)
{
    var suffix = tag ? ("(" + tag + ")") : null;

    for (var name in members)
    {
        var mem = members[name], isStatic = mem&&(mem.$static===$class.marker);
        if (isStatic)
            mem = mem.value; // unwrap the real value
        else
            isStatic = mem && mem.$meta && (mem.$meta.$super !== undefined);
        var scope = isStatic ? klass : klass.prototype;

        if (mem instanceof Function)
            if ($mixin.func(klass, scope, mem, isStatic, name, suffix))
                continue;

        scope[name] = mem;
    }

    return klass;
}

$mixin.func = function (klass, scope, mem, isStatic, name, suffix)
{
    zjs.addMeta(mem, { $class: klass, $static: isStatic, name: name });
    var meta = mem.$meta, mp = meta.priority = (meta.priority || 0);

    if (suffix) // class already defined
    {
        mem.$namespaceConnect(klass, name);
        meta.fullname += suffix;

        var cn, cm, cur = scope[name], GM = zjs.getMeta;
        if (cur && (cm = GM(cur)).priority <= mp)
            meta.callNext = cur;
        else if (cur)
        {
            while (cm.callNext && (cn = GM(cm.callNext)).priority > mp)
                cm = cn;
            meta.callNext = cm.callNext;
            cm.callNext = mem;
            return true;
        }
    }

    return false;
}

/**
 Decorates a method with a call priority. This is used by $mixin to order the
 method call chain.
 */
function $priority (pr, fn)
{
    if (fn.$static === $class.marker)
        fn = fn.value;

    if (fn instanceof Function)
        zjs.addMeta(fn, { priority : pr });
    else
        $panic("Invalid arg");
    return fn;
}

/**
 Wraps the given member so that $class will handle it as a static method. The
 difference is seen here:

      $namespace("N",
      {
          C : $class(
          {
              foo : function () { ... },
              bar : $static(function () { ... })
          })
      });

      var c = new N.C();

      c.foo();  // non-static
      N.C.bar(); // static
 */
function $static (member)
{
    return { $static : $class.marker, value : member };
}

/**
 Either returns the super method or calls it. The two argument form of this
 method is used like so:

      var ret = $super(arguments, this);

 The above will call the super method passing on the same arguments received.
 The returned value is that which was returned by the super method.

 Alternatively, $super can be used to pass a different set of arguments to the
 super class method. Like so:

      var ret = $super(arguments, this, [ ... ]);

 The 3rd argument is the arguments array to be passed. The arguments param is
 still needed to find the super class method.

 Finally, $super can be called with a single argument in order to find the super
 class method and return it. For example:

      var fn = $super(arguments);
      var ret = fn.call(this);

 In this usage, the return value is always a callable method. It may be the
 "do nothing" $super.none method, or a proper super method.
 */
function $super (args, that, params)
{
    if (arguments.length < 1 || arguments.length > 3)
        $panic("Bad call to $super");
    var c, GM = zjs.getMeta, fm = GM(args.callee), sup = fm.callNext;
    if (!sup && (c = GM(fm.$class).$super))
    {
        if (!fm.$static)
            sup = c.prototype[fm.name];
        else
            for (; !sup; c = GM(c).$super)
                sup = c[fm.name];
    }
    var fn = sup || $super.none;

    return (arguments.length == 1) ? fn : fn.apply(that, params || args);
}

$super.none = function () { }

/**
 Builds a string that is passed to the eval method to import symbols.
 */
function $using ()
{
    var ret = "";
    for (var i = 0, n = arguments.length; i < n; ++i)
    {
        var sym = arguments[i];
        if (sym.$meta && sym.$meta.subNamespaces) // if (namespace)
        {
            var fn = sym.$meta.fullname;
            for (var name in sym)
                if (name != "$meta")
                    ret += "var " + name + " = " + fn + "." + name + ";";
        }
        else if (sym.$meta && sym.$meta.namespace)
            ret += "var " + sym.$meta.name + " = " + sym.$meta.fullname + ";";
    }

    return ret;
}
