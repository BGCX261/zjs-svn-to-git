$namespace("x.y", { z : 42 });
$namespace(x.y, { q : 427});
$namespace(x, { foo : function () { }});

function dump (obj)
{
    var s = "";
    for (var n in obj)
    {
        var v = obj[n];
        if (typeof(v) == "object" && n != "parent")
            v = dump(v);
        s = s + "<li>" + n + ":" + v + "</li>";
    }
    if (s.length > 0)
        s = "<ul>" + s + "</ul>";
    return s;
}

$namespace("test",
{
    A : $class(
    {
        bif : function () { return "fib"; },
        foo : function () { return "foo"; },
        sfoo : $static(function (x) { return x + 1; })
    })
});

$namespace(test,
{
    B : $class(test.A,
    {
        foo : function () { return $super(arguments,this)+"-2"; }
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
    }())
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

function assertEquals (a, b)
{
    if (a != b)
        throw new Error("Not equal: <"+a+"> != <"+b+">");
}
function assertTrue (b)
{
    if (!b)
        throw new Error("Not true: <"+b+">");
}
function escapeHtml (s)
{
    return s.replace(/&/g,"&amp;").replace(/>/g,"&gt;").
             replace(/</g,"&lt;").replace(/"/g,"&quot;");
}

var tests =
[
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
        assertEquals("test.D", test.D.getFullName());
    },
    function ()
    {
        assertEquals(42, test.D.sfoo(20));
    },
    function ()
    {
        var d = new test.D();
        assertEquals("test.D.foo", d.foo.getFullName());
    },
    function ()
    {
        var d = new test.D();
        assertEquals("foo", d.foo.getName());
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
        assertEquals("test.C.N.Q", test.C.N.Q.getFullName());
    },
    function ()
    {
        var q = new test.C.N.Q();
        assertEquals("wow!", q.wow());
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
        var d = new test.D();
        assertEquals("test.D", d.getClassName());
    },
    function ()
    {
        var e = new test.E();
        assertEquals("test.E.getClassName(mx)", e.getClassName.getFullName());
    },
    function ()
    {
        var e = new test.E();
        assertEquals("test.E", e.getClassName());
    }
];

function runTests ()
{
    //var s = out.toString();alert(s);
    var failed = 0, passed = 0;
    var s = null;

    for (var i = 0; i < tests.length; ++i)
    {
        try
        {
            tests[i]();
            ++passed;
        }
        catch (e)
        {
            ++failed;
            var r = escapeHtml(e.message);
            if (!s)
                s = "<table border='1' width='20%'>"+
                      "<tr><th>#</th><th>Result</th></tr>";
    
            s += "<tr class='failed'><td>"+(i+1)+"</td><td nowrap>"+r+
                 "</td></tr>";
        }
    }

    function plural (s, n, p)
    {
        return (n == 1) ? s : (s + (p || "s"));
    }

    document.write("<p>"+(failed ? "" : "All ")+passed+
                    " "+plural("test", passed)+" passed.</p>");

    if (failed)
        document.write("<p>"+failed+" "+plural("test", failed)+" failed.</p>"+s);
}

function onLoad ()
{
    //document.getElementById("test").innerHTML = "x:<br>" + dump(x);
}
