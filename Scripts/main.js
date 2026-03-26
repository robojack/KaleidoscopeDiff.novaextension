const FILE_A_PATH = "/tmp/NovaKaleidoscopeFileA.tmp";
const FILE_B_PATH = "/tmp/NovaKaleidoscopeFileB.tmp";
const KSDIFF_NOTIFICATION_ID = "ksdiff-notification";

exports.deactivate = function () {
  nova.fs.remove(FILE_A_PATH);
  nova.fs.remove(FILE_B_PATH);
};

function fileArg(file) {
  const match = /^path:(.*$)/.exec(file.read());
  return match ? match[1] : file.path;
}

function notify(title, body) {
  const request = new NotificationRequest(KSDIFF_NOTIFICATION_ID);

  nova.notifications.cancel(KSDIFF_NOTIFICATION_ID);

  request.title = nova.localize(title);
  request.body = nova.localize(body);

  nova.notifications.add(request).catch((error) => console.error(error));
}

nova.commands.register(
  "com.caleyjack.Kaleidoscope.compareFiles",
  (workspace) => {
    console.log("Comparing files with Kaleidoscope");

    const fileAExists = nova.fs.access(FILE_A_PATH, nova.fs.F_OK);
    const fileBExists = nova.fs.access(FILE_B_PATH, nova.fs.F_OK);

    if (!fileAExists || !fileBExists) {
      nova.workspace.showInformativeMessage(
        `You must set File ${
          !fileAExists && !fileBExists ? "A & B" : fileBExists ? "A" : "B"
        } before you can compare`
      );
      return;
    }

    notify(
      "Compare Files",
      "Opening a diff of your selected files in Kaleidoscope"
    );

    const fileA = nova.fs.open(FILE_A_PATH);
    const fileB = nova.fs.open(FILE_B_PATH);

    const cmd =
      nova.config.get("com.caleyjack.Kaleidoscope.toolcommand", "string") ??
      "/usr/local/bin/ksdiff";

    // TODO: Add check for when the files are the same as this command will fail

    const process = new Process(cmd, {
      args: ["--no-stdin", fileArg(fileA), fileArg(fileB)],
    });

    process.start();
  }
);

function setFile(slot) {
  const tmpPath = slot === "A" ? FILE_A_PATH : FILE_B_PATH;
  const te = nova.workspace.activeTextEditor;
  const filePath = te.document.path;
  const text = filePath
    ? null
    : te.getTextInRange(new Range(0, te.document.length));

  console.log(`Setting File ${slot} path to`, filePath);
  const f = nova.fs.open(tmpPath, "w");
  f.write(filePath ? `path:${filePath}` : text);

  notify(`File ${slot} Added`, filePath ?? "Unsaved file");
}

nova.commands.register("com.caleyjack.Kaleidoscope.setFileA", () =>
  setFile("A")
);

nova.commands.register("com.caleyjack.Kaleidoscope.setFileB", () =>
  setFile("B")
);

nova.commands.register(
  "com.caleyjack.Kaleidoscope.workingTreeDiff",
  (workspace) => {
    notify(
      "Compare Working Tree",
      "Opening active project's changeset in Kaleidoscope"
    );

    // Pre-check for changes before launching difftool.
    // `git diff HEAD --quiet` exits 1 if changes exist, 0 if the tree is clean.
    const check = new Process("/usr/bin/env", {
      args: ["git", "diff", "HEAD", "--quiet"],
      cwd: nova.workspace.path,
    });

    check.onDidExit((status) => {
      if (status === 0) {
        nova.workspace.showInformativeMessage(
          "No changes in working tree to compare."
        );
        return;
      }

      notify(
        "Compare Working Tree",
        "Opening current project's changeset in Kaleidoscope"
      );

      const process = new Process("/usr/bin/env", {
        args: ["git", "difftool", "HEAD"],
        cwd: nova.workspace.path,
      });

      process.onStderr((line) => console.error("git difftool:", line.trim()));

      process.onDidExit((exitStatus) => {
        if (exitStatus !== 0) {
          nova.workspace.showInformativeMessage(
            "There was a problem opening this project in Kaleidosope. Please check the Extension Console for specific errors."
          );
        }
      });

      process.start();
    });

    check.start();
  }
);

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

nova.commands.register(
  "com.caleyjack.Kaleidoscope.fileHistory",
  (workspace) => {
    console.log("Open file with Kaleidoscope");

    const te = nova.workspace.activeTextEditor;
    const file = te.document.path;

    if (!file) {
      nova.workspace.showInformativeMessage(
        "This file has no version history. Save and commit this file before opening with Kaleidoscope."
      );
      return;
    }

    notify("File History", `Opening ${file.split("/").pop()} in Kaleidoscope`);

    const cmd =
      nova.config.get("com.caleyjack.Kaleidoscope.toolcommand", "string") ??
      "/usr/local/bin/ksdiff";

    const process = new Process(cmd, {
      args: ["--no-stdin", file],
    });

    process.start();
  }
);
