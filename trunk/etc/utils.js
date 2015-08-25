/*=============================================================================
    etc/utils.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]
=============================================================================*/
$module("utils");

function $log (msg, type) {
    var t = type || "info";
    echo(t.toUpperCase() + ": " + msg);
}

function catPath (base, s) {
    var n = base.length - 1, c = base[n];
    if (c == kSlash || c == '/')
        return base + s;
    return base + kSlash + s;
}

function chain (obj) {
    function F () {}
    F.prototype = obj;
    return new F();
}

var ListMode = $enum(["FILES", "DIRS"]);

function toBool (s, def) {
    s = s + ""; // Java to JS string
    if (!s)
        return def;

    s = s.toLowerCase();

    if (s == "yes" || s == "on" || s == "1" || s == "true")
        return true;
    if (s == "no" || s == "off" || s == "0" || s == "false")
        return false;

    return def;
}

//-----------------------------------------------------------------------------

$namespace("zutil", {

sortByName : function (array) {
    return zjs.sortBy(array, "name");
},

BasicFileSet : $class(function () {
    function parseFileNames (fnames) {
        var ret;

        if (zjs.isArray(fnames))
            ret = fnames;
        else if (fnames.indexOf(kPathSep) >= 0)
            ret = fnames.split(kPathSep);
        else if (kPathSep != ";" && fnames.indexOf(";") >= 0)
            // Ant doesn't always use the native path sep (it favors ';')...
            ret = fnames.split(";");
        else
            ret = [fnames];

        return ret;
    }

    return {
        ctor : function () {
            this.files = [];
            this.index = 0;
        },

        add: function (dir, files) {
            var names = parseFileNames(files);
            $foreach(names, function (name) {
                var f = { fullPath: catPath(dir, name), relPath: name };
                this.files.push(f);
            }, this);
        },

        atEnd : function () {
            return this.index >= this.files.length;
        },

        each: function (fn, scope) {
            var f;
            while ((f = this.next) !== null)
                fn.call(scope, f);
        },

        next : function () {
            if (this.atEnd())
                return null;

            return this.files[this.index++];
        },

        /**
        Determines if the input files are out of date given a specific timestamp. If
        any of the input files are newer than the timestamp, the input files are all
        returned in an array. Otherwise, null is returned.

        @param time The time to compare the files against.
        */
        outOfDate : function (time) {
            var already = { };
            var ret = [];
            var up2date = true;

            for (this.rewind(); !this.atEnd(); ) {
                var ifn = this.next();
                if (already[ifn.fullPath])
                    continue;

                already[ifn.fullPath] = true;
                var its = lastMod(ifn.fullPath);

                up2date &= (its <= time);
                ret.push(ifn.fullPath);
            }

            return up2date ? null : ret;
        },

        outOfDateDir : function (outDir) {
            var files = listDir(outDir, ListMode.FILES);
            if (!files || !files.length)
                return true;

            var f = files[0];
            return this.outOfDate(f.lastMod);
        },

        /**
        Determines if the specified output file is out of date with the given inputs.
        If any of the input files are newer than the output file, the input files are
        returned in an array. Otherwise, null is returned.

        @param outfile The output file to which the inputs are associated.
        */
        outOfDateFile : function (outfile) {
            var ots = lastMod(outfile);
            return this.outOfDate(ots);
        },

        /**
        Determines the out of date input files given their output location. If any of
        the input files are newer than their output file, those input files are returned
        in an array. Otherwise, null is returned.

        @param outdir The output directory to which the inputs are copied.
        */
        outOfDateFiles : function (outdir) {
            var already = { };
            var ret = [];

            for (this.rewind(); !this.atEnd(); ) {
                var ifn = this.next();
                if (already[ifn.fullPath])
                    continue;

                already[ifn.fullPath] = true;

                var ofn = catPath(outdir, ifn.relPath);
                var its = lastMod(ifn.fullPath);
                var ots = lastMod(ofn);

                if (its > ots)
                    ret.push({ dst : ofn, src : ifn.fullPath });
            }

            return ret;
        },

        rewind : function () {
            this.index = 0;
        }
    };
}), // FileSet

Logger : $class({
    verbosity : "quiet",
    prefix: "",

    ctor : function (cfg) {
        zjs.copy(this, cfg);
        var v = this.verbosity;
        this.level = (v === "silent") ? 0 : ((v == "quiet") ? 1 : 2);
    },

    echo : function (msg) {
        echo(msg);
    },

    capture: function (level) {
        this.$log = $log;
        $log = this.log.bind(this, arguments.length ? level : 2);
    },
    
    release: function () {
        $log = this.$log;
        delete this.$log;
    },

    log : function (level, msg) {
        if (level <= this.level)
            this.echo(this.prefix + msg);
    },

    quiet : function (msg) {
        this.log(1, msg);
    },

    verbose : function (msg) {
        this.log(2, msg);
    }
}),

PathMatcher: $class(function () {
    var alphanum = /[a-z0-9]/i, anyChar = "[^\\/\\\\]", pathSep = "[\\/\\\\]";

    return {
        ignoreCase: false,
        pattern: "",
        recursive: false,
        regex: null,

        ctor: function (cfg) {
            if (typeof(cfg) === "string")
                this.addWildcards(cfg);
            else
                zjs.copy(this, cfg);
        },

        addWildcard: function (wild) {
            var regex = "";
            for (var i = 0, n = wild.length; i < n; ++i) {
                var c = wild.charAt(i);
                if (c == "*") {
                    if (i+1 < n && wild.charAt(i+1) == "*") {
                        ++i;
                        this.recursive = true;
                        regex += "(?:"+anyChar+"+"+pathSep+")*";
                        c = (i+1 < n) && wild.charAt(i+1);
                        if (c === "/" || c === "\\")
                            ++i;
                    } else {
                        regex += anyChar + "*";
                    }
                } else if (c == "?") {
                    regex += anyChar;
                } else if (alphanum.test(c)) {
                    regex += c;
                } else if (c == "/") {
                    regex += pathSep;
                    this.recursive = true;
                } else {
                    regex += "\\" + c;
                }
            }
            if (this.pattern)
                this.pattern += "|";
            this.pattern += "(?:^" + regex + "$)";
            this.regex = null;
            return this;
        },

        addWildcards: function (path, sep) {
            var parts = path.split(sep || kPathSep);
            $foreach(parts, this.addWildcard, this);
            return this;
        },

        each: function (dir, fn, scope) {
            var regex = new RegExp(this.pattern, this.ignoreCase ? "i" : "");

            function recurse (d, rel) {
                //echo("d="+d);
                var files = listDir(d, ListMode.FILES);

                $foreach(files, function (f) {
                    f.relPath = rel + f.name;
                    //echo("file: " + f.relPath);
                    if (regex.test(f.relPath)) {
                        f.base = dir;
                        f.dir = d;
                        f.fullPath = d + f.name;
                        f.relDir = rel;
                        fn.call(scope, f);
                    }
                }, this);

                if (this.recursive) {
                    var subdirs = listDir(d, ListMode.DIRS);
                    $foreach(subdirs, function (sub) {
                        var s = sub.name + "/";
                        recurse.call(this, d + s, rel + s);
                    }, this);
                }
            }

            if (!/[\/\\]$/.test(dir))
                dir += "/";

            recurse.call(this, dir, "");
        }
    };
}), // PathMatcher

PathScanner : $class(function () {
    var argRegex = /^\-([dix])\=(.+)$/;

    var processors = {
        d: function (arg) {
            this.dir = arg;
        },

        i: function (arg) {
            /*var regex = new RegExp(zutil.pathToRegex(arg));
            walkTree(this.dir, function (relName, fullName) {
                if (regex.test(relName)) {
                    echo("==> " + relName);
                    this.files[fullName] = {
                        dir: this.dir,
                        fullPath: fullName,
                        relName: relName.replace(/[\\\\]/g, "/")
                    };
                }
            }, this);*/
            var pm = new zutil.PathMatcher(arg);
            pm.each(this.dir, function (f) {
                echo("add: " + f.fullPath);
                this.files[f.fullPath] = f;
            }, this);
        },

        x: function (arg) {
            /*var regex = new RegExp(zutil.pathToRegex(arg));
            walkTree(this.dir, function (relName, fullName) {
                if (regex.test(relName)) {
                    delete this.files[fullName];
                }
            }, this);*/
            var pm = new zutil.PathMatcher(arg);
            pm.each(this.dir, function (f) {
                echo("remove: " + f.fullPath);
                delete this.files[f.fullPath];
            }, this);
        }
    };

    return {
        ctor: function () {
            this.files = {};
        },

        each: function (fn, scope) {
            $foreach(this.files, function (file) {
                fn.call(scope, file);
            })
        },

        getFileSet: function () {
            var files = {};
            this.each(function (file) {
                var f = files[file.base];
                if (!f)
                    files[file.base] = f = [];

                f.push(file.relPath);
            });

            var ret = new zutil.BasicFileSet();
            $foreach(files, function (files, etc) {
                ret.add(etc.key, files);
            });
            return ret;
        },

        scan: function (arg) {
            var m = argRegex.exec(arg);
            if (!m)
                return false;

            var c = m[1], s = m[2];
            processors[c].call(this, s);
            return true;
        }
    };
}), // PathScanner

plural : function (s) {
    if (s.endsWith("s"))
        return s + "es";
    return s + 's';
},

XmlDoc : $class({
    scope : null,

    ctor : function () {
        this.text = [];
        this.indent = "";
    },

    add : function (tag, body) {
        if (!tag.isTag)
            tag = this.tag(tag);

        var n = arguments.length;
        if (n < 2) {
            this.push(tag.openClose());
        } else {
            this.push(tag.open());
            var old = this.indent;
            this.indent += "   ";

            for (var i = 1; i < n; ++i) {
                body = arguments[i];

                var tb = typeof(body);
                if (tb === "function")
                    body.call(this.scope);
                else
                    this.push(body);
            }

            this.indent = old;
            this.push(tag.close());
        }
    },

    getText : function () {
        return this.text.join('\n');
    },

    push : function (s) {
        s = this.indent + s;
        this.text.push(s);
    },

    tag : function (tag, attrs) {
        return new zutil.XmlDoc.Tag(tag, attrs);
    },

    Tag : $class({
        attrs : "",
        isTag : true,

        ctor : function (tag, attrs) {
            this.tag = tag;

            var buf = [''];
            $foreach(attrs, function (a, etc) {
                var s = zjs.encodeAttr(a);
                buf.push(etc.key + "=\"" + s + '"');
            });

            if (buf.length > 1)
                this.attrs = buf.join(' ');
        },

        open : function () {
            return '<' + this.tag + this.attrs + '>';
        },

        openClose : function () {
            return '<' + this.tag + this.attrs + "/>";
        },

        close : function () {
            return "</" + this.tag + '>';
        }
    })
})

}); // zutil
