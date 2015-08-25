/*=============================================================================
    etc/ant-jslint.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]

    This is the code behind our custom Ant tasks.

=============================================================================*/

/**
The logic behind the jsbuild Ant task.
*/
function jslintAntTask (project, files, report, con, opts, globals, ifcond) {
    if (ifcond) {
        var cond = eval("(" + ifcond + ")");
        if (!cond) {
            //echo("Skip " + ifcond);
            return;
        }
    }

    _project = project;

    var lint = new zjsAnt.Lint(project, con, report, opts, globals);

    for (files.rewind(); !files.atEnd(); ) {
        var f = files.next();
        lint.exec(f);
    }

    _project = null;
}

$namespace(zjsAnt, {

Lint : $class("AntTask", {
    ctor : function (project, con, report, opts, globals) {
        $super(arguments).call(this, project);

        this.conout = toBool(con);
        this.ofn = report && project.resolveFile(report);
        this.onlyErrors = !toBool(globals, false);

        if (opts) {
            //echo("opts:"+opts);
            opts = opts+"";
            var parts = opts.split(',');
            for (var i = 0, n = parts.length; i < n; ++i) {
                if (!this.options)
                    this.options = {};

                var kv = parts[i].split('='), k = kv[0], v = toBool(kv[1]);
                this.options[k] = v;
            }
        }
    },

    exec : function (src) {
        src = this.project.resolveFile(src)+"";
        var js = readFile(src);

        echo("JSLint: " + src + (this.opts ? (" (options: " + this.opts + ")") : ""));
        if (JSLINT(js, this.options))
            return;

        var rpt = JSLINT.report(this.onlyErrors);

        if (this.ofn)
            this.writeHtml(src.substring(src.lastIndexOf(kSlash)+1), rpt);

        if (this.conout)
            this.writeConsole(src, rpt);
    },

    writeConsole : function (src, rpt) {
        rpt = rpt.replace(/<p[^>]*>/ig, "\n").
                 replace(/<div[^>]*>/ig, "\n").
                 replace(/<br[^>]*>/ig, "\n").
                 replace(/&nbsp;/ig, " ").
                 replace(/(<([^>]+)>)/ig,"");

        var blanks = " ";
        while (blanks.length < 256)
            blanks = blanks + blanks;

        var regex = /Problem at line (\d+) character (\d+)\:(.*)/;
        var s = rpt.split("\n"), out = [];
        for (var i = 0; i < s.length; ++i) {
            var m = regex.exec(s[i]);
            if (!m) {
                out.push(s[i]);
                continue;
            }

            out.push(src+":"+m[1]+":"+m[3]);
            out.push(s[++i]);
            out.push(blanks.substring(0, parseInt(m[2])) + "^");
        }

        rpt = out.join("\n");
        echo(rpt);
    },

    writeHtml : function (title, rpt) {
        var html = "<html>" +
            "<head><title>JSLint " + title + "</title>" +
            "<style>" +
            " .problem {" +
            "    background-color: #E8E8E8;" +
            " }" +
            //" .problemAlt {" +
            //"    background-color: #D0D0D0;" +
            //" }" +
            "</style></head><body>" +
            "<h1>JSLint " + title + "</h1>" +
            "<h3>" + (new Date()) + "</h3>" +
            rpt +
            "</body></html>";

        writeFile(this.ofn, html);
    }
}) // Lint

}); // zjsAnt
