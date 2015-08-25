/*=============================================================================
    test/test-x.js
    Copyright (C) 2008, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/

gTests.push
(
    //----------------------------------------------------
    // Function.prototype methods

    // getFullName

    function ()
    {
        assertEquals("test.D", test.D.getFullName());
    },
    function ()
    {
        var d = new test.D();
        assertEquals("test.D.foo", d.foo.getFullName());
    },
    function ()
    {
        assertEquals("test.C.N.Q", test.C.N.Q.getFullName());
    },
    function ()
    {
        var q = new test.C.N.Q();
        assertEquals("test.C.N.Q.wow", q.wow.getFullName());
    },
    function ()
    {
        var d = new test.D();
        assertEquals("test.D.getClassName(mx)", d.getClassName.getFullName());
    },
    function ()
    {
        var e = new test.E();
        assertEquals("test.E.getClassName(mx)", e.getClassName.getFullName());
    },
    function ()
    {
        var d = new test.D();
        assertEquals("test.D", d.getClassName());
    },
    function ()
    {
        var e = new test.E();
        assertEquals("test.E", e.getClassName());
    },

    // getName

    function ()
    {
        var d = new test.D();
        assertEquals("foo", d.foo.getName());
    },

    // bind

    function ()
    {
        var obj = { fn : function (p) { return this.str + p; }, str : "foo" };

        var f = obj.fn.bind(obj);
        var s = "bar";
        var r1 = f(s);
        var r2 = obj.fn(s);

        assertEquals("foobar", r1);
        assertEquals("foobar", r2);
    },

    // bind2

    function ()
    {
        var fn = function (that, p) { return this + p + that.str; };
        var s = "foo";
        var obj = { f : fn.bind2(s), str : "!!" };

        var r = obj.f("bar");

        assertEquals(s+"bar!!", r);
    },

    // head

    function ()
    {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.head(4);
        r = obj.fn(3, 2, 1);
        assertEquals("A4321", r);
    },

    function ()
    {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.head(4, 3);
        var r = obj.fn(2, 1);
        assertEquals("A4321", r);
    },

    function ()
    {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.head(4, 3, 2);
        var r = obj.fn(1);
        assertEquals("A4321", r);
    },

    function ()
    {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.head(4, 3, 2, 1);
        var r = obj.fn();
        assertEquals("A4321", r);
    },

    function ()
    {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.head(4, 3, 2, 1);
        var r = obj.fn(7);
        assertEquals("A4321", r);
    },

    // tail

    function ()
    {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.tail(4);
        r = obj.fn(1, 2, 3);
        assertEquals("A1234", r);
    },

    function ()
    {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.tail(3, 4);
        var r = obj.fn(1, 2);
        assertEquals("A1234", r);
    },

    function ()
    {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.tail(2, 3, 4);
        var r = obj.fn(1);
        assertEquals("A1234", r);
    },

    function ()
    {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.tail(1, 2, 3, 4);
        var r = obj.fn();
        assertEquals("A1234", r);
    },

    function ()
    {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.tail(1, 2, 3, 4);
        var r = obj.fn(7);
        assertEquals("A7123", r);
    },

    // returns

    function ()
    {
        var t = null;
        var obj = {
            x : "A",
            fn : function (p) { return t = this.x + p; }
        };

        obj.fn = obj.fn.returns(42);
        var r = obj.fn(7);
        assertEquals(42, r);
        assertEquals("A7", t);
    },

    // seal

    function ()
    {
        var obj = {
            x : "A",
            fn : function () { return this.x + arguments.length; }
        };

        obj.fn = obj.fn.seal();
        var r = obj.fn(7);
        assertEquals("A0", r);
    },

    // multiple

    function ()
    {
        var t;
        var obj = {
            x : "A",
            fn : function (p1,p2,p3,p4,p5)
            { return t = this.x+p1+p2+p3+p4+p5 + arguments.length; }
        };

        var fn = obj.fn.bind(obj).head(1, 2).tail(3, 4);
        var r = fn("-");
        assertEquals("A12-345", r);

        r = fn("#", "$");
        assertEquals("A12#$36", r);

        var fn2 = fn.head("_").seal();
        r = fn2("xx");
        assertEquals("A12_345", r);

        fn2 = fn.tail("%").seal();
        r = fn2("*");
        assertEquals("A12%345", r);

        fn = fn.returns(42);
        r = fn("x");
        assertEquals(42, r);
        assertEquals("A12x345", t);
    },

    //----------------------------------------------------
    // String.prototype methods

    // capitalize

    function ()
    {
        var s = "foo".capitalize();
        assertEquals("Foo", s);
    },
    function ()
    {
        var s = "Foo".capitalize();
        assertEquals("Foo", s);
    },

    // camelize

    function ()
    {
        var s = "foo-bar".camelize();
        assertEquals("fooBar", s);
    },

    // endsWith

    function ()
    {
        var b = "foo-bar".endsWith("bar");
        assertEquals(true, b);
    },
    function ()
    {
        var b = "foo-bar".endsWith("Bar");
        assertEquals(false, b);
    },
    function ()
    {
        var b = "foo-bar".endsWith("abcfoo-bar");
        assertEquals(false, b);
    },

    // equalsIgnoreCase

    function ()
    {
        var b = "foo-bar".equalsIgnoreCase("fOo-BAr");
        assertEquals(true, b);
    },
    function ()
    {
        var b = "FoO-baR".equalsIgnoreCase("fOo-BAr");
        assertEquals(true, b);
    },
    function ()
    {
        var b = "foo-bar".equalsIgnoreCase("foo-bar");
        assertEquals(true, b);
    },
    function ()
    {
        var b = "foo-bar".equalsIgnoreCase("foo-bars");
        assertEquals(false, b);
    },

    // left

    function ()
    {
        var s = "foo-bar".left(-1);
        assertEquals("", s);
    },
    function ()
    {
        var s = "foo-bar".left(0);
        assertEquals("", s);
    },
    function ()
    {
        var s = "foo-bar".left(1);
        assertEquals("f", s);
    },
    function ()
    {
        var s = "foo-bar".left(5);
        assertEquals("foo-b", s);
    },
    function ()
    {
        var s = "foo-bar".left(7);
        assertEquals("foo-bar", s);
    },
    function ()
    {
        var s = "foo-bar".left(8);
        assertEquals("foo-bar", s);
    },
    function ()
    {
        var s = "foo-bar".left(10);
        assertEquals("foo-bar", s);
    },

    // right

    function ()
    {
        var s = "foo-bar".right(-1);
        assertEquals("", s);
    },
    function ()
    {
        var s = "foo-bar".right(0);
        assertEquals("", s);
    },
    function ()
    {
        var s = "foo-bar".right(1);
        assertEquals("r", s);
    },
    function ()
    {
        var s = "foo-bar".right(5);
        assertEquals("o-bar", s);
    },
    function ()
    {
        var s = "foo-bar".right(7);
        assertEquals("foo-bar", s);
    },
    function ()
    {
        var s = "foo-bar".right(8);
        assertEquals("foo-bar", s);
    },
    function ()
    {
        var s = "foo-bar".right(10);
        assertEquals("foo-bar", s);
    },

    // startsWith

    function ()
    {
        var b = "foo-bar".startsWith("foo-");
        assertEquals(true, b);
    },
    function ()
    {
        var b = "foo-bar".startsWith("foo-bars");
        assertEquals(false, b);
    },
    function ()
    {
        var b = "foo-bar".startsWith("foo_");
        assertEquals(false, b);
    }
);
