const FILE_A_PATH = "/tmp/NovaKaleidoscopeFileA.tmp";
const FILE_B_PATH = "/tmp/NovaKaleidoscopeFileB.tmp";
const KSDIFF_NOTIFICATION_ID = "ksdiff-notification";

exports.activate = function () {
  // Do work when the extension is activated
};

exports.deactivate = function () {
  // Clean up state before the extension is deactivated
  // This gets fired when the Nova loses focus
};

function fileArg(file) {
  var pathRegEx = /^path:(.*$)/;
  var filePath = pathRegEx.exec(file.read());
  return filePath ? filePath[1] : file.path;
}

function notify(title, body) {
  let request = new NotificationRequest(KSDIFF_NOTIFICATION_ID);

  nova.notifications.cancel(KSDIFF_NOTIFICATION_ID);

  request.title = nova.localize(title);
  request.body = nova.localize(body);

  let promise = nova.notifications.add(request);

  promise.then(
    (reply) => {
      console.log(reply);
    },
    (error) => {
      console.error(error);
    }
  );
}

nova.commands.register(
  "com.caleyjack.Kaleidoscope.compareFiles",
  (workspace) => {
    console.log("Comparing files with Kaleidoscope");

    var cmd = nova.config.get(
      "com.caleyjack.Kaleidoscope.toolcommand",
      "string"
    );
    if (cmd == null) cmd = "/usr/local/bin/ksdiff";
    if (cmd != null) {
      var fileAExists = nova.fs.access(FILE_A_PATH, nova.fs.F_OK);
      var fileBExists = nova.fs.access(FILE_B_PATH, nova.fs.F_OK);

      if (!fileAExists || !fileBExists) {
        nova.workspace.showInformativeMessage(
          `You must set File ${
            !fileAExists && !fileBExists ? "A & B" : fileBExists ? "A" : "B"
          } before you can compare`
        );
        return;
      }

      notify("Launching Kaleidoscope", "Prepare for liftoff!");

      var fileA = nova.fs.open(FILE_A_PATH);
      var fileB = nova.fs.open(FILE_B_PATH);

      var fileAArg = fileArg(fileA);
      var fileBArg = fileArg(fileB);

      var options = {
        args: ["--no-stdin", fileAArg, fileBArg],
      };

      var process = new Process(cmd, options);

      process.start();
    } else {
      nova.workspace.showInformativeMessage(
        "No command has been specified, please check the extension preferences"
      );
    }
  }
);

nova.commands.register("com.caleyjack.Kaleidoscope.setFileA", (workspace) => {
  var te = nova.workspace.activeTextEditor;
  var fileA = te.document.path;

  // If the file is unsaved, get the text so we can store it temporarily
  if (!fileA) var text = te.getTextInRange(new Range(0, te.document.length));

  console.log("Setting File A path to", fileA);
  var f = nova.fs.open(FILE_A_PATH, "w");
  f.write(fileA ? `path:${fileA}` : text);

  notify("File A Added", te.document.path);
});

nova.commands.register("com.caleyjack.Kaleidoscope.setFileB", (workspace) => {
  var te = nova.workspace.activeTextEditor;
  var fileB = te.document.path;

  // If the file is unsaved, get the text so we can store it temporarily
  if (!fileB) var text = te.getTextInRange(new Range(0, te.document.length));

  console.log("Setting File B to", fileB);
  var f = nova.fs.open(FILE_B_PATH, "w");
  f.write(fileB ? `path:${fileB}` : text);

  notify("File B Added", te.document.path);
});

nova.commands.register(
  "com.caleyjack.Kaleidoscope.clearAllFiles",
  (workspace) => {
    console.log("Removing tmp files");
    nova.fs.remove(FILE_A_PATH);
    nova.fs.remove(FILE_B_PATH);

    notify(
      "Files Cleared",
      "You will need to set Files A & B before comparing files again."
    );
  }
);

nova.config.onDidChange(
  "com.caleyjack.Kaleidoscope.toolcommand",
  function (newValue, oldValue) {
    cmd = newValue;
    console.log(`Changed cmd to ${cmd}`);
  },
  this
);
