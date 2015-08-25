/*=============================================================================
    etc/wsh-zdoc.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/

function zdocWsh (args) {
    var cfg = {
        format: "gwiki",
        verbosity: "quiet"
    };
    var scanner = new zutil.PathScanner();
    var argRegex = /^[-](force|gwiki|quiet|silent|o)(?:[=](.+))?$/;

    var processors = {
        o: function (arg) {
            cfg.output = arg;
        },
        force: function () {
            cfg.force = true;
        },
        gwiki: function () {
            cfg.format = "gwiki";
        },
        quiet: function () {
            cfg.verbosity = "quiet";
        },
        silent: function () {
            cfg.verbosity = "silent";
        }
    };

    $foreach(args, function (arg) {
        if (scanner.scan(arg)) // -d, -i, -x
            return;
        var m = argRegex.exec(arg);
        if (!m)
            $panic("Invalid argument: " + arg);
        processors[m[1]](m[2]);
    });

    cfg.files = scanner.getFileSet();

    zdoc.run(cfg);
}
