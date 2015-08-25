/*=============================================================================
    etc/wshcore.js
    Copyright (C) 2008-2011, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]

    This file completes the platform for task scripts for WSH.

=============================================================================*/
$module("wshcore");

$requires("utils");

var fileSysObj = new ActiveXObject("Scripting.FileSystemObject");
var shell      = new ActiveXObject("WScript.Shell");

var kPathSep = ";";
var kSlash = "\\";

function deflateSize (s) {
    return s.length; // TODO
}

function echo (s) {
    WScript.Echo(s);
}

function raise (err) {
    echo(err);
    $throw(err);
}

function fileExists (name) {
    return fileSysObj.FileExists(name);
}

function getDirObject (name, optional) {
    var s = zjs.trimRight(name, kSlash);

    try {
        return fileSysObj.GetFolder(s);
    } catch (e) {
        if (optional)
            return null;
        raise("getDirObject("+name+"): " + e.message);
    }
}

function getFileObject (name, optional) {
    try {
        return fileSysObj.GetFile(name);
    } catch (e) {
        if (optional)
            return null;
        raise("getFileObject("+name+"): " + e.message);
    }
}

function getScriptArgsArray () {
    var args = [], argv = WScript.Arguments;

    for (var i = 0, n = argv.length; i < n; ++i)
        args.push(argv(i));

    return args;
}

function iterateFiles (name) {
    var dir = getDirObject(name, true);
    return dir ? new Enumerator(dir.Files) : new Enumerator();
}

function iterateSubDirs (name) {
    var dir = getDirObject(name, true);
    return dir ? new Enumerator(dir.SubFolders) : new Enumerator();
}

function lastMod (fname) {
    var f = (typeof(fname) === "string") ? getFileObject(fname) : fname;
    var d = new Date(f.DateLastModified);
    return d.getTime();
}

function listDir (dir, mode) {
    try {
        var ret = [];

        if (mode !== ListMode.FILES)
            for (var dirs = iterateSubDirs(dir); !dirs.atEnd(); dirs.moveNext()) {
                var d = dirs.item();
                ret.push({ name: d.Name, lastMod: lastMod(d) });
            }

        if (mode !== ListMode.DIRS)
            for (var files = iterateFiles(dir); !files.atEnd(); files.moveNext()) {
                var f = files.item();
                ret.push({ name: f.Name, lastMod: lastMod(f) });
            }

        return ret;
    } catch (e) {
        raise("listDir("+dir+"): " + e.message);
    }
}

function folderExists (name) {
    var s = zjs.trimRight(name, kSlash);
    return fileSysObj.FolderExists(s);
}

function getAbsPath (path) {
    try {
        return fileSysObj.GetAbsolutePathName(path);
    } catch (e) {
        raise("getAbsPath("+path+"): " + e.message);
    }
}

function getParentDir (dir, count) {
    try {
        var s = dir;
        for (var i = count || 1; i > 0; --i)
            s = fileSysObj.GetParentFolderName(s);
        return s;
    } catch (e) {
        raise("getParentDir("+dir+","+count+"): " + e.message);
    }
}

function walkTree (dir, fn, scope) {
    function recurse (d, rel) {
        for (var files = iterateFiles(d); !files.atEnd(); files.moveNext()) {
            var f = files.item();
            fn.call(scope, rel + f.Name, d + f.Name);
        }
        for (var dirs = iterateSubDirs(d); !dirs.atEnd(); dirs.moveNext()) {
            var di = dirs.item();
            recurse(d + di.Name + "\\", rel + di.Name + "\\");
        }
    }

    var s = getAbsPath(dir.replace(/\//g, "\\"));
    if (!s.endsWith("\\"))
        s += "\\";
    recurse(s, "");
}

function mkdirs (dir) {
    if (! folderExists(dir)) {
        var parent = getParentDir(dir);
        if (parent && parent.length > 0)
            mkdirs(parent);
        fileSysObj.CreateFolder(dir);
    }
}

var FileMode = $enum(["READ=1", "WRITE=2", "APPEND=8"]);

/**
@param name {string} The file name
@param mode {FileMode} The open mode.
@param create {bool} True to allow creation of the file.
@param format {int} The format or encoding (0=ASCII, -1=Unicode, -2=system default).
*/
function openFile (name, mode, create, format) {
    try {
        return fileSysObj.OpenTextFile(name, mode.ordinal, create, format);
    } catch (e) {
        raise("openFile("+name+","+mode.name+","+create+","+format+"): " + e.message);
    }
}

function readFile (name, asArray) {
    var lines = [];

    try {
        var file = openFile(name, FileMode.READ);
        while (!file.AtEndOfStream)
            lines.push(file.ReadLine());
    } catch (e) {
        raise("readFile("+name+"): " + e.message);
    } finally {
        if (file)
            file.Close();
    }

    return asArray ? lines : lines.join("\n");
}

function writeFile (name, content) {
    try {
        var file = openFile(name, FileMode.WRITE, true);
        if (zjs.isArray(content)) {
            $foreach(content, function (line) {
                file.WriteLine(line);
            });
        } else {
            file.WriteLine(content);
        }
    } catch (e) {
        raise("writeFile("+name+"): " + e.message);
    } finally {
        if (file)
            file.Close();
    }
}
