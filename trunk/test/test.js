/*=============================================================================
    test/test.js
    Copyright (C) 2008, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/
$namespace("x.y", {z : 42});
$namespace(x.y, {q : 427});
$namespace(x, {foo : function () { }});

$namespace("test", {
    A : $class({
        ctor : function () {
            $super(arguments).call(this);
        },

        bif : function () {return "fib";},
        foo : function () {return "foo";},
        sfoo : $static(function (x) {return x + 1;}),

        coolFoo: function (x) {
            return this.$static.coolFoo(x);
        },

        supr: function (s) {
            return "A"+(s||"");
        },

        $static: {
            coolFoo: function (x) {
                return x + "!";
            }
        }
    }),

    Abstract : $class({
        foo : $abstract
    })
});

var globalVar = 42;

$namespace(test, {
    B : $class("A", {
        ctor : function () {
            $super(arguments).call(this);
        },

        foo : function () {return $super(arguments).call(this)+"-2";},
        abs1 : function(x, z) {return "B.abs=" + (x + z);},
        abs2 : function () {return "B.abs2";},

        "?test.A.sfoo(1)==2" : {
            cfoo : function () {return "cfoo!";},
            scfoo : $static(function () {return "scfoo!";})
        },
        "?test.A.sfoo(1)==3" : {
            ncfoo : function () {return "cfoo!";},
            nscfoo : $static(function () {return "scfoo!";})
        },
        "=test.A.sfoo(1)" : {
            2: {
                cfoo2 : function () {return "cfoo2!";},
                scfoo2 : $static(function () {return "scfoo2!";})
            }
        },
        "=test.A.sfoo(2)" : {
            "*": {
                cfoo3 : function () {return "cfoo3!";},
                scfoo3 : $static(function () {return "scfoo3!";})
            }
        },

        supr: function (s) {
            return this.$super("-B"+(s||""));
        },

        $static: {
            coolFoo: function (x) {
                var s = $super(arguments).call(this, x);
                return s + "?";
            }
        }
    }),

    C : $class("A", {
        bar : function () {return 42;},
        N : $class({
            fiz : function () {return "fizzle!";},
            Q : $class("N", {
                wow : function () {return "wow!";}
            })
        })
    }),

    D : $class("B", {
        bif : function () {return $super(arguments)() + "!";},
        foo : function () {return $super(arguments).call(this)+"-3";},
        sfoo : $static(function (x) {return $super(arguments)(x) * 2;}),

        $static: {
            coolFoo: function (x) {
                var s = $super(arguments).call(this, x);
                return s + "!";
            }
        },

        N : $class("E.E2", {
            ctor : function () {
                $super(arguments).call(this);
            },
            fiz : function () {return "fizzle!";},

            supr: function (s) {
                return this.$super("-N"+(s||""));
            },

            Q : $class("N", {
                ctor : function () {
                    $super(arguments).call(this);
                },

                wow : function () {return "wow!";},

                supr: function (s) {
                    return this.$super("-Q"+(s||""));
                }
            })
        })
    }),

    E : $class("C", {
        bar : function () {return $super(arguments).call(this) + 1;},

        E2 : $class("E3", {
            ctor : function () {
                $super(arguments).call(this);
            },

            efoo : function (x) {
                return x + "-e3foo";
            },

            supr: function (s) {
                return this.$super("-E2"+(s||""));
            }
        }),

        E3 : $class("B", {
            ctor : function () {
                $super(arguments).call(this);
            },

            supr: function (s) {
                return this.$super("-E3"+(s||""));
            }
        })
    }),

    StillAbstract : $class("Abstract", {
        bar : function () {return "bar";}
    }),

    FinallyNotAbstract : $class("StillAbstract", {
        foo : function () {return $super(arguments).call(this) || 42;}
    })
});

$namespace(test, "sub",
{
    F : $class("E", function (F) {
        function f () {
            return this.x + 1;
        }

        return {
            ctor : function (x) {this.x = x;},
            bar : function () {
                return $super(arguments).call(this) * f.call(this);
            },
            cool: function (a) {
                return "##" + F.$static.coolFoo(a);
            }
        };
    }),

    G : $class("D", {
        // just exist...
    })
});

$namespace(test, {
    Singleton : $singleton(test.D, {
        ctor : function () {this.ctorCalled = true;},
        foo : function () {return $super(arguments).call(this)+"-42";},
        sfoo : $static(function (x) {return $super(arguments)(x) * 4;})
    }),

    Enum : $enum(["A", "B",
                  "C", {
                      foo : function (s) {
                          var ret = $super(arguments).call(this, s);
                          ret += "_C";
                          return ret;
                      },
                      getFullName : function () {
                          var s = $super(arguments).call(this);
                          return s + "_C";
                      }
                  },
                  "D", "E = 42", "F"], {
                      foo : function (s) {
                          return "foo" + this.name + s;
                      }
                  })
});

$mixin(test.E, "mx", {
    bar : $priority(-1, function () {
        return $super(arguments).call(this) + 2;
    })
});

$mixin(test.E, "mx2", {
    bar : $priority(1, function () {
        return $super(arguments).call(this) * 2;
    })
});

function mx (c) {
    $mixin(c, "mx", {
        getClassName : function () {
            return this.getClass().getFullName();
        }
    });
}

mx(test.E);
mx(test.D);

var testNamespace;

gTests.push(
    function () {
        $log("Warn $log test", "warn");
    },
    function () {
        $log("Info $log test", "info");
    },
    function () {
        $log("Debug $log test", "debug");
    },

    // $class

    function () {
        try {
            $class(test.NotDefined, {});
        } catch (e) {
            return;
        }

        fail("Allowed undefined base class");
    },

    function () {
        $class(null, {});
    },

    // $eval

    function () {
        assertEquals(42, eval("globalVar"));
    },
    function () {
        assertEquals(42, $eval("globalVar"));
    },
    function () {
        var globalVar = 2;
        assertEquals(2, eval("globalVar"));
    },
    function () {
        var globalVar = 2;
        assertEquals(42, $eval("globalVar"));
    },

    // $namespace
    function () {
        testNamespace = 
            {$meta : {fullname : "", name : "", namespace : null, 
                        subNamespaces : [], preAdd : $namespace.preAdd}};

        var keep = $namespace.global;
        $namespace.global = testNamespace;

        $namespace("foo", {
            bar : function (s) {return "_" + s;}
        });

        $namespace.global = keep;

        assertEquals("_42", testNamespace.foo.bar("42"));
    },
    function () {
        try {
            $namespace(testNamespace.foo, {
                bar : function (s) {return "###" + s;}
            });

            fail("Conflict detection failed");
        } catch (e) {
            // ignore
        }

        assertEquals("_42", testNamespace.foo.bar("42"));
    },
    function () {
        $namespace(testNamespace.foo, {
            bar : $overwrite(function (s) {return "#" + s;})
        });

        assertEquals("#42", testNamespace.foo.bar("42"));
    },
    function () {
        $namespace(testNamespace.foo, {
            bar : $override(function (s) {return $super(arguments)(s)+"!";})
        });

        assertEquals("#42!", testNamespace.foo.bar("42"));
    },
    function () {
        // ok to overwrite non-existant
        $namespace(testNamespace.foo, {
            bar2 : $overwrite(function (s) {return s+"!";})
        });

        assertEquals("42!", testNamespace.foo.bar2("42"));
    },
    function () {
        try {
            $namespace(testNamespace.foo, {
                bif : $override(function () {return "!";})
            });

            fail("Nothing to override detection failed");
        } catch (e) {
            // ignore
        }

        assertFalse("bif" in testNamespace.foo);
    },

    function () {
        $namespace(testNamespace.foo, {
            bar : $replace(function (s) {return s + "!";})
        });

        assertEquals("42!", testNamespace.foo.bar("42"));
    },
    function () {
        try {
            $namespace(testNamespace.foo, {
                bif : $replace(function () {return "!";})
            });

            fail("Nothing to replace detection failed");
        } catch (e) {
            // ignore
        }

        assertFalse("bif" in testNamespace.foo);
    },

    function () {
        var a = new test.A();
        assertEquals(test.A, a.getClass());
    },
    function () {
        var b = new test.B();
        assertEquals(test.B, b.getClass());
    },
    function () {
        var b = new test.B();
        assertEquals("cfoo!", b.cfoo());
    },
    function () {
        var s = test.B.scfoo();
        assertEquals("scfoo!", s);
    },
    function () {
        var b = new test.B();
        assertFalse("ncfoo" in b);
    },
    function () {
        assertFalse("nscfoo" in test.B);
    },
    function () {
        var b = new test.B();
        assertEquals("cfoo2!", b.cfoo2());
    },
    function () {
        var s = test.B.scfoo2();
        assertEquals("scfoo2!", s);
    },
    function () {
        var b = new test.B();
        assertEquals("cfoo3!", b.cfoo3());
    },
    function () {
        var s = test.B.scfoo3();
        assertEquals("scfoo3!", s);
    },
    function () {
        var c = new test.C();
        assertEquals(test.C, c.getClass());
    },
    function () {
        var d = new test.D();
        assertEquals(test.D, d.getClass());
    },
    function () {
        var e = new test.E();
        assertEquals(test.E, e.getClass());
    },
    function () {
        var a = new test.A();
        assertEquals("foo", a.foo());
    },
    function () {
        var b = new test.B();
        assertEquals("foo-2", b.foo());
    },
    function () {
        var c = new test.C();
        assertEquals("foo", c.foo());
    },
    function () {
        var c = new test.C();
        assertEquals(42, c.bar());
    },
    function () {
        var d = new test.D();
        assertEquals("foo-2-3", d.foo());
    },
    function () {
        var d = new test.D();
        assertEquals("fib!", d.bif());
    },
    function () {
        assertEquals(42, test.D.sfoo(20));
    },
    function () {
        var obj = new test.D.N.Q();
        assertTrue(obj instanceof test.D.N.Q);
        assertTrue(obj instanceof test.D.N);
        assertTrue(obj instanceof test.E.E2);
        assertTrue(obj instanceof test.E.E3);
        assertTrue(obj instanceof test.B);
        assertTrue(obj instanceof test.A);
        assertTrue(obj instanceof zjs.Object);
    },
    function () {
        var e = new test.E();
        assertEquals(90, e.bar());
    },
    function () {
        var obj = new test.E.E2();
        assertTrue(obj instanceof test.E.E2);
        assertTrue(obj instanceof test.E.E3);
        assertTrue(obj instanceof test.B);
        assertTrue(obj instanceof test.A);
        assertTrue(obj instanceof zjs.Object);
    },
    function () {
        var d = new test.D();
        assertTrue(d instanceof test.A);
    },
    function () {
        var d = new test.D();
        assertTrue(d instanceof test.B);
    },
    function () {
        var d = new test.D();
        assertTrue(!(d instanceof test.C));
    },
    function () {
        var d = new test.D();
        assertTrue(d instanceof test.D);
    },
    function () {
        eval($using(test));
        var d = new D(), e = new E();
    },
    function () {
        eval($using(test.E));
        var e = new E();
    },
    function () {
        var f = new test.sub.F(2);
        assertEquals(270, f.bar());
    },
    function () {
        var f = new test.C.N();
        assertEquals("fizzle!", f.fiz());
    },
    function () {
        var q = new test.C.N.Q();
        assertEquals("wow!", q.wow());
    },

    // $static

    function () {
        var s = test.A.coolFoo("Hey");
        assertEquals("Hey!", s);
    },
    
    function () {
        var s = test.B.coolFoo("Hey");
        assertEquals("Hey!?", s);
    },

    function () {
        var s = test.D.coolFoo("Hey");
        assertEquals("Hey!?!", s);
    },
    //--
    function () {
        var s = test.A.$static.coolFoo("Hey");
        assertEquals("Hey!", s);
    },

    function () {
        var s = test.B.$static.coolFoo("Hey");
        assertEquals("Hey!?", s);
    },

    function () {
        var s = test.D.$static.coolFoo("Hey");
        assertEquals("Hey!?!", s);
    },

    function () {
        var s = test.sub.G.$static.coolFoo("Hey"); // inheritance of coolFoo from D...
        assertEquals("Hey!?!", s);
    },
    //--
    function () {
        var obj = new test.A();
        var s = obj.$static.coolFoo("Hey");
        assertEquals("Hey!", s);
    },

    function () {
        var obj = new test.B();
        var s = obj.$static.coolFoo("Hey");
        assertEquals("Hey!?", s);
    },

    function () {
        var obj = new test.D();
        var s = obj.$static.coolFoo("Hey");
        assertEquals("Hey!?!", s);
    },

    function () {
        var obj = new test.sub.G();
        var s = obj.$static.coolFoo("Hey");
        assertEquals("Hey!?!", s);
    },

    function () {
        var obj = new test.sub.F();
        var s = obj.cool("Hey");
        assertEquals("##Hey!", s);
    },

    // Singleton

    function () {
        try {
            var s = new test.Singleton();
        } catch (e) {
            return; // OK
        }
        fail("Cannot use new on Singleton");
    },
    function ()    {
        var s = test.Singleton.getInstance();
        assertTrue(s.ctorCalled);
    },
    function () {
        var s = test.Singleton.getInstance();
        assertTrue(s instanceof test.Singleton);
    },
    function () {
        var s = test.Singleton.getInstance();
        assertEquals("foo-2-3-42", s.foo());
    },
    function () {
        var s = test.Singleton.getInstance();
        assertEquals("fib!", s.bif());
    },
    function () {
        assertEquals(42*4, test.Singleton.sfoo(20));
    },

    // getType
    
    function () {
        var t = zjs.getType(null);
        assertEquals("null", t);
    },
    function () {
        var t = zjs.getType(undefined);
        assertEquals("undefined", t);
    },
    function () {
        var t = zjs.getType([]);
        assertEquals("array", t);
    },
    function () {
        var t = zjs.getType("");
        assertEquals("string", t);
    },
    function () {
        var t = zjs.getType(new String("hello"));
        assertEquals("string", t);
    },
    function () {
        var t = zjs.getType(1.2);
        assertEquals("number", t);
    },
    function () {
        var t = zjs.getType(new Number(1.2));
        assertEquals("number", t);
    },
    function () {
        var t = zjs.getType(true);
        assertEquals("boolean", t);
    },
    function () {
        var t = zjs.getType(new Boolean(true));
        assertEquals("boolean", t);
    },
    function () {
        var t = zjs.getType(new Date());
        assertEquals("date", t);
    },
    function () {
        var t = zjs.getType(new Array(1,2,3));
        assertEquals("array", t);
    },
    function () {
        var t = zjs.getType(/x/);
        assertEquals("regexp", t);
    },
    function () {
        var t = zjs.getType(new RegExp("c"));
        assertEquals("regexp", t);
    },
    function () {
        var t = zjs.getType(function () {});
        assertEquals("function", t);
    },
    function () {
        var t = zjs.getType(new Function(""));
        assertEquals("function", t);
    },
    function () {
        try {
            var x, y = x.foo; // ignore my throwing...
        } catch (e) {
            var t = zjs.getType(e);
            assertEquals("error", t);
        }
    },
    function () {
        var t = zjs.getType(new Error());
        assertEquals("error", t);
    },
    function () {
        var t = zjs.getType(test.A);
        assertEquals("class", t);
    },
    function () {
        var t = zjs.isArguments(arguments);
        assertTrue(t);
    },
    function () {
        var t = zjs.isArguments([]);
        assertFalse(t);
    },

    // $foreach

    function () {
        function sum () {
            var i = 0;
            $foreach(arguments, function (k) {
                i += k;
            });
            return i;
        }
        var n = sum(1, 2, 3, 4);
        assertEquals(1+2+3+4, n);
    },
    function () {
        var s = "_";
        $foreach(["a","b","c","d"], function (c) {
            s += c;
        });

        assertEquals("_abcd", s);
    },
    function () {
        var s = "_";
        $foreach(["a","b","c","d"], function (c, etc) {
            s += c;
            if (c === "c")
                etc.$break = true;
        });

        assertEquals("_abc", s);
    },
    function () {
        var s = $foreach(["a","b","c","d"], function (c, etc) {
            return c + (etc.value || "_");
        });

        assertEquals("dcba_", s);
    },
    function () {
        var s = $foreach(["a","b","c","d"], function (c, etc) {
            return c + etc.index + (etc.value || "_");
        });

        assertEquals("d3c2b1a0_", s);
    },
    function () {
        var s = "_";
        $foreach(["a","b","c","d"], {begin:1}, function (c) {
            s += c;
        });

        assertEquals("_bcd", s);
    },
    function () {
        var s = "_";
        $foreach(["a","b","c","d"], {begin:1, end:3}, function (c) {
            s += c;
        });

        assertEquals("_bc", s);
    },
    function () {
        var s = "_";
        $foreach(["a","b","c","d","e","f"], {begin:1, end:5, delta:2}, function (c) {
            s += c;
        });

        assertEquals("_bd", s);
    },
    function () {
        var s = "_";
        $foreach(["a","b","c","d","e","f"], {begin:1, delta:2}, function (c) {
            s += c;
        });

        assertEquals("_bdf", s);
    },
    function () {
        var s =
        $foreach(["a","b","c","d","e"], {begin:1, value:"%"}, function (c, etc) {
            return etc.value + c;
        });

        assertEquals("%bcde", s);
    },
    function () {
        var s =
        $foreach(["a","b","c","d","e"], {value:"%"}, function (c, etc) {
            if (etc.index == 4)
                return $break;
            return etc.value + c;
        });

        assertEquals("%abcd", s);
    },
    function () {
        var s =
        $foreach(["a","b","c","d","e"], {value:"%"}, function (c, etc) {
            if (etc.index == 4)
                return $break(etc.value + "!!");
            return etc.value + c;
        });

        assertEquals("%abcd!!", s);
    },

    // $new

    function () {
        var C = $class(null, {
            ctor : function () {
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

    function () {
        try {
            var en = new test.Enum();
        } catch (e) {
            return; // OK
        }
        fail("Cannot use new on Enum");
    },
    // instances
    function () {
        assertTrue(test.Enum.A instanceof test.Enum);
    },
    function () {
        assertTrue(test.Enum.B instanceof test.Enum);
    },
    function () {
        assertTrue(test.Enum.C instanceof test.Enum);
    },
    function () {
        assertTrue(test.Enum.D instanceof test.Enum);
    },
    // ordinal
    function () {
        assertEquals(0, test.Enum.A.ordinal);
    },
    function () {
        assertEquals(1, test.Enum.B.ordinal);
    },
    function () {
        assertEquals(2, test.Enum.C.ordinal);
    },
    function () {
        assertEquals(3, test.Enum.D.ordinal);
    },
    function () {
        assertEquals(42, test.Enum.E.ordinal);
    },
    function () {
        assertEquals(43, test.Enum.F.ordinal);
    },
    function () {
        assertEquals(6, test.Enum.values.length);
    },
    // parseName
    function () {
        assertTrue(test.Enum.A === test.Enum.parseName("A"));
    },
    function () {
        assertTrue(test.Enum.B === test.Enum.parseName("B"));
    },
    function () {
        assertTrue(test.Enum.C === test.Enum.parseName("C"));
    },
    function () {
        assertTrue(test.Enum.D === test.Enum.parseName("D"));
    },
    function () {
        assertTrue(test.Enum.E === test.Enum.parseName("E"));
    },
    function () {
        assertTrue(test.Enum.F === test.Enum.parseName("F"));
    },
    function () {
        assertTrue(null === test.Enum.parseName("X"));
    },
    // values
    function () {
        var s = "";

        $foreach(test.Enum.values, function (en) {s += en.name;} );

        assertEquals("ABCDEF", s);
    },
    // methods
    function () {
        assertEquals("fooA!", test.Enum.A.foo("!"));
    },
    function () {
        assertEquals("fooC#_C", test.Enum.C.foo("#"));
    },
    function () {
        for (var i = 0; i < test.Enum.values.length; ++i) {
            var k = -1;

            switch (test.Enum.values[i]) {
                default:k = -10;break;
                case test.Enum.A:k = 0;break;
                case test.Enum.B:k = 1;break;
                case test.Enum.C:k = 2;break;
                case test.Enum.D:k = 3;break;
                case test.Enum.E:k = 4;break;
                case test.Enum.F:k = 5;break;
            }

            assertEquals(i, k);
        }
    },
    // findById
    function () {
        assertTrue(test.Enum.A === test.Enum.findById(0));
    },
    function () {
        assertTrue(test.Enum.B === test.Enum.findById(1));
    },
    function () {
        assertTrue(test.Enum.C === test.Enum.findById(2));
    },
    function () {
        assertTrue(test.Enum.D === test.Enum.findById(3));
    },
    function () {
        assertTrue(test.Enum.E === test.Enum.findById(4));
    },
    function () {
        assertTrue(test.Enum.F === test.Enum.findById(5));
    },
    function () {
        assertTrue(null === test.Enum.findById(6));
    },
    // findByOrdinal
    function () {
        assertTrue(test.Enum.A === test.Enum.findByOrdinal(0));
    },
    function () {
        assertTrue(test.Enum.B === test.Enum.findByOrdinal(1));
    },
    function () {
        assertTrue(test.Enum.C === test.Enum.findByOrdinal(2));
    },
    function () {
        assertTrue(test.Enum.D === test.Enum.findByOrdinal(3));
    },
    function () {
        assertTrue(test.Enum.E === test.Enum.findByOrdinal(42));
    },
    function () {
        assertTrue(test.Enum.F === test.Enum.findByOrdinal(43));
    },
    function () {
        assertTrue(null === test.Enum.findByOrdinal(10));
    },
    // getById
    function () {
        assertTrue(test.Enum.A === test.Enum.getById(0));
    },
    function () {
        assertTrue(test.Enum.B === test.Enum.getById(1));
    },
    function () {
        assertTrue(test.Enum.C === test.Enum.getById(2));
    },
    function () {
        assertTrue(test.Enum.D === test.Enum.getById(3));
    },
    function () {
        assertTrue(test.Enum.E === test.Enum.getById(4));
    },
    function () {
        assertTrue(test.Enum.F === test.Enum.getById(5));
    },
    function () {
        try {
            test.Enum.getById(6);
            fail("Should have thrown");
        } catch (e) {
            // success
        }
    },
    // getByOrdinal
    function () {
        assertTrue(test.Enum.A === test.Enum.getByOrdinal(0));
    },
    function () {
        assertTrue(test.Enum.B === test.Enum.getByOrdinal(1));
    },
    function () {
        assertTrue(test.Enum.C === test.Enum.getByOrdinal(2));
    },
    function () {
        assertTrue(test.Enum.D === test.Enum.getByOrdinal(3));
    },
    function () {
        assertTrue(test.Enum.E === test.Enum.getByOrdinal(42));
    },
    function () {
        assertTrue(test.Enum.F === test.Enum.getByOrdinal(43));
    },
    function () {
        try {
            test.Enum.getByOrdinal(10);
            fail("Should have thrown");
        } catch (e) {
            // success
        }
    },

    // $panic

    function () {
        var msg = "Just a Test";

        try {
            $panic(msg);
        } catch (e) {
            assertEquals(msg, e.message);
        }
    },

    // deref

    function () {
        var object = {foo : {bar : "xyzzy"}};
        var ret = zjs.deref(object, "foo.bar");

        assertEquals(object.foo.bar, ret);
    },
    function () {
        var object = {foo : {bar : [20, {x : 42}]}};
        var ret = zjs.deref(object, "foo.bar[1]");

        assertTrue(object.foo.bar[1] === ret);
    },
    function () {
        var object = {foo : {bar : [20, {x : 42}]}};
        var ret = zjs.deref(object, "foo['bar'][1]");

        assertTrue(object.foo.bar[1] === ret);
    },
    function () {
        var object = {foo : {bar : [20, {x : 42}]}, bif: [1]};
        var ret = zjs.deref(object, "foo.bar[bif[0]]");

        assertTrue(object.foo.bar[1] === ret);
    },

    // $abstract

    function () {
        try {
            var a = new test.Abstract();
        } catch (e) {
            return;
        }

        fail("Created instance of abstract class");
    },

    function () {
        try {
            var a = new test.StillAbstract();
        } catch (e) {
            return;
        }

        fail("Created instance of abstract class");
    },

    function () {
        var fna = new test.FinallyNotAbstract();

        var a = fna.foo();

        assertEquals(42, a);
    },

    function (test) {
        if (test.runner.async) {
            test.defer();
            window.setTimeout(function () {
                test.finish(function () {
                    //fail("Bang!");
                })
            },1000);
        }
    },

    function () { } // END
);

if (zjs.hasCaller) {
    gTests.push(
        function () {
            var obj = new test.D.N.Q();
            var s = obj.supr("!!");
            assertEquals("A-B-E3-E2-N-Q!!", s);
        }
    );
}
