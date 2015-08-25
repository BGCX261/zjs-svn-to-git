/*=============================================================================
    etc/jsmin.js
    Copyright (C) 2008, Donald W. Griffin
    All rights reserved.
    [MIT license :: see license.txt for details]

    This is the code behind the <jsmin> custom Ant task.

=============================================================================*/
importPackage(java.lang);
importPackage(java.io);
importPackage(java.util.zip);

var kPathSep = File.pathSeparator + "";
var kSlash = File.separator;

/**
The logic behind our Ant task.
*/
function antTaskGuts (project,
                      outdir, outfile, level, verbosity, filesets, comments)
{
    if (!outdir && !outfile)
        self.fail("Either outdir or outfile are required");

    var files, comment = "";

    if (comments)
    {
        var task = comments.get(0);  // only the first please...
        var prop = "jsminProp_" + System.identityHashCode(task); // unique ID

        task.setDynamicAttribute("property", prop);
        task.execute();

        comment = project.getProperty(prop) || "";
    }

    verbosity = (verbosity == "silent") ? 0 : ((verbosity == "quiet") ? 1 : 2);

    if (outdir)
    {
        outdir = mkdirs(project, outdir);
        files = outOfDateFiles(project, filesets, outdir);

        if (files)
            packFilesToDir(files, comment, level, verbosity);
    }

    if (outfile)
    {
        var ofn = ""+project.resolveFile(outfile);
        var dir = ofn.substring(0, ofn.lastIndexOf(kSlash));

        files = outOfDateFile(project, filesets, ofn);

        mkdirs(project, dir);
        if (files)
            packFilesToFile(files, comment, level, verbosity, ofn)
    }
}

//=============================================================================

function catPath (base, s)
{
    var n = base.length - 1;
    if (base[n] == kSlash)
        return base + s;
    return base + kSlash + s;
}

function deflateSize (s)
{
    var bytes = new ByteArrayOutputStream();
    var def = new DeflaterOutputStream(bytes);
    var js = new java.lang.String(s);
    var sb = js.getBytes();
    def.write(sb, 0, sb.length);
    def.finish();
    def.close();
    return bytes.size();
}

function echo (s)
{
    System.out.println(s);
}

function lastMod (fname)
{
    var f = new File(fname);
    var ret = f.exists() ? f.lastModified() : -1;
    return ret;
}

function mkdirs (project, dir)
{
    var fullpath = project.resolveFile(dir);
    var mk = project.createTask("mkdir");

    mk.dir = fullpath;

    mk.execute();

    return "" + fullpath;
}

/**
Determines if the specified output file is out of date with the given inputs.
If any of the input files are newer than the output file, the input files are
returned in an array. Otherwise, null is returned.

@param project The current Ant project.
@param filesets The fileset child List.
@param outfile The output file to which the inputs are associated.
*/
function outOfDateFile (project, filesets, outfile)
{
    var already = { };
    var ret = [];
    var ots = lastMod(outfile);
    var up2date = true;

    /**
    Given an input file name, add it to ret and maintain up2date.
    @param ifn The input file name.
    */
    function check (ifn)
    {
        if (already[ifn])
            return;
        already[ifn] = true;

        var its = lastMod(ifn);

        up2date &= (its <= ots);
        ret.push(ifn);
    }

    for (var i = 0, n = filesets.size(); i < n; ++i)
    {
        var indir = filesets.get(i).getDir(project);
        var inames = parseFileNames("" + filesets.get(i));

        for (var j = 0, k = inames.length; j < k; ++j)
            check(catPath(indir, inames[j]));
    }

    return up2date ? null : ret;
}

