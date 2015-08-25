/*=============================================================================
    etc/ant-jsbuild.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]

    This is the code behind our custom Ant tasks.

=============================================================================*/

/**
The logic behind the jsbuild Ant task.
*/
function jsbuildAntTask (project, packages, modules, exclude, out, level,
                         verbosity, comments, onbuild) {
    if (!out)
        self.fail("Attribute 'out' is required");
    if (!packages)
        self.fail("Attribute 'packages' is required");
    if (!modules)
        self.fail("Attribute 'modules' is required");

    _project = project;
    verbosity = (verbosity == "silent") ? 0 : ((verbosity == "quiet") ? 1 : 2);

    if (verbosity > 0)
        echo("JSBuild: " + out + " (" + modules + ")" +
               (exclude ? " (excluding " + exclude + ")" : ""));

    var builder = new zjsAnt.BuildJS(project, comments, verbosity, level);

    builder.addPackages(packages);

    if (exclude)
        builder.excludeModules(exclude+""); // Java string to JS string

    builder.scanModules(modules);

    if (builder.write(out))
        if (onbuild)
            onbuild.get(0).execute();

    _project = null;
}

$namespace(zjsAnt, {

BuildJS : $class("AntTask", {
    ctor : function (project, comments, verbosity, level) {
        $super(arguments).call(this, project);

        this.level = level;
        this.pkgs = {};
        this.mods = {};
        this.verbosity = verbosity;
        this.lastMod = -1;

        this.comment = this.getComments(comments);
        this.out = "";
    },

    addPackage : function (pkg) {
        var t = pkg.split('='), path = this.project.resolveFile(t[1]);

        this.pkgs[t[0]] = path;

        //echo("package: " + t[0] + " = " + path);
    },

    addPackages : function (packages) {
        var s = packages.split(";");

        for (var i = 0, n = s.length; i < n; ++i)
            this.addPackage(s[i]);
    },

    excludeModules : function (modules) {
        var that = this;

        this.walkModules(modules, function (path, mod, name) {
            that.mods[mod] = 1;
        });
    },

    getRequiredModules : function (scriptText) {
        var regex = /^\s*\$requires\(\"([^"]+)\"\)(?:\s|;)*(\/\/[^\r\n]*)?$/gm;
        var m, ret = [];

        while ((m = regex.exec(scriptText)) != null)
            ret.push(m[1]);

        return ret;
    },

    minify: function () {
        var out = this.out;
        if (this.level >= 0)
            out = jsmin("", this.out, this.level);
        return this.comment + "\n" + out;
    },

    scanModule : function (path, mod, s) {
        if (this.mods[mod] > 0)
            return;

        var ifn = this.project.resolveFile(path + "/" + s + ".js");
        //echo("file: " + ifn);
        //if (verbosity > 1)
        //    echo("Read <" + ifn + ">");

        if (this.verbosity > 1)
            echo("Read <" + ifn + ">");

        var js = readFile(ifn);
        this.mods[mod] = -1; // scanning

        var reqs = this.getRequiredModules(js);
        for (var j = 0, k = reqs.length; j < k; ++j) {
            var req = reqs[j];
            if (this.mods[req] < 0) // if (required module now scanning)
                self.fail("Circular module reference " + mod + " & " + req);

            this.scanModules(req);
        }

        var modified = lastMod(ifn);
        this.lastMod = Math.max(this.lastMod, modified);

        //echo("input: " + ifn + " modified: " + modified);
        this.out += js + "\n";
        this.mods[mod] = 1; // scanned
    },

    scanModules : function (modules) {
        var that = this;

        this.walkModules(modules, function () {
            that.scanModule.apply(that, arguments);
        });
    },

    walkDir : function (path, pkg, deep, fn) {
        //echo("All modules in " + (deep ? "or below " : "") + path);
        var dir = new File(path).listFiles();

        for (var i = 0, n = dir.length; i < n; ++i) {
            var f = dir[i]; // a Java File object
            if (f.isHidden()) {
                //echo("Hidden: " + f.toString());
                continue;
            }

            var isdir = f.isDirectory();
            var s = f.getName(); // a Java String object

            if (isdir) {
                //echo("dir: " + s);
                if (!deep || s.startsWith("."))
                    continue;

                s = s+""; // Java to JS string
                if (s == "CVS")
                    continue;

                //echo("Going deep: " + s);
                this.walkDir(this.project.resolveFile(path+"/"+s), pkg+"."+s, true, fn);
            } else if (s.endsWith(".js")) {
                s = s+""; // Java to JS string
                s = s.substring(0, s.length - 3);
                var mod = pkg + "." + s;

                //echo("file: " + s + " mod: " + mod);
                fn(path, mod, s);
            }
        }
    },

    walkModules : function (modules, fn) {
        var mods = modules.split(";");
        for (var j = 0, k = mods.length; j < k; ++j) {
            var mod = mods[j], parts = mod.split(".");
            var pkg = parts[0];
            var path = this.pkgs[pkg];
            if (!path)
                continue;

            for (var i = 1, n = parts.length; i < n; ++i) {
                var s = parts[i], last = (i == n - 1);

                if (s == "*" || s == "**") {
                    if (!last)
                        self.fail("Module '"+mod+"' can only have '"+s+"' at the end");

                    this.walkDir(path, pkg, s == "**", fn);
                } else if (!last) {
                    path = this.project.resolveFile(path + "/" + s);
                    pkg += "." + s;
                } else {
                    fn(path, mod, s);
                }
            }
        }
    },

    write : function (out) {
        var ofn = this.project.resolveFile(out);

        var f = new File(ofn).getParent();
        mkdirs(f);

        var modified = lastMod(ofn);
        //echo("output: " + ofn + " modified: " + modified);
        var outofdate = modified < this.lastMod;

        if (outofdate) {
            //echo("Updating " + ofn);
            var output = this.minify();

            if (this.verbosity > 0)
                this.reportOutFile("Write <"+ofn+"> ", this.out.length, output);

            writeFile(ofn, output);
        }

        return outofdate;
    }
}) // BuildJS

}); // zjsAnt
