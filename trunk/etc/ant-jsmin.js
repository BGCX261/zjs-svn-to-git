/*=============================================================================
    etc/ant-jsmin.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]

    This is the code behind our custom Ant tasks.

=============================================================================*/

/**
The logic behind the jsmin Ant task.
*/
function jsminAntTask (project, level, verbosity, files, comments, outdir, outfile) {
    if (!outdir && !outfile)
        self.fail("Either outdir or outfile are required");

    _project = project;

    try {
        var fileset = new zjsAnt.FileSet(project, null, files);
        var jsm = new zjsAnt.JSMin(project, level, verbosity, fileset, comments);

        if (outdir)
            jsm.packToDir(outdir);

        if (outfile)
            jsm.packToFile(outfile);
    } catch (e) {
        self.fail("ERROR: " + e.message);
    } finally {
        _project = null;
    }
}

$namespace(zjsAnt, {

JSMin : $class("AntTask", {
    ctor : function (project, level, verbosity, files, comments) {
        $super(arguments).call(this, project);

        this.files = files;
        this.level = level;
        this.verbosity = (verbosity == "silent") ? 0 : ((verbosity == "quiet") ? 1 : 2);
        this.comment = this.getComments(comments);
    },

    minify: function (js) {
        var out = js;
        if (this.level >= 0)
            out = jsmin("", js, this.level);
        return this.comment + "\n" + out;
    },

    packToDir : function (outdir) {
        var dir = mkdirs(outdir);

        var files = this.files.outOfDateFiles(dir);
        if (!files)
            return;

        var after = 0, before = 0;

        for (var i = 0, n = files.length; i < n; ++i) {
            var ifn = files[i].src;
            var ofn = files[i].dst;

            if (this.verbosity > 1)
                echo("Read <" + ifn + ">");

            var js = readFile(ifn);
            var out = this.minify(js);

            before += js.length;
            after += out.length;

            if (this.verbosity > 0)
                this.reportOutFile("Write <"+ofn+"> ", js.length, out);

            writeFile(ofn, out);
        }

        if (n > 0 && this.verbosity > 0)
            this.report("Total compression: files="+n+" ", before, after);
    },

    packToFile : function (outfile) {
        var ofn = "" + this.project.resolveFile(outfile);
        var dir = ofn.substring(0, ofn.lastIndexOf(kSlash));

        var files = this.files.outOfDateFile(ofn);
        if (!files)
            return;

        mkdirs(dir);

        var input = "";

        for (var i = 0, n = files.length; i < n; ++i) {
            var ifn = files[i];
            if (this.verbosity > 1)
                echo("Read <" + ifn + ">");

            var s = readFile(ifn);
            input += s + "\n";
        }

        var output = this.minify(input);

        if (this.verbosity > 0)
            this.reportOutFile("Write <"+ofn+"> ", input.length, output);

        writeFile(ofn, output);
    }
}) // JSMin

}); // zjsAnt
