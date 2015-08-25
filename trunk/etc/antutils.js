/*=============================================================================
    etc/antutils.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]

    This file completes the platform for task scripts for Ant.

    You need these JAR's to use this script in Ant:

        bsf.jar
        commons-logging.jar
        js.jar

=============================================================================*/
$module("antutils");

$requires("utils");

importPackage(java.util.zip);

var kPathSep = File.pathSeparator + "";
var kSlash = File.separator;

var _project;

function deflateSize (s) {
    var bytes = new ByteArrayOutputStream();
    var def = new DeflaterOutputStream(bytes);
    var js = new java.lang.String(s);
    var sb = js.getBytes();
    def.write(sb, 0, sb.length);
    def.finish();
    def.close();
    return bytes.size();
}

function echo (s) {
    System.out.println(s);
}

function lastMod (fname) {
    try {
        var f = new File(fname);
        var ret = f.exists() ? f.lastModified() : -1;
        return ret;
    } catch (e) {
        echo("Error accessing file ("+fname+"): " + e.message);
        throw e;
    }
}

function listDir (dir, mode) {
    try {
        var d = new File(dir);
        var files = d.listFiles();
        var ret = [];

        for (var i = 0, n = files.length; i < n; ++i) {
            var f = files[i];

            if (mode === ListMode.FILES && !f.isFile())
                continue;
            if (mode === ListMode.DIRS && !f.isDirectory())
                continue;

            ret.push({ name: f.getName()+"", lastMod: f.lastModified() });
        }
    } catch (e) {
        echo("Error listing dir ("+dir+"): " + e.message);
        throw e;
    }

    return ret;
}

function mkdirs (dir) {
    var fullpath = _project.resolveFile(dir);
    var mk = _project.createTask("mkdir");

    mk.dir = fullpath;

    mk.execute();

    return "" + fullpath;
}

function readFile (fname) {
    var line, reader = null, ret = "";

    try {
        reader = new BufferedReader(new FileReader(fname));

        while (true) {
            line = reader.readLine();
            if (!line)
                break;
            ret += line + "\n";
        }
    } catch (e) {
        echo("Error reading file ("+fname+"): " + e.message);
        throw e;
    } finally {
        if (reader)
            reader.close();
    }

    return ret;
}

function writeFile (fname, content) {
    var writer = null;

    try {
        writer = new FileWriter(fname);

        writer.write(content, 0, content.length);
    } catch (e) {
        echo("Error writing file ("+fname+"): " + e.message);
        throw e;
    } finally {
        if (writer)
            writer.close();
    }
}

//-----------------------------------------------------------------------------

$namespace("zjsAnt", {

FileSet : $class(zutil.BasicFileSet, {
    ctor : function (project, file, filesets) {
        $super(arguments).call(this);

        if (file)
            this.files.push(file); //???

        if (filesets)
            for (var i = 0, n = filesets.size(); i < n; ++i) {
                var fset = filesets.get(i);
                var dir = fset.getDir(project);

                this.add(dir, fset+"");
            }
    }
}), // FileSet

//-----------------------------------------------------------------------------

AntTask : $class({
    ctor : function (project) {
        this.project = project;
    },

    getComments : function (comments) {
        if (!comments)
            return "";

        var task = comments.get(0);  // only the first please...
        var prop = "jsminProp_" + System.identityHashCode(task); // unique ID

        task.setDynamicAttribute("property", prop);
        task.execute();

        var c = this.project.getProperty(prop);

        return c+"";
    },

    report : function (msg, before, after, deflated) {
        var delta = (before - after), percent = (delta / before) * 100 + "";
        var dot = percent.indexOf(".");

        if (dot > 0)
            percent = percent.substring(0, dot);
        var s = deflated ? (" deflated=" + deflated) : "";

        echo(msg+"(before="+before+" after="+after+s+" saved="+delta+" ~"+percent+"%)");
    },

    reportOutFile : function (msg, before, out) {
        var after = out.length;
        var deflated = deflateSize(out);
        this.report(msg, before, after, deflated);
    }
}) // AntTask

}); // zjsAnt
