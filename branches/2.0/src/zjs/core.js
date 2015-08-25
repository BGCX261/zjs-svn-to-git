/*=============================================================================
    zjs/core.js
    Copyright (C) 2008-2009, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/

/**
Alerts and/or logs a panic message. These are always "bad" things, so it is a
good idea to set a break point on the first line.
*/
function $panic (msg)
{
    $log("PANIC: " + msg, "error");
    $throw(msg);
}

/**
Asserts that the given condition is true. If not, an exception is thrown. The
arguments beyond the first, if any, are concatenated into an error message. It
is a good idea to pass several string fragments instead of passing one already
built since the assert may not fire and the message not be needed.

@param cond The boolean condition to test (that should be true).
*/
function $assert (cond /*, fragment1, fragment2, ... */)
{
    if (cond)
        return;

    var s = null;
    for (var i = 1, n = arguments.length; i < n; ++i)
        s = (s || "") + arguments[i];

    $panic(s || "ASSERT failed!");
}

/**
Alerts and/or logs a message.
*/
function $log (msg, type)
{
    var t = type || "info";
    if (typeof(console) == "undefined")
        alert(t.toUpperCase() + ": " + msg);
    else if (t in console)
    {
        console[t](msg);
        if (console.open)
            console.open();
    }
}

/**
This method evaluates its argument and returns the result. This is a global
method to ensure no local symbols are included in the scope chain that might
create problems with the evaluated text. This is not a perfect "eval at global
scope", but it is close enough.
*/
function $eval ()
{
    return eval(arguments[0]);
}

/**
Wraps the given message (msg) in an Error object and throws it. By default, the
type of object is assumed to be Error, unless the 2nd parameter is supplied to
override that default.

@param msg The message to wrap in the error object.
@param type The type of error object. Default is Error.
@throws Error or the given type.
*/
function $throw (msg, type)
{
    var T = type || Error;
    var e = new T(msg);
    if (!e.message)
        e.message = msg; // IE prefers "description"
    throw e;
}

//---------------

/**
Ensures that a namespace exists and adds the given items to it. The items are
given as an object.

Forms:
  1. $namespace(nspace, { ... });
  2. $namespace("nspace.sub");
  3. $namespace("nspace.sub", { ... });
  4. $namespace(nspace, "sub");
  5. $namespace(nspace, "sub", { ... });

@param ns The parent namespace.
@param sub The name of the sub-namespace.
@param add The members to add to the (possibly new) namespace.
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

    if (!add)
        return;

    parts = [];
    for (var name in add)
        if (!$namespace.isConditional(add, name, parts))
        {
            var v = add[name], problem = null;
            if (v.$override)
            {
                v = zjs.addMeta(v.value, { callNext : ns[name] });
                if (!(ns[name] instanceof Function) || !(v instanceof Function))
                    problem = "cannot override ";
            }
            else if (v.$overwrite)
                v = v.value;
            else if (v.$replace)
            {
                if (!(name in ns))
                    problem = "cannot replace ";
                v = v.value;
            }
            else if (name in ns)
                problem = "conflict with ";

            $assert(!problem,
                      "Namespace ",ns.$meta.fullname," ",problem,"'",name,"'");

            ns[name] = v;
            if (v && v.$namespaceConnect)
                v.$namespaceConnect(ns, name);
        }

    for (i = 0; i < parts.length; ++i)
        $namespace(ns, parts[i]); // form #1
}

/** The global namespace. */
$namespace.global = function () { return this; }();

