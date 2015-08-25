/*=============================================================================
    test/test.js
    Copyright (C) 2008, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/
$namespace("x.y", { z : 42 });
$namespace(x.y, { q : 427});
$namespace(x, { foo : function () { }});

$namespace("test",
{
    A : $class(
    {
        bif : function () { return "fib"; },
        foo : function () { return "foo"; },
        sfoo : $static(function (x) { return x + 1; })
    })
});

var globalVar = 42;

$namespace(test,
{
    B : $class(test.A,
    {
        foo : function () { return $super(arguments,this)+"-2"; },
        "?test.A.sfoo(1)==2" :
        {
            cfoo : function () { return "cfoo!"; },
            scfoo : $static(function () { return "scfoo!"; })
        },
        "?test.A.sfoo(1)==3" :
        {
            ncfoo : function () { return "cfoo!"; },
            nscfoo : $static(function () { return "scfoo!"; })
        },
        "=test.A.sfoo(1)" :
        {
            2:
            {
                cfoo2 : function () { return "cfoo2!"; },
                scfoo2 : $static(function () { return "scfoo2!"; })
            }
        },
        "=test.A.sfoo(2)" :
        {
            "*":
            {
                cfoo3 : function () { return "cfoo3!"; },
                scfoo3 : $static(function () { return "scfoo3!"; })
            }
        }
    }),
    C : $class(test.A,
    {
        bar : function () { return 42; },
        N : $class(
        {
            fiz : function () { return "fizzle!"; },
            Q : $class(
            {
                wow : function () { return "wow!"; }
            })
        })
    })
});

$namespace(test,
{
    D : $class(test.B,
    {
        bif : function () { return $super(arguments,null) + "!"; },
        foo : function () { return $super(arguments).call(this)+"-3"; },
        sfoo : $static(function (x) { return $super(arguments,null) * 2; })
    }),
    E : $class(test.C,
    {
        bar : function () { return $super(arguments, this) + 1; }
    })
});
$namespace(test,
{
    F : $class(test.E, function ()
    {
        function f ()
        {
            return this.x + 1;
        }

        return (
        {
            ctor : function (x) { this.x = x; },
            bar : function ()
            {
                return $super(arguments, this) * f.call(this);
            }
        });
    }()),

    Singleton : $singleton(test.D,
    {
        foo : function () { return $super(arguments).call(this)+"-42"; },
        sfoo : $static(function (x) { return $super(arguments,null) * 4; })
    }),

    Enum : $enum(["A", "B",
                  "C",
                  {
                      foo : function (s)
                      {
                          var ret = $super(arguments).call(this, s);
                          ret += "_C";
                          return ret;
                      },
                      getFullName : function ()
                      {
                          var s = $super(arguments, this);
                          return s + "_C";
                      }
                  },
                  "D", "E = 42", "F"],
                  {
                      foo : function (s)
                      {
                          return "foo" + this.name + s;
                      }
                  })
});

$mixin(test.E, "mx",
{
    bar : $priority(-1, function () { return $super(arguments,this) + 2; })
});

$mixin(test.E, "mx2",
{
    bar : $priority(1, function () { return $super(arguments,this) * 2; })
});

function mx (c)
{
    $mixin(c, "mx",
    {
        getClassName : function () { return this.getClass().getFullName(); }
    });
}

mx(test.E);
mx(test.D);

var testNamespace;

gTests.push
(
    function ()
    {
        $log("Warn $log test", "warn");
    },
    function ()
    {
        $log("Info $log test", "info");
    },
    function ()
    {
        $log("Debug $log test", "debug");
    },

    // $eval

    function ()
    {
        assertEquals(42, eval("globalVar"));
    },
    function ()
    {
        assertEquals(42, $eval("globalVar"));
    },
    function ()
    {
        var globalVar = 2;
        assertEquals(2, eval("globalVar"));
    },
    function ()
    {
        var globalVar = 2;
        assertEquals(42, $eval("globalVar"));
    },

    // $namespace
    function ()
    {
        testNamespace = 
            { $meta : { fullname : "", name : "", namespace : null, 
                        subNamespaces : [] } };

        var keep = $namespace.global;
        $namespace.global = testNamespace;

        $namespace("foo",
        {
            bar : function (s) { return "_" + s; }
        });

        $namespace.global = keep;

        assertEquals("_42", testNamespace.foo.bar("42"));
    },
    function ()
    {
        try
        {
            $namespace(testNamespace.foo,
            {
                bar : function (s) { return "###" + s; }
            });

            fail("Conflict detection failed");
        }
        catch (e) { }

        assertEquals("_42", testNamespace.foo.bar("42"));
    },
    function ()
    {
        $namespace(testNamespace.foo,
        {
            bar : $overwrite(function (s) { return "#" + s; })
        });

        assertEquals("#42", testNamespace.foo.bar("42"));
    },
    function ()
    {
        $namespace(testNamespace.foo,
        {
            bar : $override(function (s) { return $super(arguments)(s)+"!"; })
        });

        assertEquals("#42!", testNamespace.foo.bar("42"));
    },
    function ()
    {
        // ok to overwrite non-existant
        $namespace(testNamespace.foo,
        {
            bar2 : $overwrite(function (s) { return s+"!"; })
        });

        assertEquals("42!", testNamespace.foo.bar2("42"));
    },
    function ()
    {
        try
        {
            $namespace(testNamespace.foo,
            {
                bif : $override(function () { return "!"; })
            });

            fail("Nothing to override detection failed");
        }
        catch (e) { }

        assertFalse("bif" in testNamespace.foo);
    },

    function ()
    {
        $namespace(testNamespace.foo,
        {
            bar : $replace(function (s) { return s + "!"; })
        });

        assertEquals("42!", testNamespace.foo.bar("42"));
    },
    function ()
    {
        try
        {
            $namespace(testNamespace.foo,
            {
                bif : $replace(function () { return "!"; })
            });

            fail("Nothing to replace detection failed");
        }
        catch (e) { }

        assertFalse("bif" in testNamespace.foo);
    },

    function ()
    {
        var a = new test.A();
        assertEquals(test.A, a.getClass());
    },
    function ()
    {
        var b = new test.B();
        assertEquals(test.B, b.getClass());
    },
    function ()
    {
        var b = new test.B();
        assertEquals("cfoo!", b.cfoo());
    },
    function ()
    {
        var s = test.B.scfoo();
        assertEquals("scfoo!", s);
    },
    function ()
    {
        var b = new test.B();
        assertFalse("ncfoo" in b);
    },
    function ()
    {
        assertFalse("nscfoo" in test.B);
    },
    function ()
    {
        var b = new test.B();
        assertEquals("cfoo2!", b.cfoo2());
    },
    function ()
    {
        var s = test.B.scfoo2();
        assertEquals("scfoo2!", s);
    },
    function ()
    {
        var b = new test.B();
        assertEquals("cfoo3!", b.cfoo3());
    },
    function ()
    {
        var s = test.B.scfoo3();
        assertEquals("scfoo3!", s);
    },
    function ()
    {
        var c = new test.C();
        assertEquals(test.C, c.getClass());
    },
    function ()
    {
        var d = new test.D();
        assertEquals(test.D, d.getClass());
    },
    function ()
    {
        var e = new test.E();
        assertEquals(test.E, e.getClass());
    },
    function ()
    {
        var a = new test.A();
        assertEquals("foo", a.foo());
    },
    function ()
    {
        var b = new test.B();
        assertEquals("foo-2", b.foo());
    },
    function ()
    {
        var c = new test.C();
        assertEquals("foo", c.foo());
    },
    function ()
    {
        var c = new test.C();
        assertEquals(42, c.bar());
    },
    function ()
    {
        var d = new test.D();
        assertEquals("foo-2-3", d.foo());
    },
    function ()
    {
        var d = new test.D();
        assertEquals("fib!", d.bif());
    },
    function ()
    {
        assertEquals(42, test.D.sfoo(20));
    },
    function ()
    {
        var e = new test.E();
        assertEquals(90, e.bar());
    },
    function ()
    {
        var d = new test.D();
        assertTrue(d instanceof test.A);
    },
    function ()
    {
        var d = new test.D();
        assertTrue(d instanceof test.B);
    },
    function ()
    {
        var d = new test.D();
        assertTrue(!(d instanceof test.C));
    },
    function ()
    {
        var d = new test.D();
        assertTrue(d instanceof test.D);
    },
    function ()
    {
        eval($using(test));
        var d = new D(), e = new E();
    },
    function ()
    {
        eval($using(test.E));
        var e = new E();
    },
    function ()
    {
        var f = new test.F(2);
        assertEquals(270, f.bar());
    },
    function ()
    {
        var f = new test.C.N();
        assertEquals("fizzle!", f.fiz());
    },
    function ()
    {
        var q = new test.C.N.Q();
        assertEquals("wow!", q.wow());
    },

    // Singleton

    function ()
    {
        try
        {
            var s = new test.Singleton();
        }
        catch (e)
        {
            return; // OK
        }
        fail("Cannot use new on Singleton");
    },
    function ()
    {
        var s = test.Singleton.getInstance();
        assertTrue(s instanceof test.Singleton);
    },
    function ()
    {
        var s = test.Singleton.getInstance();
        assertEquals("foo-2-3-42", s.foo());
    },
    function ()
    {
        var s = test.Singleton.getInstance();
        assertEquals("fib!", s.bif());
    },
    function ()
    {
        assertEquals(42*4, test.Singleton.sfoo(20));
    },

    // $foreach

    function ()
    {
        var s = "_";
        $foreach(["a","b","c","d"], function (c)
        {
            s += c;
        });

        assertEquals("_abcd", s);
    },
    function ()
    {
        var s = "_";
        $foreach(["a","b","c","d"], function (c)
        {
            s += c;
            if (c === "c")
                $break();
        });

        assertEquals("_abc", s);
    },
    function ()
    {
        var s = $foreach(["a","b","c","d"], function (c, prev)
        {
            return c + (prev || "_");
        });

        assertEquals("dcba_", s);
    },
    function ()
    {
        var s = $foreach(["a","b","c","d"], function (c, prev, i)
        {
            return c + i + (prev || "_");
        });

        assertEquals("d3c2b1a0_", s);
    },
    function ()
    {
        var s = "_";
        $foreach(["a","b","c","d"], { begin:1 }, function (c)
        {
            s += c;
        });

        assertEquals("_bcd", s);
    },
    function ()
    {
        var s = "_";
        $foreach(["a","b","c","d"], { begin:1, end:3 }, function (c)
        {
            s += c;
        });

        assertEquals("_bc", s);
    },
    function ()
    {
        var s = "_";
        $foreach(["a","b","c","d","e","f"], { begin:1, end:5, delta:2 }, function (c)
        {
            s += c;
        });

        assertEquals("_bd", s);
    },
    function ()
    {
        var s = "_";
        $foreach(["a","b","c","d","e","f"], { begin:1, delta:2 }, function (c)
        {
            s += c;
        });

        assertEquals("_bdf", s);
    },
    function ()
    {
        var s =
        $foreach(["a","b","c","d","e"], { begin:1, value:"%" }, function (c, prev)
        {
            return prev + c;
        });

        assertEquals("%bcde", s);
    },
    function ()
    {
        var s =
        $foreach(["a","b","c","d","e"], { value:"%" }, function (c, prev, i)
        {
            if (i == 4)
                $break();
            return prev + c;
        });

        assertEquals("%abcd", s);
    },
    function ()
    {
        var s =
        $foreach(["a","b","c","d","e"], { value:"%" }, function (c, prev, i)
        {
            if (i == 4)
                $break(prev + "!!");
            return prev + c;
        });

        assertEquals("%abcd!!", s);
    },

    // $new

    function ()
    {
        var C = $class(null,
        {
            ctor : function ()
            {
                this.args = [];
                for (var i = 0; i < arguments.length; ++i)
                    this.args.push(arguments[i]);
            }
        });

        var c = $new(C);
        assertEquals(0, c.args.length);

        c = $new(C, [C]);
        assertEquals(1, c.args.length);
        assertTrue(c.args[0] === C);

        c = $new(C, [10,20]);
        assertEquals(2, c.args.length);
        assertEquals(10, c.args[0]);
        assertEquals(20, c.args[1]);
    },

    // Enum

    function ()
    {
        try
        {
            var en = new test.Enum();
        }
        catch (e)
        {
            return; // OK
        }
        fail("Cannot use new on Enum");
    },
    function ()
    {
        assertTrue(test.Enum.A instanceof test.Enum);
    },
    function ()
    {
        assertTrue(test.Enum.B instanceof test.Enum);
    },
    function ()
    {
        assertTrue(test.Enum.C instanceof test.Enum);
    },
    function ()
    {
        assertTrue(test.Enum.D instanceof test.Enum);
    },
    function ()
    {
        assertEquals(0, test.Enum.A.ordinal);
    },
    function ()
    {
        assertEquals(1, test.Enum.B.ordinal);
    },
    function ()
    {
        assertEquals(2, test.Enum.C.ordinal);
    },
    function ()
    {
        assertEquals(3, test.Enum.D.ordinal);
    },
    function ()
    {
        assertEquals(42, test.Enum.E.ordinal);
    },
    function ()
    {
        assertEquals(43, test.Enum.F.ordinal);
    },
    function ()
    {
        assertEquals(6, test.Enum.values.length);
    },
    function ()
    {
        assertTrue(test.Enum.A === test.Enum.parseName("A"));
    },
    function ()
    {
        assertTrue(test.Enum.B === test.Enum.parseName("B"));
    },
    function ()
    {
        assertTrue(test.Enum.C === test.Enum.parseName("C"));
    },
    function ()
    {
        assertTrue(test.Enum.D === test.Enum.parseName("D"));
    },
    function ()
    {
        assertTrue(test.Enum.E === test.Enum.parseName("E"));
    },
    function ()
    {
        assertTrue(test.Enum.F === test.Enum.parseName("F"));
    },
    function ()
    {
        assertTrue(null === test.Enum.parseName("X"));
    },
    function ()
    {
        var s = "";

        test.Enum.forEach(function (en) { s += en.name; } );

        assertEquals("ABCDEF", s);
    },
    function ()
    {
        assertEquals("fooA!", test.Enum.A.foo("!"));
    },
    function ()
    {
        assertEquals("fooC#_C", test.Enum.C.foo("#"));
    },
    function ()
    {
        for (var i = 0; i < test.Enum.values.length; ++i)
        {
            var k = -1;

            switch (test.Enum.values[i])
            {
                default: k = -10; break;
                case test.Enum.A: k = 0; break;
                case test.Enum.B: k = 1; break;
                case test.Enum.C: k = 2; break;
                case test.Enum.D: k = 3; break;
                case test.Enum.E: k = 4; break;
                case test.Enum.F: k = 5; break;
            }

            assertEquals(i, k);
        }
    },

    // $panic

    function ()
    {
        var msg = "Just a Test";

        try
        {
            $panic(msg);
        }
        catch (e)
        {
            assertEquals(msg, e.message);
        }
    },

    // deref

    function ()
    {
        var object = { foo : { bar : "xyzzy" }};
        var ret = zjs.deref(object, "foo.bar");

        assertEquals(object.foo.bar, ret);
    },
    function ()
    {
        var object = { foo : { bar : [20, { x : 42 }] }};
        var ret = zjs.deref(object, "foo.bar[1]");

        assertTrue(object.foo.bar[1] === ret);
    },
    function ()
    {
        var object = { foo : { bar : [20, { x : 42 }] }};
        var ret = zjs.deref(object, "foo['bar'][1]");

        assertTrue(object.foo.bar[1] === ret);
    },
    function ()
    {
        var object = { foo : { bar : [20, { x : 42 }] }, bif: [1] };
        var ret = zjs.deref(object, "foo.bar[bif[0]]");

        assertTrue(object.foo.bar[1] === ret);
    },

    function () { } // END
);
