/*=============================================================================
    test/test-x.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/

function checkTypes (obj, gt) {
    var s = zjs.getType(obj);
    var t = typeof(obj);

    assertEquals(gt, s);
}

gTests.push(
    //----------------------------------------------------

    function () {
        checkTypes(null, "null");
    },
    function () {
        checkTypes(undefined, "undefined");
    },
    function () {
        checkTypes("juhu", "string");
    },
    function () {
        checkTypes(new String("juhu"), "string"); // object
    },
    function () {
        checkTypes("", "string");
    },
    function () {
        checkTypes(0, "number");
    },
    function () {
        checkTypes(1.2, "number");
    },
    function () {
        checkTypes(new Number(1.2), "number");// object
    },
    function () {
        checkTypes(true, "boolean");
    },
    function () {
        checkTypes(new Boolean(true), "boolean"); // object
    },
    function () {
        checkTypes(new Date(), "date"); // object
    },
    function () {
        checkTypes(new Error(), "error");// object
    },
    function () {
        checkTypes([1,2,3], "array"); // object
    },
    function () {
        checkTypes(new Array(1, 2, 3), "array"); // object
    },
    function () {
        checkTypes(new Function(""), "function");
    },
    function () {
        checkTypes(/abc/g, "regexp"); // object (function in Safari)
    },
    function () {
        checkTypes(new RegExp("abc","g"), "regexp"); // object (function in Safari)
    },
    function () {
        checkTypes({}, "object");
    },
    function () {
        checkTypes(new Object(), "object");
    },
    function () {
        checkTypes(test.A, "class");  // object
    },
    function () {
        checkTypes(new test.A(), "test.A"); // object
    },

    //----------------------------------------------------
    // Function.prototype methods

    // getFullName

    function () {
        assertEquals("test.D", test.D.getFullName());
    },
    function () {
        var d = new test.D();
        assertEquals("test.D.foo", d.foo.getFullName());
    },
    function () {
        assertEquals("test.C.N.Q", test.C.N.Q.getFullName());
    },
    function () {
        var q = new test.C.N.Q();
        assertEquals("test.C.N.Q.wow", q.wow.getFullName());
    },
    function () {
        var d = new test.D();
        assertEquals("test.D.getClassName(mx)", d.getClassName.getFullName());
    },
    function () {
        var obj = new test.D.N.Q();
        assertEquals("test.D.N.Q", obj.getClass().getFullName());
    },
    function () {
        var e = new test.E();
        assertEquals("test.E.getClassName(mx)", e.getClassName.getFullName());
    },
    function () {
        var obj = new test.E.E2();
        assertEquals("test.E.E2", obj.getClass().getFullName());
    },
    function () {
        var d = new test.D();
        assertEquals("test.D", d.getClassName());
    },
    function () {
        var e = new test.E();
        assertEquals("test.E", e.getClassName());
    },
    function () {
        var s = test.Singleton.getInstance.getFullName();
        assertEquals("test.Singleton.getInstance", s);
    },
    function () {
        var s = test.Singleton.getInstance().foo.getFullName();
        assertEquals("test.Singleton.foo", s);
    },
    function () {
        var s = test.Singleton.sfoo.getFullName();
        assertEquals("test.Singleton.sfoo", s);
    },
    function () {
        assertEquals("test.Enum.A", test.Enum.A.getFullName());
    },
    function () {
        assertEquals("test.Enum.C_C", test.Enum.C.getFullName());
    },

    // getName

    function () {
        var d = new test.D();
        assertEquals("foo", d.foo.getName());
    },
    function () {
        var s = test.Singleton.getInstance.getName();
        assertEquals("getInstance", s);
    },

    // bind

    function () {
        var obj = { fn : function (p) { return this.str + p; }, str : "foo" };

        var f = obj.fn.bind(obj);
        var s = "bar";
        var r1 = f(s);
        var r2 = obj.fn(s);

        assertEquals("foobar", r1);
        assertEquals("foobar", r2);
    },

    function () {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        var fn = obj.fn.bind(obj, 4, 3);
        r = fn(2, 1);
        assertEquals("A4321", r);
    },

    // bind2

    function () {
        var fn = function (that, p) { return this + p + that.str; };
        var s = "foo";
        var obj = { f : fn.bind2(s), str : "!!" };

        var r = obj.f("bar");

        assertEquals(s+"bar!!", r);
    },

    // head

    function () {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.head(4);
        var r = obj.fn(3, 2, 1);
        assertEquals("A4321", r);
    },

    function () {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.head(4, 3);
        var r = obj.fn(2, 1);
        assertEquals("A4321", r);
    },

    function () {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.head(4, 3, 2);
        var r = obj.fn(1);
        assertEquals("A4321", r);
    },

    function () {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.head(4, 3, 2, 1);
        var r = obj.fn();
        assertEquals("A4321", r);
    },

    function () {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.head(4, 3, 2, 1);
        var r = obj.fn(7);
        assertEquals("A4321", r);
    },

    // tail

    function () {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.tail(4);
        r = obj.fn(1, 2, 3);
        assertEquals("A1234", r);
    },

    function () {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.tail(3, 4);
        var r = obj.fn(1, 2);
        assertEquals("A1234", r);
    },

    function () {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.tail(2, 3, 4);
        var r = obj.fn(1);
        assertEquals("A1234", r);
    },

    function () {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.tail(1, 2, 3, 4);
        var r = obj.fn();
        assertEquals("A1234", r);
    },

    function () {
        var obj = {
            x : "A",
            fn : function (p1, p2, p3, p4) { return this.x + p1 + p2 + p3 + p4; }
        };

        obj.fn = obj.fn.tail(1, 2, 3, 4);
        var r = obj.fn(7);
        assertEquals("A7123", r);
    },

    // returns

    function () {
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

    function () {
        var obj = {
            x : "A",
            fn : function () { return this.x + arguments.length; }
        };

        obj.fn = obj.fn.seal();
        var r = obj.fn(7);
        assertEquals("A0", r);
    },

    // tee

    function () {
        var a = [];
        function f1 (x) { a.push("f1=" + x); return 11; }
        function f2 (x) { a.push("f2=" + x); return 22; }
        function f3 (x) { a.push("f3=" + x); return 33; }
        var t = f3.tee(f1, f2);
        var v = t(42);

        assertEquals(3, a.length);
        assertEquals("f1=42", a[0]);
        assertEquals("f2=42", a[1]);
        assertEquals("f3=42", a[2]);
        assertEquals(33, v);
    },

    // multiple

    function () {
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
    }
);

// In Rhino, the getArgumentNames method
if (Function.prototype.getArgumentNames)
    gTests.push(
        function () {
            var names = test.Singleton.sfoo.getArgumentNames();
            assertEquals("x", names.join(","));
        },
        function () {
            var names = test.Enum.C.foo.getArgumentNames();
            assertEquals("s", names.join(","));
        },
        function () {
            var names = test.Enum.C.getFullName.getArgumentNames();
            assertEquals("", names.join(","));
        }
    );

gTests.push(
    function () {
        var array = [
            { foo: 10 }, { foo: 5 }, { foo: 1 }, { foo: 100 }
        ];

        var a = zjs.sortBy(array, "foo");

        assertTrue(a === array);
        assertEquals(1,   array[0].foo);
        assertEquals(5,   array[1].foo);
        assertEquals(10,  array[2].foo);
        assertEquals(100, array[3].foo);
    },

    function () {
        var array = [
            { foo: 10 }, { foo: 5 }, { foo: 1 }, { foo: 100 }
        ];

        var sorter = zjs.getSorter("foo");
        var a = sorter(array);

        assertTrue(a === array);
        assertEquals(1,   array[0].foo);
        assertEquals(5,   array[1].foo);
        assertEquals(10,  array[2].foo);
        assertEquals(100, array[3].foo);
    },

    // Bag

    function () {
        var bag = new zjs.Bag();

        var i = bag.indexOf("foo");
        assertEquals(-1, i);
    },
    function () {
        var bag = new zjs.Bag();
        bag.add("foo");
        var i = bag.indexOf("foo");
        assertEquals(0, i);
    },
    function () {
        var bag = new zjs.Bag();
        // add 2 items at once and change another:
        bag.add("foo", "bar").add("goo");

        // check indexes:
        var i = bag.indexOf("foo");
        assertEquals(0, i);
        i = bag.indexOf("bar");
        assertEquals(1, i);
        i = bag.indexOf("goo");
        assertEquals(2, i);

        // remove
        i = bag.remove("bar");
        assertEquals(1, i);

        // recheck indexes:
        i = bag.indexOf("foo");
        assertEquals(0, i);
        i = bag.indexOf("bar");
        assertEquals(-1, i);
        i = bag.indexOf("goo");
        assertEquals(1, i);
    }
);

(function () {
    function make (x, y) {
        return { xval: x, yval: y };
    }

    function makeBag () {
        return new zjs.Bag({
            indexBy: [
                "xval",
                { key: "yval", name: "byYVal" }
            ]
        })
    }

    gTests.push(
        function () {
            var bag = makeBag();
            assertTrue(bag.pk === bag.byXval);

            var item1 = make(10, 20), item2 = make(30, 40), item3 = make(50, 60);
            bag.add(item1, item2).add(item3);

            var i = bag.indexOf(item1);
            assertEquals(0, i);
            i = bag.indexOf(item2);
            assertEquals(1, i);
            i = bag.indexOf(item3);
            assertEquals(2, i);

            i = bag.byXval.indexOf(1);
            assertEquals(-1, i);

            i = bag.byYVal.indexOf(20);
            assertEquals(0, i);
            i = bag.byYVal.indexOf(40);
            assertEquals(1, i);
            i = bag.byYVal.indexOf(60);
            assertEquals(2, i);
            i = bag.byYVal.indexOf(2);
            assertEquals(-1, i);
        }
    );
})();
