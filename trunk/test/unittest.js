/*=============================================================================
    test/unittest.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/

function dump (obj) {
    var s = "";
    for (var n in obj) {
        var v = obj[n];
        if (typeof(v) == "object" && n != "parent")
            v = dump(v);
        s = s + "<li>" + n + ":" + v + "</li>";
    }
    if (s.length > 0)
        s = "<ul>" + s + "</ul>";
    return s;
}

function assertEquals (a, b) {
    if (a != b)
        fail("Not equal: <"+a+"> != <"+b+">");
}

function assertEqualsNoCase (a, b) {
    if ((a || "").toLowerCase() != (b || "").toLowerCase())
        fail("Not equal: <"+a+"> != <"+b+">");
}

function assertTrue (b) {
    if (!b)
        fail("Not true: <"+b+">");
}

function assertFalse (b) {
    if (b)
        fail("Not false: <"+b+">");
}

function fail (s) {
    throw new Error("Test failed: " + s);
}

$namespace("zjs.test", {
    timeout: 30,

    Test: $class({
        cannotRun: false,
        ready: false,

        ctor: function (runner, fn, num) {
            this.fn = fn;
            this.number = num;
            this.runner = runner;
        },

        defer: function () {
            if (this.runner.async) {
                this.ready = false;
            } else {
                this.cannotRun = true;
                fail("Async test not executed");
            }
        },

        finish: function (fn) {
            if (!this.ready) {
                this.ready = true;
                var f = fn || this.fn;

                try {
                    f(this);
                } catch (e) {
                    this.failure = e;
                }

                if (this.ready) {
                    this.runner.onTestReady(this);
                }
            }
        }
    }),

    TestRunner: $class(function () {
        function plural (s, n, p) {
            return (n == 1) ? s : (s + (p || "s"));
        }

        return {
            fn: null,
            scope: null,
            timerId: null,

            ctor: function (cfg) {
                zjs.copy(this, cfg);

                this.async = (this.fn !== null);

                var tests = this.tests;
                this.tests = [];

                $foreach(tests, this.add, this);
            },

            add: function (fn) {
                if (fn) {
                    var test = new zjs.test.Test(this, fn, this.tests.length+1);
                    this.tests.push(test);
                }
            },

            getResults: function () {
                var ret = {
                    failed: [],
                    passed: 0
                };

                $foreach(this.tests, function (test) {
                    if (test.failure) {
                        ret.failed.push({
                            message: test.failure.message,
                            number: test.number,
                            code: test.fn.toString()
                        });
                    } else {
                        ++ret.passed;
                    }
                });

                ret.summary = (ret.failed.length ? "" : "All ") + ret.passed + " " +
                                  plural("test", ret.passed)+" passed.";

                if (ret.failed.length) {
                    ret.summary += "\n\n" + ret.failed.length + " " +
                                    plural("test", ret.failed.length)+" failed.";
                }

                return ret;
            },

            onTestReady: function () {
                if (this.pending) {
                    --this.pending;
                    if (!this.pending && this.fn) {
                        this.fn.call(this.scope, this);
                    }
                    this.updateTimer();
                }
            },

            onTimeout: function () {
                $foreach(this.tests, function (test) {
                    test.finish(function () {
                        fail("Timeout expired");
                    });
                });
            },

            run: function () {
                this.pending = this.tests.length;
                $foreach(this.tests, function (test) {
                    test.finish();
                });

                this.updateTimer();
            },

            startTimer: function () {
                var t = zjs.test.timeout * 1000;
                this.timerId = window.setTimeout(this.onTimeout.bind(this), t);
            },

            stopTimer: function () {
                if (this.timerId) {
                    window.clearTimeout(this.timerId);
                    this.timerId = null;
                }
            },

            updateTimer: function () {
                if (this.async) {
                    this.stopTimer();
                    if (this.pending) {
                        this.startTimer();
                    }
                }
            }
        };
    })
})

function testDataToConsole (out, data) {
    out.println(data.summary);

    var n = data.failed.length;
    for (var i = 0; i < n; ++i)
        out.println((i+1) + ". " + data.failed[i].message + "\n\nCode:\n\n" +
                    data.failed[i].code);

    return n ? 1 : 0;
}

function testDataToHtml (data) {
    var html = "<p>" + data.summary.replace("\n", "<br>", "g") + "</p>";
    var n = data.failed.length;

    if (n) {
        var failures = ["<table border='1' width='20%'>",
                            "<tr><th>#</th><th>Result</th></tr>"];

        $foreach(data.failed, function (f) {
            failures.push(
                "<tr class='failed'>",
                    "<td style='padding:8px;'>",f.number,"</td>",
                    "<td nowrap>",
                        zjs.encodeHtml(f.message), "<br><pre>",
                        zjs.encodeHtml(f.code), "</pre>",
                    "</td>",
                "</tr>");
        });

        failures.push("</table>");

        html += failures.join("");
    }

    return html;
}

var gTests = [];

function runTests (self) {
    var runner;

    if (self) {
        importPackage(java.lang);
        importPackage(java.io);

        runner = new zjs.test.TestRunner({
            tests: gTests
        });

        runner.run();
        if (testDataToConsole(System.out, runner.getResults()))
            self.fail("Test failed");
    } else {
        document.write("<div id='testRunResults'>Running...</div>");

        runner = new zjs.test.TestRunner({
            tests: gTests,
            fn: function () {
                var html = testDataToHtml(runner.getResults());
                var el = document.getElementById("testRunResults");
                el.innerHTML = html;
            }
        });

        runner.run();
    }
}
