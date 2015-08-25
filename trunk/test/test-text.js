/*=============================================================================
    test/test-text.js
    Copyright (C) 2008, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/

gTests.push(

    // encodeAttr/Html

    function () {
        var s = zjs.encodeAttr("&Hello <<\"World\">> &");
        assertEquals("&amp;Hello &lt;&lt;&quot;World&quot;&gt;&gt; &amp;", s);
    },

    function () {
        var s = zjs.encodeAttr("Hello &<\"'World'\"&>");
        assertEquals("Hello &amp;&lt;&quot;'World'&quot;&amp;&gt;", s);
    },

    function () {
        var s = zjs.encodeAttr("Hello &<\"'World'\"&>", "'");
        assertEquals("Hello &amp;&lt;\"&apos;World&apos;\"&amp;&gt;", s);
    },

    function () {
        var s = zjs.encodeHtml("Hello &<\"'World'\"&>");
        assertEquals("Hello &amp;&lt;\"'World'\"&amp;&gt;", s);
    },

    function () {
        var s = zjs.encodeHtml(42);
        assertEquals("42", s);
    },

    function () {
        var s = zjs.encodeHtml();
        assertEquals("", s);
    },

    function () {
        var s = zjs.encodeHtml(null);
        assertEquals("", s);
    },

    // gsubst

    function () {
        var s = zjs.gsubst("Hello 1", "1", "world!");
        assertEquals("Hello world!", s);
    },
    function () {
        var s = zjs.gsubst("He##o wor#d!", "#", "l");
        assertEquals("Hello world!", s);
    },
    function () {
        var s = zjs.gsubst("click dblclick mousedown mouseup mouseover "+
                           "mousemove mouseout", /\w+/,
                           function (m) { return "on"+m[0].capitalize(); });

        assertEquals("onClick onDblclick onMousedown onMouseup onMouseover "+
                     "onMousemove onMouseout", s);
    },
    function () {
        var s = '![a pear](/img/pear.jpg) ![an orange](/img/orange.jpg)';
        s = zjs.gsubst(s, /!\[(.*?)\]\((.*?)\)/, "<img alt='#{1}' src='#{2}'/>");
        assertEquals("<img alt='a pear' src='/img/pear.jpg'/> "+
                     "<img alt='an orange' src='/img/orange.jpg'/>", s);
    },

    // contains

    function () {
        assertFalse(zjs.contains("abc", "x"));
    },
    function () {
        assertTrue(zjs.contains("abc", "a"));
    },
    function () {
        assertTrue(zjs.contains("abc", "b"));
    },
    function () {
        assertTrue(zjs.contains("abc", "c"));
    },

    // isEmpty

    function () {
        assertFalse(zjs.isEmpty("42"));
    },
    function () {
        assertTrue(zjs.isEmpty(""));
    },
    function () {
        assertTrue(zjs.isEmpty());
    },
    function () {
        assertTrue(zjs.isEmpty(null));
    },
    function () {
        assertTrue(zjs.isEmpty(undefined));
    },

    // makeQueryString

    function () {
        var qs = zjs.makeQueryString({ x : 42, y : "Hello World" });

        assertEquals("x=42&y=Hello%20World", qs);
    },
    function () {
        var qs = zjs.makeQueryString({ x : undefined, y : "Hello World" });

        assertEquals("x&y=Hello%20World", qs);
    },
    function () {
        var qs = zjs.makeQueryString({ x : [42, "xyzzy"], y : "Hello World" });

        assertEquals("x=42&x=xyzzy&y=Hello%20World", qs);
    },
    function () {
        var s = zjs.makeQueryString({ a : "A\\B", b : 42});
        assertEqualsNoCase("a=A%5CB&b=42", s);

        var s2 = zjs.makeQueryString({x : s, y : "Hello World"});
        assertEqualsNoCase("x=a%3DA%255CB%26b%3D42&y=Hello%20World", s2);
    },
    function () {
        var d = new Date(Date.UTC(2009,4,20, 20,11,30));
        var s = zjs.makeQueryString({ a : "A\\B", d : d});
        assertEqualsNoCase("a=A%5CB&d=2009-05-20T20%3A11%3A30Z", s);
    },
    function () {
        var s = zjs.makeQueryString({ a : "A\\B", b : true});
        assertEqualsNoCase("a=A%5CB&b=true", s);
    },

    // parseQueryString

    function () {
        var qs = zjs.parseQueryString("foo?x=42&y=9");
        assertEquals(42, qs.x);
        assertEquals(9, qs.y);
    },
    function () {
        var qs = zjs.parseQueryString("foo?x=4");
        assertEquals(4, qs.x);
    },
    function () {
        var qs = zjs.parseQueryString("x=42&y=9");
        assertEquals(42, qs.x);
        assertEquals(9, qs.y);
    },
    function () {
        var qs = zjs.parseQueryString("x=42&y=Hello%20World");
        assertEquals(42, qs.x);
        assertEquals("Hello World", qs.y);
    },
    function () {
        var qs = zjs.parseQueryString("x=42&y=Hello%20World&x=A%5CX");
        assertEquals(2, qs.x.length);
        assertEquals(42, qs.x[0]);
        assertEquals("A\\X", qs.x[1]);
        assertEquals("Hello World", qs.y);
    },
    function () {
        var qs = zjs.parseQueryString("x=a%3dA%255cB%26b%3d42&y=Hello%20World");
        assertEqualsNoCase("a=A%5cB&b=42", qs.x);
        assertEquals("Hello World", qs.y);

        var qs2 = zjs.parseQueryString(qs.x);
        assertEquals("A\\B", qs2.a);
        assertEquals("42", qs2.b);
    },

    // safeStr

    function () {
        var s = zjs.safeStr(42);
        assertTrue("42" === s);
    },
    function () {
        var s = zjs.safeStr();
        assertTrue("" === s);
    },
    function () {
        var s = zjs.safeStr(null);
        assertTrue("" === s);
    },
    function () {
        var s = zjs.safeStr(0);
        assertTrue("0" === s);
    },

    // trim

    function () {
        var s = zjs.trim("  hello ");
        assertEquals("hello", s);
    },
    function () {
        var s = zjs.trim("  hello");
        assertEquals("hello", s);
    },
    function () {
        var s = zjs.trim("hello ");
        assertEquals("hello", s);
    },
    function () {
        var s = zjs.trim(" hello  ");
        assertEquals("hello", s);
    },
    function () {
        var s = zjs.trim(" hello world ");
        assertEquals("hello world", s);
    },
    function () {
        var s = zjs.trim(" foo --", '-');
        assertEquals(" foo ", s);
    },
    function () {
        var s = zjs.trim("-- foo --", '-');
        assertEquals(" foo ", s);
    },
    function () {
        var s = zjs.trim(" -- foo --", '-');
        assertEquals(" -- foo ", s);
    },

    // trimLeft

    function () {
        var s = zjs.trimLeft("  hello ");
        assertEquals("hello ", s);
    },
    function () {
        var s = zjs.trimLeft("  hello");
        assertEquals("hello", s);
    },
    function () {
        var s = zjs.trimLeft("hello ");
        assertEquals("hello ", s);
    },
    function () {
        var s = zjs.trimLeft(" hello  ");
        assertEquals("hello  ", s);
    },
    function () {
        var s = zjs.trimLeft(" hello world ");
        assertEquals("hello world ", s);
    },
    function () {
        var s = zjs.trimLeft(" foo --", '-');
        assertEquals(" foo --", s);
    },
    function () {
        var s = zjs.trimLeft("-- foo --", '-');
        assertEquals(" foo --", s);
    },
    function () {
        var s = zjs.trimLeft(" -- foo --", '-');
        assertEquals(" -- foo --", s);
    },

    // trimRight

    function () {
        var s = zjs.trimRight("  hello ");
        assertEquals("  hello", s);
    },
    function () {
        var s = zjs.trimRight("  hello");
        assertEquals("  hello", s);
    },
    function () {
        var s = zjs.trimRight("hello ");
        assertEquals("hello", s);
    },
    function () {
        var s = zjs.trimRight(" hello  ");
        assertEquals(" hello", s);
    },
    function () {
        var s = zjs.trimRight(" hello world ");
        assertEquals(" hello world", s);
    },
    function () {
        var s = zjs.trimRight(" foo --", '-');
        assertEquals(" foo ", s);
    },
    function () {
        var s = zjs.trimRight("-- foo --", '-');
        assertEquals("-- foo ", s);
    },
    function () {
        var s = zjs.trimRight(" -- foo --", '-');
        assertEquals(" -- foo ", s);
    },

    // Template
    
    function () {
        var t = new zjs.Template('#{title} was created by #{author}.');
        var d = { title: 'The Simpsons', author: 'Matt Groening', network: 'FOX' };

        var s = t.format(d);

        assertEquals("The Simpsons was created by Matt Groening.", s);
    },
    function () {
        var t = new zjs.Template('in #{lang} we also use the \\#{variable}');
        var data = {lang:'Ruby', variable: '(not used)'};

        var s = t.format(data);
        assertEquals("in Ruby we also use the #{variable}", s);
    },
    function () {
        var syntax = /(^|.|\r|\n)(\<%=\s*(\w+)\s*%\>)/; // matches '<%= field %>'
        var t = new zjs.Template('<div>Name: <b><%= name %></b>, '+
                                 'Age: <b><%=age%></b></div>', syntax);

        var s = t.format( {name: 'John Smith', age: 26} );
        assertEquals("<div>Name: <b>John Smith</b>, Age: <b>26</b></div>", s);
    },

    //----------------------------------------------------
    // String.prototype methods

    // capitalize

    function () {
        var s = "foo".capitalize();
        assertEquals("Foo", s);
    },
    function () {
        var s = "Foo".capitalize();
        assertEquals("Foo", s);
    },

    // camelize

    function () {
        var s = "foo-bar".camelize();
        assertEquals("fooBar", s);
    },

    // endsWith

    function () {
        var b = "foo-bar".endsWith("bar");
        assertEquals(true, b);
    },
    function () {
        var b = "foo-bar".endsWith("Bar");
        assertEquals(false, b);
    },
    function () {
        var b = "foo-bar".endsWith("abcfoo-bar");
        assertEquals(false, b);
    },

    // equalsNoCase

    function () {
        var b = "foo-bar".equalsNoCase("fOo-BAr");
        assertEquals(true, b);
    },
    function () {
        var b = "FoO-baR".equalsNoCase("fOo-BAr");
        assertEquals(true, b);
    },
    function () {
        var b = "foo-bar".equalsNoCase("foo-bar");
        assertEquals(true, b);
    },
    function () {
        var b = "foo-bar".equalsNoCase("foo-bars");
        assertEquals(false, b);
    },

    // left

    function () {
        var s = "foo-bar".left(0);
        assertEquals("", s);
    },
    function () {
        var s = "foo-bar".left(1);
        assertEquals("f", s);
    },
    function () {
        var s = "foo-bar".left(5);
        assertEquals("foo-b", s);
    },
    function () {
        var s = "foo-bar".left(7);
        assertEquals("foo-bar", s);
    },
    function () {
        var s = "foo-bar".left(8);
        assertEquals("foo-bar", s);
    },
    function () {
        var s = "foo-bar".left(10);
        assertEquals("foo-bar", s);
    },
    function () {
        var s = "foo-bar".left(-1);
        assertEquals("foo-ba", s);
    },
    function () {
        var s = "foo-bar".left(-4);
        assertEquals("foo", s);
    },
    function () {
        var s = "foo-bar".left(-6);
        assertEquals("f", s);
    },
    function () {
        var s = "foo-bar".left(-7);
        assertEquals("", s);
    },
    function () {
        var s = "foo-bar".left(-10);
        assertEquals("", s);
    },

    // right

    function () {
        var s = "foo-bar".right(-1);
        assertEquals("", s);
    },
    function () {
        var s = "foo-bar".right(0);
        assertEquals("", s);
    },
    function () {
        var s = "foo-bar".right(1);
        assertEquals("r", s);
    },
    function () {
        var s = "foo-bar".right(5);
        assertEquals("o-bar", s);
    },
    function () {
        var s = "foo-bar".right(7);
        assertEquals("foo-bar", s);
    },
    function () {
        var s = "foo-bar".right(8);
        assertEquals("foo-bar", s);
    },
    function () {
        var s = "foo-bar".right(10);
        assertEquals("foo-bar", s);
    },

    // startsWith

    function () {
        var b = "foo-bar".startsWith("foo-");
        assertEquals(true, b);
    },
    function () {
        var b = "foo-bar".startsWith("foo-bars");
        assertEquals(false, b);
    },
    function () {
        var b = "foo-bar".startsWith("foo_");
        assertEquals(false, b);
    },

    // END
    function() {}
);
