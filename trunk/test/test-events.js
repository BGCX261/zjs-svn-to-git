/*=============================================================================
    test/test-events.js
    Copyright (C) 2008-2009, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/

$namespace("test.events", {

NoEvents: $class(
{
    //
}),

Test2 : $class("Test1",
{
    $events :
    [
        "foo"
    ]
}),

// Basic inheritance of events
Test1 : $class(
{
    $events :
    [
        "change",
        "beforechange"
    ]
}),

// Array of bubbled event type
Test3 : $class("Test2",
{
    $events :
    [
        "^bar"
    ]
}),

// Array of custom event types
Test4 : $class("Test3",
{
    $events :
    [
        $class(zjs.BubbledEvent,
        {
            type: "bubba"
        })
    ]
}),

// Object literal of custom event types
Test5 : $class("Test3",
{
    $events :
    {
        bubba: zjs.BubbledEvent
    }
}),

// Object literal of bubble/non-bubble event types
Test6 : $class("Test3",
{
    $events :
    {
        bubba: true,
        buffy: false
    }
})

}); // test.events

function checkEvents (obj, expect)
{
    var events = [];
    $foreach(obj.$events, function (ev)
    {
        var p = ev.prototype, t = p.type;
        assertTrue(p instanceof zjs.Event);

        if (p.enableBubble)
            t  = '^' + t;
        events.push(t);
    });

    events.sort();

    assertEquals(expect.length, events.length);

    for (var i = 0; i < expect.length; ++i)
        assertEquals(expect[i], events[i]);
}

gTests.push
(
    function ()
    {
        assertFalse("getEventModel" in test.events.NoEvents.prototype);
    },
    function ()
    {
        assertTrue("getEventModel" in test.events.Test1.prototype);
    },
    function ()
    {
        var expect = ["beforechange", "change"];
        checkEvents(test.events.Test1, expect);
        checkEvents(new test.events.Test1(), expect);
    },
    function ()
    {
        var expect = ["beforechange", "change", "foo"];
        checkEvents(test.events.Test2, expect);
        checkEvents(new test.events.Test2(), expect);
    },
    function ()
    {
        var expect = ["^bar", "beforechange", "change", "foo"];
        checkEvents(test.events.Test3, expect);
        checkEvents(new test.events.Test3(), expect);
    },
    function ()
    {
        var expect = ["^bar", "^bubba", "beforechange", "change", "foo"];
        checkEvents(test.events.Test4, expect);
        checkEvents(new test.events.Test4(), expect);
    },
    function ()
    {
        var expect = ["^bar", "^bubba", "beforechange", "change", "foo"];
        checkEvents(test.events.Test5, expect);
        checkEvents(new test.events.Test5(), expect);
    },
    function ()
    {
        var expect = ["^bar", "^bubba", "beforechange", "buffy", "change", "foo"];
        checkEvents(test.events.Test6, expect);
        checkEvents(new test.events.Test6(), expect);
    },
    function ()
    {
        var t = new test.events.Test3();
        assertTrue(!t.subscribers);

        var sub = t.on("change", function () { });
        assertTrue(sub.destroy);
        assertTrue(t.subscribers);
        assertTrue(t.subscribers.change);
    },
    function ()
    {
        var t = new test.events.Test3();
        assertTrue(!t.subscribers);
        var k;

        function onChange1 (ev)
        {
            k = ev;
        }

        var sub = t.on("change", onChange1);

        t.fireEvent({ type: "change", foo: 42 });
        assertEquals(k.foo, 42);
    },
    function ()
    {
        var t = new test.events.Test3();
        assertTrue(!t.subscribers);
        var k;

        function onChange1 (ev)
        {
            k = ev;
        }

        var sub = t.on("change", onChange1);

        t.fireEvent({ type: "change", foo: 42 });
        assertEquals(k.foo, 42);

        sub.destroy();

        t.fireEvent({ type: "change", foo: 427 });
        assertEquals(k.foo, 42);
    },
    function ()
    {
        var t = new test.events.Test3();
        assertTrue(!t.subscribers);

        var sub = t.on({ change: function () { } });
        assertTrue(sub.destroy);
        assertTrue(t.subscribers);
        assertTrue(t.subscribers.change);
    },
    function ()
    {
        var t = new test.events.Test3();
        assertTrue(!t.subscribers);
        var k;

        function onChange1 (ev)
        {
            k = ev;
        }

        var sub = t.on(
        {
            change: onChange1
        });

        t.fireEvent({ type: "change", foo: 42 });
        assertEquals(k.foo, 42);
    },
    function ()
    {
        var t = new test.events.Test3();
        assertTrue(!t.subscribers);
        var k;

        function onChange1 (ev)
        {
            k = ev;
        }

        var sub = t.on(
        {
            change: onChange1
        });

        t.fireEvent({ type: "change", foo: 42 });
        assertEquals(k.foo, 42);

        sub.destroy();

        t.fireEvent({ type: "change", foo: 427 });
        assertEquals(k.foo, 42);
    },
    function ()
    {
        var t = new test.events.Test3();
        assertTrue(!t.subscribers);
        var k;

        function onChange1 (ev)
        {
            k = ev;
        }

        var sub = t.on(
        {
            change: onChange1,
            $only: 1
        });

        t.fireEvent({ type: "change", foo: 42 });
        assertEquals(k.foo, 42);

        t.fireEvent({ type: "change", foo: 427 });
        assertEquals(k.foo, 42);
    },
    function ()
    {
        var t = new test.events.Test3();
        var k;

        function onChange1 (ev)
        {
            k = ev.target;
        }

        var sub = t.on(
        {
            change: onChange1
        });

        t.fireEvent("change");
        assertTrue(k === t);
    },
    function ()
    {
        var t = new test.events.Test3();
        var k;

        function onChange1 (ev)
        {
            k = ev.target;
        }

        var sub = t.on(
        {
            change: onChange1,
            $target: {}
        });

        t.fireEvent("change");
        assertTrue(k === undefined);
    },
    function ()
    {
        var t = new test.events.Test3();
        var k;

        function onChange1 (ev)
        {
            k = ev.target;
        }

        var sub = t.on(
        {
            change: onChange1,
            $target: t
        });

        t.fireEvent("change");
        assertTrue(k === t);
    },
    function ()
    {
        var t = new test.events.Test3();
        assertTrue(!t.subscribers);
        var k = 0;

        function onChange1 (ev)
        {
            k += ev.foo;
            $throw("Test error from event handler1");
        }

        function onChange2 (ev)
        {
            k += ev.foo;
            $throw("Test error from event handler2");
        }

        t.on("change", onChange1);
        t.on("change", onChange2);

        t.fireEvent({ type: "change", foo: 42 });
        assertEquals(k, 42*2);
    }
);