/**
Determines the out of date input files given their output location.
If any of the input files are newer than the output file, the input files are
returned in an array. Otherwise, null is returned.

@param project The current Ant project.
@param filesets The fileset child List.
@param outdir The output directory to which the inputs are copied.
*/
function outOfDateFiles (project, filesets, outdir)
{
    var already = { };
    var ret = [];

    /**
    Given an input file name, add it to ret and maintain up2date.
    @param ifn The input file name.
    @param src The source directory.
    */
    function check (name, src)
    {
        var ifn = catPath(src, name);
        if (already[ifn])
            return;
        already[ifn] = true;

        var ofn = catPath(outdir, name);
        var its = lastMod(ifn);
        var ots = lastMod(ofn);

        if (its > ots)
            ret.push({ dst : ofn, src : ifn });
    }

    for (var i = 0, n = filesets.size(); i < n; ++i)
    {
        var fset = filesets.get(i);
        var names = parseFileNames(fset + "");
        var src = fset.getDir(project);

        for (var j = 0, k = names.length; j < k; ++j)
            check(names[j], src);
    }

    return ret;
}

function report (msg, before, after, deflated)
{
    var delta = (before - after), percent = (delta / before) * 100 + "";
    var dot = percent.indexOf(".");

    if (dot > 0)
        percent = percent.substring(0, dot);
    var s = deflated ? (" deflated=" + deflated) : "";

    echo(msg+"(before="+before+" after="+after+s+" saved="+delta+" ~"+percent+"%)");
}

function reportOutFile (msg, before, out)
{
    var after = out.length;
    var deflated = deflateSize(out);
    report(msg, before, after, deflated);
}

function packFilesToDir (files, comment, level, verbosity)
{
    var after = 0, before = 0;

    for (var i = 0, n = files.length; i < n; ++i)
    {
        var ifn = files[i].src;
        var ofn = files[i].dst;

        if (verbosity > 1)
            echo("Read <" + ifn + ">");

        var js = readFile(ifn);
        var out = (level < 0) ? js : jsmin(comment, js, level);

        before += js.length;
        after += out.length;

        if (verbosity > 0)
            reportOutFile("Write <"+ofn+"> ", js.length, out);

        writeFile(ofn, out);
    }

    if (n > 0 && verbosity > 0)
        report("Total compression: files="+n+" ", before, after);
}

function packFilesToFile (files, comment, level, verbosity, ofn)
{
    var input = "";

    for (var i = 0, n = files.length; i < n; ++i)
    {
        var ifn = files[i];
        if (verbosity > 1)
            echo("Read <" + ifn + ">");

        var s = readFile(ifn);
        input += s + "\n";
    }

    var output = (level < 0) ? input : jsmin(comment, input, level);

    if (verbosity > 0)
        reportOutFile("Write <"+ofn+"> ", input.length, output);

    writeFile(ofn, output);
}

function parseFileNames (fnames)
{
    var ret;

    if (fnames.indexOf(kPathSep) >= 0)
        ret = fnames.split(kPathSep);
    else if (fnames.indexOf(";") >= 0)
        // Ant doesn't always use the native path sep (it favors ';')...
        ret = fnames.split(";");
    else
        ret = [fnames];

    return ret;
}

function readFile (fname)
{
    var line, reader = null, ret = "";

    try
    {
        reader = new BufferedReader(new FileReader(fname));

        while (true)
        {
            line = reader.readLine();
            if (!line)
                break;
            ret += line + "\n";
        }
    }
    finally
    {
        if (reader)
            reader.close();
    }

    return ret;
}

function writeFile (fname, content)
{
    var writer = null;

    try
    {
        writer = new FileWriter(fname);

        writer.write(content, 0, content.length);
    }
    finally
    {
        if (writer)
            writer.close();
    }
}

/*
The rest was taken from http://fmarcia.info/jsmin
===============================================================================
jsmin.js - 2006-08-31

Author: Franck Marcia
This work is an adaptation of jsminc.c published by Douglas Crockford.
Permission is hereby granted to use the Javascript version under the same
conditions as the jsmin.c on which it is based.

jsmin.c
2006-05-04

Copyright (c) 2002 Douglas Crockford  (www.crockford.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

The Software shall be used for Good, not Evil.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Update:
    add level:
        1: minimal, keep linefeeds if single
        2: normal, the standard algorithm
        3: agressive, remove any linefeed and doesn't take care of potential
           missing semicolons (can be regressive)
    store stats
        jsmin.oldSize
        jsmin.newSize
*/
String.prototype.has = function(c)
{
    return this.indexOf(c) > -1;
}

