/*=============================================================================
    test/unittest.js
    Copyright (C) 2008-2009, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/

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

function assertEquals (a, b)
{
    if (a != b)
        fail("Not equal: <"+a+"> != <"+b+">");
}

function assertEqualsNoCase (a, b)
{
    if ((a || "").toLowerCase() != (b || "").toLowerCase())
        fail("Not equal: <"+a+"> != <"+b+">");
}

function assertTrue (b)
{
    if (!b)
        fail("Not true: <"+b+">");
}

function assertFalse (b)
{
    if (b)
        fail("Not false: <"+b+">");
}

function escapeHtml (s)
{
    return s.replace(/&/g,"&amp;").replace(/>/g,"&gt;").
             replace(/</g,"&lt;").replace(/"/g,"&quot;");
}

function fail (s)
{
    throw new Error("Test failed: " + s);
}

var gTests = [];

function testRun (tests)
{
    var data = { failed : [], passed : 0 };
    tests = tests || gTests;
    var s = null;

    for (var i = 0; i < tests.length; ++i)
    {
        var test = tests[i];
        try
        {
            test();
            ++data.passed;
        }
        catch (e)
        {
            data.failed.push({ message : e.message, code : test.toString() });
        }
    }

    function plural (s, n, p)
    {
        return (n == 1) ? s : (s + (p || "s"));
    }

    data.summary = (data.failed.length ? "" : "All ") + data.passed + " " +
                      plural("test", data.passed)+" passed.";

    if (data.failed.length)
        data.summary += "\n\n" + data.failed.length + " " +
                        plural("test", data.failed.length)+" failed.";

    return data;
}

function testDataToConsole (out, data)
{
    out.println(data.summary);

    var n = data.failed.length;
    for (var i = 0; i < n; ++i)
        out.println((i+1) + ". " + data.failed[i].message + "\n\nCode:\n\n" +
                    data.failed[i].code);

    return n ? 1 : 0;
}

function testDataToHtml (data)
{
    var html = "<p>" + data.summary.replace("\n", "<br>", "g") + "</p>";
    var n = data.failed.length;

    if (n)
    {
        html += "<table border='1' width='20%'>"+
                    "<tr><th>#</th><th>Result</th></tr>";

        for (var i = 0; i < n; ++i)
        {
            var s = escapeHtml(data.failed[i].message) + "<br><pre>" +
                    escapeHtml(data.failed[i].code) + "</pre>";

            html += "<tr class='failed'>"+
                      "<td>"+(i+1)+"</td><td nowrap>"+s+"</td>"+
                    "</tr>";
        }

        html += "</table>";
    }

    return html;
}

function runTests (self)
{
    if (!self)
    {
        var html = testDataToHtml(testRun());
        document.write(html);
    }
    else
    {
        importPackage(java.lang);
        if (testDataToConsole(System.out, testRun()))
            self.fail("Test failed");
    }
}
