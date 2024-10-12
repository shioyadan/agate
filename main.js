"use strict";

let electron = require("electron");  // Module to control application life.

// This is written in "destructuring assignment" style.
// It is equivalent to something like "app = electron.app"
let {app, BrowserWindow} = electron;    

// Remote モジュールを有効化
require("@electron/remote/main").initialize();

// appendSwitch は複数回呼ぶと，前回に与えたスイッチを上書きしてしまうので注意
// --max-old-space-size=8192: 使用できるメモリの最大使用量を 8GB に
// --expose-gc: Make it possible to call GC manually
app.commandLine.appendSwitch("js-flags", "--expose-gc --max-old-space-size=8192");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;

// Quit when all windows are closed.
app.on("window-all-closed", function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform != "darwin") {
        app.quit();
    }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on("ready", function() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1024, 
        height: 768,

        // The window is initially hidden and 
        // is activate in an initial handler in <app> in app.tag.html
        //show: false,
        
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    require("@electron/remote/main").enable(mainWindow.webContents);

    // and load the index.html of the app.
    mainWindow.loadURL("file://" + __dirname + "/index.html");

    // Emitted when the window is closed.
    mainWindow.on("closed", function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });

    // Open the DevTools.
    //mainWindow.webContents.openDevTools();

});