function jsmin (comment, input, level)
{
    if (input === undefined)
    {
        input = comment;
        comment = '';
        level = 2;
    }
    else if (level === undefined || level < 1 || level > 3)
        level = 2;

    if (comment.length > 0)
        comment+='\n';

    var a='',b='',EOF=-1;
    var LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    var DIGITS='0123456789',ALNUM=LETTERS+DIGITS+'_$\\',theLookahead=EOF;

    function isAlphanum(c)
    {
        return c != EOF && (ALNUM.has(c) || c.charCodeAt(0) > 126);
    }

    function get()
    {
        var c=theLookahead;
        if (get.i == get.l)
            return EOF;

        theLookahead=EOF;
        if (c == EOF)
        {
            c = input.charAt(get.i);
            ++get.i;
        }
        if (c>=' '||c=='\n')
            return c;

        if (c=='\r')
            return'\n';

        return' ';
    }

    get.i=0;
    get.l=input.length;

    function peek()
    {
        theLookahead=get();
        return theLookahead;
    }

    function next()
    {
        var c = get();
        if (c == '/')
        {
            switch(peek())
            {
                case'/':
                    for(;;)
                    {
                        c = get();
                        if (c <= '\n')
                            return c;
                    }
                    break;
                case'*':
                    get();
                    for(;;)
                    {
                        switch (get())
                        {
                            case'*':
                                if (peek()=='/')
                                {
                                    get();
                                    return' ';
                                }
                                break;
                            case EOF:
                                throw'Error: Unterminated comment.';
                        }
                    }
                    break;
                default:
                    return c;
            }
        }
        return c;
    }

    function action(d)
    {
        var r=[];
        if (d == 1)
            r.push(a);

        if (d < 3)
        {
            a = b;
            if (a == '\'' || a == '"')
            {
                for(;;)
                {
                    r.push(a);
                    a = get();
                    if (a == b)
                        break;

                    if (a <= '\n')
                        throw'Error: unterminated string literal: '+a;

                    if (a == '\\')
                    {
                        r.push(a);
                        a = get();
                    }
                }
            }
        }

        b = next();

        if (b == '/' && '(,=:[!&|'.has(a))
        {
            r.push(a);
            r.push(b);
            for(;;)
            {
                a = get();
                if (a == '/')
                    break;
                else if (a == '\\')
                {
                    r.push(a);
                    a=get();
                }
                else if (a <= '\n')
                    throw'Error: unterminated Regular Expression literal';

                r.push(a);
            }

            b = next();
        }

        return r.join('');
    }

    function m()
    {
        var r=[];
        a='\n';
        r.push(action(3));
        while (a != EOF)
        {
            switch(a)
            {
                case' ':
                    if (isAlphanum(b))
                        r.push(action(1));
                    else
                        r.push(action(2));
                    break;
                case'\n':
                    switch(b)
                    {
                        case'{':case'[':case'(':case'+':case'-':
                            r.push(action(1));
                            break;
                        case' ':
                            r.push(action(3));
                            break;
                        default:
                            if (isAlphanum(b))
                                r.push(action(1));
                            else
                            {
                                if (level == 1 && b != '\n')
                                    r.push(action(1));
                                else
                                    r.push(action(2));
                            }
                    }
                    break;
                default:
                    switch(b)
                    {
                        case ' ':
                            if (isAlphanum(a))
                            {
                                r.push(action(1));
                                break;
                            }
                            r.push(action(3));
                            break;
                        case'\n':
                            if (level == 1 && a != '\n')
                                r.push(action(1));
                            else
                            {
                                switch(a)
                                {
                                    case'}':case']':case')':case'+':
                                    case'-':case'"':case'\'':
                                        if(level==3)
                                            r.push(action(3));
                                        else
                                            r.push(action(1));
                                        break;
                                    default:
                                        if(isAlphanum(a))
                                            r.push(action(1));
                                        else
                                            r.push(action(3));
                                    }
                                }
                                break;
                            default:
                                r.push(action(1));
                                break;
                    }
            }
        }
        return r.join('');
    }

    jsmin.oldSize = input.length;
    ret = m(input);
    jsmin.newSize = ret.length;

    return comment+ret;
}
