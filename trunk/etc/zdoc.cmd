@echo off
goto main

:: etc/zdoc.cmd
:: Copyright (C) 2010-2011, Donald W. Griffin
:: All rights reserved.
:: [MIT license :: see license.txt for details]

:: //X = run in debugger
:: //D = enable debugging

:main
cscript //nologo //X zdoc.wsf %*