/**
This method decides if the named member is a conditional expression. These are
of the form "?expr" or "=expr" where the "expr" part is evaluated (using $eval).
If the name is one of these forms, this method will return true and place the
appropriate information in the given arrays. Otherwise, this method will return
false.

For boolean conditional members (begining with "?") the evaluated condition will
determine if the associated value is included. For selection conditional members
(begining with "="), the value of the expression is used to select a member of
the value as the value to include.

For example:

    $namespace(foo, {

    "?zjs.browser.ie" :
    {
        bar : function () { ... },
        bif : function () { ... }
    }

    });

The above will add "bar" and "bif" to the "foo" namespace when "zjs.browser.ie"
evaluates true. Boolean conditional members whose values are functions (and whose
expressions evaluate true) are executed and their return value is added to values.

For example:

    $namespace(foo, {

    "?zjs.browser.ie" : function ()
    {
        function helper () { ... }

        return (
        {
            bar : function () { ... },
            bif : function () { ... }
        }};
    }

    });

The above idiom is commonly used to create a scope to which only "bar" and "bif"
have access. In other circumstances, this anonymous function is called inline to
return its object. While this will work, it is wasteful in this case because the
function need only be called when the expression is true. Since a function object
would not be an appropriate value in this case, the decision to call the function
should not create any surprises.

For selection conditional members, the value of the expression determines which
member is selected. For example:

    $namespace(foo, {

    "=zjs.browser.engine" :
    {
        msie :
        {
            bar : function () { ... },
            bif : function () { ... }
        },
        gecko :
        {
            bar : function () { ... },
            bif : function () { ... }
        },
        webkit :
        {
            bar : function () { ... },
            bif : function () { ... }
        },
        "*" :
        {
            bar : function () { ... },
            bif : function () { ... }
        }
    }

    });

The selection expression value is processed by first looking for a property of
the expression value, or basically, "value[eval(expr)]". If that property is not
a member of the object, the "*" member is used (if present). Essentially, the
"*" member is the default cause of the "switch".

As with the boolean conditional member, if the value of the property is a function,
it is called. For example:

    $namespace(foo, {

    "=zjs.browser.engine" :
    {
        msie : function ()
        {
            return (
            {
                bar : function () { ... },
                bif : function () { ... }
            });
        },
        gecko : function ()
        {
            return (
            {
                bar : function () { ... },
                bif : function () { ... }
            });
        },
        webkit : function ()
        {
            return (
            {
                bar : function () { ... },
                bif : function () { ... }
            });
        },
        "*" : function ()
        {
            return (
            {
                bar : function () { ... },
                bif : function () { ... }
            });
        }
    }

    });

@param container The container of the named member.
@param name The name of the member in the given container. This name may be a
conditional expression rather than a normal name.
@param values The array to store values of conditional members when they evaluate
true.
@param names The array to store the "names" of the conditional members that have
evaluated to true.
@return True if the name is a conditional expression, false if not.
*/
$namespace.isConditional = function (container, name, values, names)
{
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
}

/** The global namespace $meta data. */
var $meta = { fullname : "", name : "", namespace : null, subNamespaces : [] };

/**
Marks a namespace method as an override of a current namespace function. If any
of these characteristics are unmet, an $assert will fire. The newly added method
can use $super to access the previous namespace method.
*/
function $override (fn)
{
    return { $override : true, value : fn };
}

/**
Marks a namespace member so as to overwrite any potentially existant member. It
is valid for their not to be a member, but if there is, it is simply overwritten.
*/
function $overwrite (v)
{
    return { $overwrite : true, value : v };
}

/**
Marks a namespace member as an replacement of a current namespace member. If any
of these characteristics are unmet, an $assert will fire. The newly added member
simply replaces the previous member.
*/
function $replace (v)
{
    return { $replace : true, value : v };
}

//----------------------------
// Create the zjs namespace.

$namespace("zjs", {

/**
This is the container for various configuration properties.
*/
config :
{
    /**
    True if a debugger is present, false if not. This is initialized based on
    detecting Firebug, but can be forced to true as needed.
    */
    debug : (typeof(console) != "undefined" && console.firebug)
},

/**
Adds properties to the $meta container of the given object.

@param obj The object to which meta data is to be added.
@param meta The object containing the meta data properties to add.
*/
addMeta : function (obj, meta)
{
    zjs.copyProps(zjs.getMeta(obj), meta);
    return obj;
},

/**
Creates and returns a new object that has the given object as its prototype object.

@param base The object that will be the prototype of the returned new object.
@return A new object that has the given object as its prototype object.
*/
chain : function ()
{
    function T () { }

    return function (base)
    {
        T.prototype = base;
        return new T();
    }
}(),

/**
Copies the properties of a given source object (from) to a target object (to).

@param to The target object to which properties will be copied.
@param from The source object from which properties will be copied.
@return The target object (to).
*/
copyProps : function (to, from)
{
    if (to && from)
        for (var s in from)
            to[s] = from[s];
    return to;
},

/**
Dereferences an expression in the context of a given object. In other words, all
variables in the expression are interpreted as dereferencing the context object.

For example:

        var obj = { foo : [ { bar : 42 } ] };
        var val = zjs.deref(obj, "foo[0]");

        assertTrue(obj.foo[0] === val);

The supported syntax includes dot operator and array indexing using numeric values
or quoted strings (single or double).

For example:

        val = zjs.deref(obj, "foo[0]['bar']");

        assertTrue(obj.foo[0].bar === val);

@param object The context object to dereference.
@param expr The expression to evaluate in the given object's context.
@return The result of the specified expression dereferencing the given object.
*/
deref : function ()
{
    var kConstant = /^(\d+(?:\.\d*)?)|(?:[']([^']*)['])|(?:["]([^"]*)["])/;
    var kPattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;

    return function (object, expr)
    {
        var ctx = object, comp;
        var m = kPattern.exec(expr), cm;
        if (m == null)
            return undefined;

        while (m != null)
        {
            if (m[1].charAt(0) != '[')
                comp = m[1];
            else if ((cm = kConstant.exec(m[2])))
                comp = cm[1] || cm[2] || cm[3];
            else
                comp = zjs.deref(object, m[2]);

            ctx = ctx[comp];
            if (null == ctx || '' == m[3])
                break;
            expr = expr.substring('[' == m[3] ? m[1].length : m[0].length);
            m = kPattern.exec(expr);
        }

        return ctx;
    }
}(),

/**
Returns the $meta data property of the given object, adding one as needed.

@param obj The object for which meta data is desired.
@param noadd When true, $meta is returned only if already present.
@return The meta data object for the given object.
*/
getMeta : function (obj, noadd)
{
    var ret = obj.$meta;
    if (!ret && !noadd)
        obj.$meta = ret = (obj.$metaInit ? obj.$metaInit() : {});
    return ret;
},

/**
This is a placement of $namespace.isConditional in the zjs namespace.
*/
isConditional : $namespace.isConditional

}); // namespace zjs

//-----------------------------------------------------------------------------

// Adds extra goodies to Function.prototype
zjs.copyProps(Function.prototype,
{
    /**
    Creates a fresh $meta data for this function object.
    */
    $metaInit : function ()
    {
        var regex = /function\s*(\w*)/;

        return function ()
        {
            var name = this.name || this.toString().match(regex)[1];
            name = name || "~anonymous~";
            return { fullname : name, name : name };
        }
    }(),

    /**
    Called when a function is added to a namespace. We take the opportunity to
    add $meta data.
    */
    $namespaceConnect : function (ns, name)
    {
        var fn = (ns.$meta && ns.$meta.fullname) ? (ns.$meta.fullname + "." + name) : name;
        zjs.addMeta(this, { fullname : fn, name : name, namespace : ns });
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

/**
This object is used to identify special cases. It is used to differentiate the
act of derivation from normal object instantiation so that the "ctor" method is
not called when a class is extended.
*/
$class.marker = {};

/**
Finishes the given class. This is a separate method so it can be customized by
the user as necessary. By default, this method adds the getClass method.

@param klass The class to finish.
@return The class object.
*/
$class.finish = function (klass)
{
    return $mixin(klass, undefined,
    {
        getClass : function () { return klass; }
    });
}

/**
This method completes the connection of the methods for the given class. This
is the same operation for static and non-static members.
*/
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

/**
This method is called when a class is connected to a namespace (or outer class).

@param ns The namespace (or outer class) to which this class is now connected.
@param name The name of this class in the namespace or outer class.
*/
$class.namespaceConnect = function (ns, name)
{
    Function.prototype.$namespaceConnect.call(this, ns, name); // our "super"

    $class.connectMethods(this, this); // static class members
    $class.connectMethods(this, this.prototype); // non-static class members
}

/**
Creates a new object of the specified type using the given ctor arguments. The
new object is returned.

@param T The type of object to create (must be a ZJS-defined class).
@param args The constructor arguments array.
@return The newly created object.
*/
function $new (T, args)
{
    var ret = new T($class.marker); // don't call ctor method
    var ctor = ret.ctor;
    if (!ctor)
        return ret;

    if (args)
        ctor.apply(ret, args);
    else
        ctor.call(ret);

    return ret;
}

/**
Modifies a given class by adding additional class members. To distinguish
between different mixins, the tag parameter is used to name each mixin for a
class. The tag should be unique to each mixin on a given class.
*/
function $mixin (klass, tag, members)
{
    var isClass = $mixin.isClass(klass), suffix = tag ? ("("+tag+")") : null;
    var names = [], values = [];

    for (var name in members)
        if (!zjs.isConditional(members, name, values, names))
        {
            var mem = members[name], isStatic = mem && (mem.$static === $class.marker);

            if (isStatic)
                mem = mem.value; // unwrap the real value
            else
                isStatic = !isClass || $mixin.isClass(mem);

            var scope = isStatic ? klass : klass.prototype;

            if (mem instanceof Function)
                if ($mixin.func(klass, scope, mem, isStatic, name, suffix))
                    continue;

            scope[name] = mem;
        }

    for (var i = 0; i < names.length; ++i)
        $mixin(klass, (tag || "") + names[i], values[i]);

    return klass;
}

/**
Performs the process of mixing in a function member (a method). This may involve
insertion into the method chain based on method priority.
*/
$mixin.func = function (klass, scope, mem, isStatic, name, suffix)
{
    zjs.addMeta(mem, { $class: klass, $static: isStatic, name: name });
    var meta = mem.$meta, mp = meta.priority = (meta.priority || 0); // sets priority!

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
Returns true if the parameter passed represents a class generated by $class.
@return True if the parameter passed represents a class generated by $class.
*/
$mixin.isClass = function (klass)
{
    if (!(klass instanceof Function) || !klass.$meta)
        return false;

    // Only a class should have a $super property in its meta-data:
    return klass.$meta.$super !== undefined;
}

/**
Decorates a method with a call priority. This is used by $mixin to order the
method call chain.

@param pr The priority of the given method.
@param fn The function object.
@return The given function object (now with its priority set).
*/
function $priority (pr, fn)
{
    if (fn.$static === $class.marker) // if (member is static)
        fn = fn.value; // get the real method

    if (fn instanceof Function)
        zjs.addMeta(fn, { priority : pr });
    else
        $panic("Invalid arg");
    return fn;
}

/**
Creates a class that is instantiate on the first call of getInstance. Further,
that is the only way to create an instance of that class. In almost every other
way, this use is the same as $class.

For example:

    Foo : $singleton(null,
    {
        ctor : function () { this.foo = 427; },
        bar : $static(function () { return 42; }),
        bif : function () { return this.foo; }
    })

    var f = Foo.getInstance(); // lazy creates single instance on first call
    var x = f.bif(); // = 427
    var y = Foo.bar(); // = 42

    var f2 = new Foo(); // ERROR
*/
function $singleton (base, members)
{
    var klass = $class(base, members), theOne, allow = false;

    $mixin(klass, "$singleton",
    {
        ctor : function ()
        {
            if (!allow)
                $throw("Cannot instantiate singleton");
            allow = false;

            $super(arguments).call(this);
        },

        getInstance : $static(function ()
        {
            if (!theOne)
            {
                allow = true;
                theOne = new klass();
            }

            return theOne;
        })
    });

    return klass;
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

/**
This method is returned by $super when there is no real super method.
*/
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

$namespace(zjs, {

/**
This class is the base for all enumerations.
*/
Enum : $class(null,
{
    /**
    Initializes this object with its essential properties.

    @param id The unique ID of this enumerated constant.
    @param name The name of this enumerated constant.
    @param ordinal The user's (implicitly or explicitly) specified value.
    */
    ctor : function (id, name, ordinal)
    {
        this.id = id;
        this.name = name;
        this.ordinal = ordinal;
    },

    /**
    Calls the user-specified method fn for every enumerated constant. Each call
    is given the next constant.

    @param fn The callback to call with each enumerated constant as a parameter.
    */
    forEach : $static(function (fn)
    {
        var values = this.values;
        for (var i = 0, n = values.length; i < n; ++i)
            fn(values[i]);
    }),

    /**
    Parses the given name to find a matching enumerated constant.

    @param name The name of the constant to find.
    @return The enumerated constant of the given name or null if not found.
    */
    parseName : $static(function (name)
    {
        var values = this.values;
        for (var i = 0, n = values.length; i < n; ++i)
        {
            var v = values[i];
            if (v.name == name)
                return v;
        }

        return null;
    }),

    /**
    Returns the full name of this enumerated constant.

    @return The full name of this enumerated constant.
    */
    getFullName : function ()
    {
        return this.getClass().getFullName()+"."+this.name;// requires ext.js
    }
}) // class Enum

}) // namespace zjs

/**
Declares an enumeration type. Each enumerated constant is essentially a static
member of the class generated for the enum. Further, each enum constant has the
following essential properties:

  * id : the ID (index of the enumerated constant in the list of constants)
  * name : the user-given name
  * ordinal : the associated value (either implicit or explicit)

Because an enum, as in Java, is just a normal class, that class can have user
defined contents. By default, an enum has several predefined methods and
properties. Each enum class comes with two static methods:

  * forEach
  * parseName

It also has a static array called "values" that holds a reference to each of the
enumerated constant objects. There is also an instance method:

  * getFullName

To avoid ambiguity with other static members, it is best to use all capital
letters for enum constants. For example,

    $namespace("foo", {

    State : $enum(["FOO", "BAR", "FOOBAR"])

    });

    var s = foo.State.FOO;

    assertTrue(foo.State.FOOBAR instanceof foo.State);

The ordinal values are assigned by default as 0, 1, 2 and so forth. These can
be specified if desired:

    $namespace(foo, {

    State : $enum(["FOO", "BAR=42", "FOOBAR"])

    })

In the above example, we would have:

    foo.State.FOO.ordinal == 0
    foo.State.BAR.ordinal == 42
    foo.State.FOOBAR.ordinal == 43

To add user-defined methods to an enum, you add them via the 2nd argument to
this method:

    $namespace("foo", {

    State : $enum(["FOO", "BAR", "FOOBAR"],
    {
        method : function (x) { return this.name + x; }
    })

    });

This form of $enum calls $mixin using the 2nd argument. Furhter mixins are also
possible. Given the above:

    assertEquals("BAR__", foo.State.BAR.method("__"));

Lastly, as with Java, each constant instance can have its own methods and/or
overrides. These are added in a similar way but immediately following the enum
constant.

    $namespace("foo", {

    State : $enum
    ([
        "FOO",
        "BAR",
        {
            method : function (x) { return $super(arguments,this) + "!!"; }
        }
        "FOOBAR"
    ],
    {
        method : function (x) { return this.name + x; }
    })

    });

Given the above:

    assertEquals("FOOBAR__", foo.State.FOOBAR.method("__");
    assertEquals("BAR__!!", foo.State.BAR.method("__");
*/
function $enum (names, members)
{
    // Create the class for the enumeration:
    var Enum = $class(zjs.Enum,
    {
        values : $static([]),

        forEach : $static(function (fn)
        {
            return zjs.Enum.forEach.call(this, fn);
        }),

        parseName : $static(function (name)
        {
            return zjs.Enum.parseName.call(this, name);
        })
    });

    if (members)
        $mixin(Enum, "$enum", members); // mixin any user-specified content

    // Create the instance (one per enumeration constant):
    for (var i=0, n=names.length, ord=0, index=0; i < n; ++i, ++ord, ++index)
    {
        var nm = names[i], m = $enum.valueRegEx.exec(nm);
        $assert(m, "Invalid enum constant: '", nm, "'");

        var en = new Enum(index, m[1], m[2] ? (ord = parseInt(m[2])) : ord);

        if (i + 1 < n && typeof(names[i+1]) != "string")
            $mixin(en, "$enum", names[++i]); // mixin constant-specific content

        Enum.values.push(en); // add to values[]
        Enum[en.name] = en; // add as a static class member
    }

    // Now that we've created all the instances we want, we add a ctor (with a
    // rather high priority) that will not allow new instances.
    $mixin(Enum, "sealed", {
        ctor : $priority(9e99, function () { $throw("Cannot create enum"); })
    });

    return Enum;
}

/** This regex parses an enum's "IDENT=###" syntax where "=###" is optional. */
$enum.valueRegEx = /^([a-z_]\w*)\s*(?:[=]\s*([+-]?\d+))?$/i;

/**
Registers the current module. This method should be called at the top of a .js
file, much like a package statement in Java.

@param modpath The module path of the registering module.
*/
function $module (modpath)
{
    var first = $module.register(modpath);

    $assert(first, "Module '"+modpath+"' already registered");

    $module.current = modpath;
}

$module.hook = function() { }; // overridden by zjs.import
$module.inventory = [];
$module.registry = { };

/**
Registers the current module.

@param modpath The module path of the registering module.
@return True if this was the first time the given module was registered.
*/
$module.register = function (modpath)
{
    $module.hook(modpath);
    if ($module.registry[modpath])
        return false;

    $module.inventory.push(modpath);
    $module.registry[modpath] = $module.inventory.length;
    return true;
}

$module("zjs.core");

/**
Declares that the given module path is required. If that module is not already
loaded, a $panic ensues (an exception).

@param modpath The module path of the required module.
*/
function $requires (modpath)
{
    if ($module.registry[modpath])
        return;

    var s = null, mod;

    for (var i = 0, n = $module.inventory.length; i < n; ++i)
        s = (s || "\nPresent:") + "\n  >> " + $module.inventory[i];

    if ($module.current)
        s = " (required by " + $module.current + ")" + s;

    $panic("Missing required module '" + modpath + "'" + s);
}

/**
Breaks from a $foreach loop and optionally returns a value. If an argument is
given, that is the return value of $foreach. If no argument is passed, the return
value is unchanged.

@param val The (optional) return value of $foreach.
@throws Always throw itself (the $break function object).
*/
function $break (val)
{
    if (arguments.length > 0)
        $break.value = val;
    throw $break;
}

/**
Decodes the intent of a previous call to $break. If the exception is not the one
thrown by $break, the exception is rethrown. Otherwise, the given return value
is returned or the value passed to $break is returned (if one was given).

@param e The exception that might be thrown by $break.
@param val The return value to use if one was not given to $break.
@return The value passed to $break or val.
@throws The given exception if it is not the $break function object.
*/
$break.decode = function (e, val)
{
    if (e !== $break)
        throw e;

    if (!("value" in $break))
        return val;

    var v = $break.value;
    delete $break.value; // avoid leaks
    return v;
}

/**
Iterates over the items in an array-like collection, calling a method for each.
There are two forms defines:

        function $foreach (it, fn);
        function $foreach (it, opt, fn);

The provided function must have the following signature:

        function fn (value, prevReturn, index);

The parameters are:

    * value - The current value being iterated.
    * prevReturn - The value returned from the last call of fn (starts as undefined).
    * index - The current index being iterated.

The first form is the simplest usage and looks like this:

    $foreach([1, 2, 3, 4], function (x)
    {
        // called with x=1, x=2, x=3 and x=4
    });

To end the loop early, use the $break method. For example:

    $foreach([1, 2, 3, 4], function (x)
    {
        if (x == 3)
            $break(); // don't iterate on x=4
    });

There are a couple ways to pass data from the loop back to the outside (other
than standard closure techniques). For starters, the return value of $foreach
is the value returned last by the function. For example:

    var v = $foreach([1, 2, 3, 4], function (x)
    {
        return x;
    });

    // v == 4

Also, $break can optionally set the return value:

    var v = $foreach([1, 2, 3, 4], function (x)
    {
        if (x == 3)
            $break();
        return x;
    });

    // v == 2 (last value returned up to $break)

    var v = $foreach([1, 2, 3, 4], function (x)
    {
        if (x == 3)
            $break(42);
        return x;
    });

    // v == 42

The previous iteration return value is supplied as a 2nd argument to the given
function. On the first call, this value is undefined. For example:

    var v = $foreach([1, 2, 3, 4], function (x, prev)
    {
        return x + (prev || 0);
    });

    // v == 10 (1+2+3+4)

Finally, there is the 3 argument form of $foreach. The 1st argument is still the
collection and the last argument (now 3rd) is the function. The 2nd argument is
an options object. The following option properties are defined:

  * begin - The begin index for the iteration (default = 0).
  * end - The end index for the iteration (default = length).
  * delta - The number of slots in the array to skip (default = 1).
  * value - The initial value to pass to the callback (default = undefined).

For example:

    var s = $foreach(["a","b","c","d","e"], { begin:1, end:4, delta:2, value:"_" },
        function (v, prev)
    {
        return prev + v;
    }

    // s = "_bd"

Since all of the properties have a default value, not all must be passed:

    var s = $foreach(["a","b","c","d","e"], { begin:1, end:4, value:"_" },
        function (v, prev)
    {
        return prev + v;
    }

    // s = "_bcd"

    var s = $foreach(["a","b","c","d","e"], { begin:1 }, function (v, prev)
    {
        return (prev || "") + v;
    }

    // s = "_bcde"
*/
function $foreach (it, opt, fn)
{
    if (arguments.length == 2) // if (usage $foreach(it, fn))
    {
        fn = opt;
        opt = undefined;
    }

    var len = (it ? it.length : 0), add = 1, beg = 0, end = len, val;

    if (opt)
    {
        add = opt.delta || 1;
        beg = opt.begin || 0;
        end = opt.end || len;
        val = opt.value;
    }

    try
    {
        delete $break.value;
        for (var i = beg; i < end; i += add)
            val = fn(it[i], val, i);
    }
    catch (e)
    {
        val = $break.decode(e, val);
    }

    return val;
}
